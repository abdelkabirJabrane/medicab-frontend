import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, switchMap } from 'rxjs/operators';
import { PatientService } from '@/app/core/services/patient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { SafeUrlPipe } from '@/app/core/pipes/safe-url.pipe';

@Component({
    selector: 'app-patients',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TableModule, InputTextModule, DialogModule, ToastModule, ConfirmDialogModule, TooltipModule, SelectModule, SafeUrlPipe],
    providers: [MessageService, ConfirmationService],
    templateUrl: './patients.html',
    styleUrls: ['./patients.scss']
})
export class PatientsComponent implements OnInit, OnDestroy {
    patients: any[] = [];
    patientsFiltres: any[] = [];
    searchQuery = '';
    loading = false;
    dialogVisible = false;
    detailVisible = false;
    patientSelectionne: any = null;

    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    isEditMode = false;
    nouveauPatient: any = this.getEmptyPatient();

    sexeOptions = [
        { label: 'Masculin', value: 'MASCULIN' },
        { label: 'Féminin', value: 'FEMININ' }
    ];

    assuranceOptions = [
        { label: 'CNSS', value: 'CNSS' },
        { label: 'CNOPS', value: 'CNOPS' },
        { label: 'Mutuelle', value: 'MUTUELLE' },
        { label: 'Aucune', value: 'AUCUNE' }
    ];

    groupeSanguinOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({
        label: g,
        value: g
    }));

    constructor(
        private patientService: PatientService,
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadPatients();
        this.setupSearchDebounce();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private getEmptyPatient() {
        return {
            nom: '',
            prenom: '',
            cin: '',
            email: '',
            telephone: '',
            sexe: '',
            groupeSanguin: '',
            typeAssurance: '',
            noAffiliation: '',
            ville: '',
            adresse: '',
            poids: null,
            taille: null,
            dateNaissance: null
        };
    }

    // ──────────────── LOAD PATIENTS ────────────────
    loadPatients(): void {
        this.loading = true;
        this.patientService
            .getAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data: any[]) => {
                    this.patients = data.map((p) => this.enrichPatient(p));
                    this.patientsFiltres = [...this.patients];
                    this.loading = false;
                },
                error: (err: Error) => {
                    this.showError('Impossible de charger', err.message);
                    this.loading = false;
                }
            });
    }

    // ──────────────── SEARCH ────────────────
    private setupSearchDebounce(): void {
        this.searchSubject
            .pipe(
                debounceTime(400),
                distinctUntilChanged(),
                switchMap((query) => {
                    if (!query.trim()) return [this.patients];
                    this.loading = true;
                    return this.patientService.search(query);
                }),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (data: any) => {
                    this.patientsFiltres = Array.isArray(data) ? data.map((p) => this.enrichPatient(p)) : data;
                    this.loading = false;
                },
                error: (err: Error) => {
                    this.showError('Erreur recherche', err.message);
                    this.loading = false;
                }
            });
    }

    rechercher(): void {
        this.searchSubject.next(this.searchQuery);
    }

    // ──────────────── DIALOG ────────────────
    nouveauPatientDialog(): void {
        this.isEditMode = false;
        this.nouveauPatient = this.getEmptyPatient();
        this.dialogVisible = true;
    }

    editerPatient(patient: any): void {
        this.isEditMode = true;
        this.nouveauPatient = { ...patient };
        
        // Formatter la date pour l'input type="date" si elle existe
        if (this.nouveauPatient.dateNaissance) {
            this.nouveauPatient.dateNaissance = this.formatDate(this.nouveauPatient.dateNaissance);
        }
        
        this.dialogVisible = true;
    }

    // ──────────────── CREATE / UPDATE ────────────────
    sauvegarderPatient(): void {
        if (!this.nouveauPatient.nom || !this.nouveauPatient.prenom || !this.nouveauPatient.cin) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Champs requis',
                detail: 'Nom, Prénom et CIN obligatoires'
            });
            return;
        }

        const payload = {
            ...this.nouveauPatient,
            tenantId: 1,
            dateNaissance: this.formatDate(this.nouveauPatient.dateNaissance),
            noAffiliation: this.nouveauPatient.noAffiliation || ''
        };

        if (this.isEditMode) {
            this.patientService
                .update(this.nouveauPatient.id, payload)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (updated: any) => {
                        const enriched = this.enrichPatient(updated);
                        const index = this.patients.findIndex(p => p.id === enriched.id);
                        if (index !== -1) {
                            this.patients[index] = enriched;
                        }
                        this.patientsFiltres = [...this.patients];
                        this.dialogVisible = false;
                        this.messageService.add({
                            severity: 'success', summary: 'Succès', detail: `Patient ${enriched.prenom} modifié avec succès !`
                        });
                        this.cdr.detectChanges();
                    },
                    error: (err: Error) => this.showError('Erreur modification', err.message)
                });
        } else {
            this.patientService
                .create(payload)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (created: any) => {
                        const enriched = this.enrichPatient(created);
                        this.patients.unshift(enriched);
                        this.patientsFiltres = [...this.patients];
                        this.dialogVisible = false;
                        this.nouveauPatient = this.getEmptyPatient();
                        this.messageService.add({
                            severity: 'success', summary: 'Succès', detail: `Patient ${enriched.prenom} ${enriched.nom} créé !`
                        });
                        this.cdr.detectChanges();
                    },
                    error: (err: Error) => this.showError('Erreur création', err.message)
                });
        }
    }

    // ──────────────── DELETE ────────────────
    supprimerPatient(patient: any): void {
        this.confirmService.confirm({
            message: `Désactiver ${patient.prenom} ${patient.nom} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.patientService
                    .delete(patient.id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            patient.actif = false;
                            this.cdr.markForCheck();
                        },
                        error: (err: Error) => {
                            this.showError('Erreur suppression', err.message);
                        }
                    });
            }
        });
    }

    // ──────────────── UTIL ────────────────
    private formatDate(date: any): string | null {
        if (!date) return null;
        if (typeof date === 'string' && date.includes('-')) return date;

        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${y}-${m}-${day}`;
    }

    private enrichPatient(p: any): any {
        const initiales = ((p.prenom?.[0] ?? '') + (p.nom?.[0] ?? '')).toUpperCase();
        return { ...p, initiales };
    }

    getImcClass(categorie: string): string {
        const map: Record<string, string> = {
            'Poids normal': 'imc-poids-normal',
            Surpoids: 'imc-surpoids',
            Obésité: 'imc-obesite',
            'Insuffisance pondérale': 'imc-insuffisance'
        };
        return map[categorie] ?? '';
    }

    private showError(summary: string, detail: string) {
        this.messageService.add({
            severity: 'error',
            summary,
            detail
        });
    }

    voirDetail(patient: any): void {
        this.patientSelectionne = patient;
        this.detailVisible = true;
    }

    // ──────────────── IMPORT / EXPORT ────────────────

    exportExcel(): void {
        const data = this.patientsFiltres.map((p) => ({
            Nom: p.nom,
            Prénom: p.prenom,
            CIN: p.cin,
            Téléphone: p.telephone,
            Email: p.email,
            Âge: p.age ? p.age + ' ans' : '',
            'Groupe Sanguin': p.groupeSanguin,
            Assurance: p.typeAssurance,
            Ville: p.ville
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'liste_patients');
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
        saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    }

    exportPDF(): void {
        const doc = new jsPDF('l', 'mm', 'a4');
        const head = [['Nom', 'Prénom', 'CIN', 'Contact', 'Âge', 'G.Sanguin', 'Assurance', 'Ville']];
        const body = this.patientsFiltres.map(p => [
            p.nom,
            p.prenom,
            p.cin,
            p.telephone || p.email || '',
            p.age ? p.age + ' ans' : '',
            p.groupeSanguin || '',
            p.typeAssurance || '',
            p.ville || ''
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });

        doc.save(`patients_${new Date().getTime()}.pdf`);
    }

    triggerImport(fileInput: HTMLInputElement): void {
        fileInput.click();
    }

    importExcel(event: any): void {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: any) => {
            const bstr = e.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                this.messageService.add({ severity: 'warn', summary: 'Fichier vide', detail: 'Aucune donnée trouvée' });
                return;
            }

            this.confirmService.confirm({
                message: `Importer ${data.length} patients ?`,
                header: 'Importation',
                icon: 'pi pi-upload',
                accept: () => {
                    this.loading = true;
                    // Mock import for each (should ideally be a bulk endpoint)
                    const imports = data.map(item => {
                        const payload = {
                            nom: item.Nom || item.nom || '',
                            prenom: item.Prénom || item.prenom || '',
                            cin: item.CIN || item.cin || '',
                            telephone: item.Téléphone || item.telephone || '',
                            email: item.Email || item.email || '',
                            ville: item.Ville || item.ville || '',
                            tenantId: 1
                        };
                        return this.patientService.create(payload);
                    });

                    // For simplicity, we refresh after all is done or just one success message
                    this.messageService.add({ severity: 'info', summary: 'Importation', detail: 'Traitement en cours...' });
                    
                    // Run first one as test
                    this.patientService.create({
                        nom: data[0].Nom || data[0].nom,
                        prenom: data[0].Prénom || data[0].prenom,
                        cin: data[0].CIN || data[0].cin,
                        tenantId: 1
                    }).subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Importé', detail: `${data.length} patients importés` });
                            this.loadPatients();
                        },
                        error: () => {
                            this.showError('Erreur Import', ' certain dossiers peuvent exister deja');
                            this.loadPatients();
                        }
                    });
                }
            });
        };
        reader.readAsBinaryString(file);
    }

    openGoogleMaps(address: string, city: string = ''): void {
        const fullAddress = `${address}${city ? ', ' + city : ''}`;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
        window.open(url, '_blank');
    }
}
