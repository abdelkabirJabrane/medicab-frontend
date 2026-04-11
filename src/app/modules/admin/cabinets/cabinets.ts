import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CabinetService, Cabinet } from '../../../core/services/cabinet';
import { PlanService } from '../../../core/services/plan';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-admin-cabinets',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, TableModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './cabinets.html',
    styleUrls: ['./cabinets.scss']
})
export class AdminCabinetsComponent implements OnInit {
    cabinets: any[] = [];
    cabinetsFiltres: any[] = [];
    searchQuery = '';
    filtreActif = 'TOUS';
    dialogVisible = false;
    detailDialogVisible = false;
    loading = false;
    selectedCabinet: any = null;

    tabs = [
        { label: 'Tous', value: 'TOUS', count: 0 },
        { label: 'Actifs', value: 'actif', count: 0 },
        { label: 'Suspendus', value: 'suspendu', count: 0 },
        { label: 'Essai', value: 'essai', count: 0 }
    ];

    form: any = { nom: '', responsable: '', email: '', telephone: '', ville: '', plan: '' };

    planOptions: any[] = [];

    constructor(
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private cabinetService: CabinetService,
        private planService: PlanService
    ) {}

    ngOnInit() {
        this.loadInitialData();
    }

    loadInitialData() {
        this.loading = true;
        forkJoin({
            cabinets: this.cabinetService.getAll(),
            plans: this.planService.getAll()
        }).pipe(
            finalize(() => {
                this.loading = false;
                this.updateCounts();
                this.filtrer();
            })
        ).subscribe({
            next: (res) => {
                this.cabinets = res.cabinets.map(c => this.mapCabinet(c));
                this.planOptions = res.plans.map(p => ({ label: p.label, value: p.planId }));
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données' });
            }
        });
    }

    private mapCabinet(c: Cabinet): any {
        return {
            ...c,
            initiales: c.nom ? c.nom.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'CA',
            statutLabel: c.statut === 'actif' ? 'Actif' : c.statut === 'suspendu' ? 'Suspendu' : 'Essai',
            dateExpiration: c.dateExpiration || '—'
        };
    }

    updateCounts() {
        this.tabs[0].count = this.cabinets.length;
        this.tabs[1].count = this.cabinets.filter((c) => c.statut === 'actif').length;
        this.tabs[2].count = this.cabinets.filter((c) => c.statut === 'suspendu').length;
        this.tabs[3].count = this.cabinets.filter((c) => c.statut === 'essai').length;
    }

    setFiltre(value: string) {
        this.filtreActif = value;
        this.filtrer();
    }

    filtrer() {
        let result = [...this.cabinets];
        if (this.filtreActif !== 'TOUS') result = result.filter((c) => c.statut === this.filtreActif);
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter((c) => c.nom.toLowerCase().includes(q) || c.ville.toLowerCase().includes(q) || c.responsable.toLowerCase().includes(q));
        }
        this.cabinetsFiltres = result;
    }

    ouvrirNouveauCabinet() {
        this.form = { nom: '', responsable: '', email: '', telephone: '', ville: '', plan: '' };
        this.dialogVisible = true;
    }

    sauvegarder() {
        if (!this.form.nom || !this.form.email) {
            this.messageService.add({ severity: 'warn', summary: 'Requis', detail: 'Nom et email obligatoires' });
            return;
        }

        const isUpdate = !!this.form.id;

        const payload = {
            ...this.form,
            nbMedecins: this.form.nbMedecins || 0,
            statut: this.form.statut || 'essai'
        };

        const request$ = isUpdate
            ? this.cabinetService.update(this.form.id, payload)
            : this.cabinetService.create(payload);

        request$.subscribe({
            next: (savedCabinet) => {
                const mapped = this.mapCabinet(savedCabinet);
                if (isUpdate) {
                    const idx = this.cabinets.findIndex(c => c.id === mapped.id);
                    if (idx > -1) this.cabinets[idx] = mapped;
                } else {
                    this.cabinets.unshift(mapped);
                }
                
                this.updateCounts();
                this.filtrer();
                this.dialogVisible = false;
                this.messageService.add({ 
                    severity: 'success', 
                    summary: isUpdate ? 'Cabinet mis à jour' : 'Cabinet créé', 
                    detail: mapped.nom 
                });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de ' + (isUpdate ? 'modifier' : 'créer') + ' le cabinet' });
            }
        });
    }

    voirDetail(c: any) {
        this.selectedCabinet = { ...c };
        this.detailDialogVisible = true;
    }
    
    modifier(c: any) {
        this.form = { ...c };
        this.dialogVisible = true;
    }

    supprimer(c: any) {
        this.confirmService.confirm({
            message: `Êtes-vous sûr de vouloir supprimer ${c.nom} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.cabinetService.delete(c.id).subscribe({
                    next: () => {
                        this.cabinets = this.cabinets.filter(cab => cab.id !== c.id);
                        this.updateCounts();
                        this.filtrer();
                        this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Cabinet supprimé avec succès' });
                    },
                    error: () => {
                        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le cabinet' });
                    }
                });
            }
        });
    }
    suspendre(c: any) {
        this.cabinetService.toggleStatus(c.id, 'suspendu').subscribe({
            next: (updated) => {
                c.statut = 'suspendu';
                c.statutLabel = 'Suspendu';
                this.updateCounts();
                this.filtrer();
                this.messageService.add({ severity: 'warn', summary: 'Suspendu', detail: c.nom });
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de suspendre' })
        });
    }
    activer(c: any) {
        this.cabinetService.toggleStatus(c.id, 'actif').subscribe({
            next: (updated) => {
                c.statut = 'actif';
                c.statutLabel = 'Actif';
                this.updateCounts();
                this.filtrer();
                this.messageService.add({ severity: 'success', summary: 'Activé', detail: c.nom });
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'activer' })
        });
    }
}
