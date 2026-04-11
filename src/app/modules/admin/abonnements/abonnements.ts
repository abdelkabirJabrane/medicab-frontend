import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CabinetService, Cabinet } from '../../../core/services/cabinet';
import { PlanService, Plan } from '../../../core/services/plan';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-admin-abonnements',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, TableModule, ToastModule, DialogModule, InputTextModule, TextareaModule, SelectModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './abonnements.html',
    styleUrls: ['./abonnements.scss']
})
export class AdminAbonnementsComponent implements OnInit {

    // Stats globales
    stats = { actifs: 0, expirant: 0, expires: 0, mrr: '0' };

    // Tableau abonnements (cabinets)
    abonnements: any[] = [];
    abonnementsFiltres: any[] = [];
    loading = false;
    searchQuery = '';

    // Plans chargés depuis la BDD
    plans: any[] = [];
    planOptions: any[] = [];

    // Renouvellements à venir (< 60 jours)
    renouvellements: any[] = [];

    // Dialog modifier plan d'un abonnement
    dialogPlanVisible = false;
    selectedAbonnement: any = null;
    formPlan = { plan: '', dateExpiration: '' };

    // Dialog créer/modifier un plan SaaS
    dialogCreerPlanVisible = false;
    formNouveauPlan: any = { id: null, planId: '', label: '', prix: null, color: '#10b981', features: '' };
    editingPlan = false;

    readonly PLAN_COLORS = [
        { label: 'Vert',   value: '#10b981' },
        { label: 'Bleu',   value: '#6366f1' },
        { label: 'Violet', value: '#a855f7' },
        { label: 'Orange', value: '#ea580c' },
        { label: 'Rouge',  value: '#dc2626' },
    ];

    constructor(
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private cabinetService: CabinetService,
        private planService: PlanService
    ) {}

    ngOnInit() {
        this.loadAll();
    }

    loadAll() {
        this.loading = true;
        forkJoin({
            plans: this.planService.getAll(),
            cabinets: this.cabinetService.getAll()
        }).subscribe({
            next: ({ plans, cabinets }) => {
                // Charger plans depuis BDD
                this.plans = plans.map(p => this.mapPlan(p));
                this.planOptions = this.plans.map(p => ({ label: p.label, value: p.planId }));

                // Calculer abonnements
                this.abonnements = cabinets.map(c => this.mapCabinetToAbonnement(c));
                this.calculerStats();
                this.calculerPlansAbonnes();
                this.calculerRenouvellements();
                this.filtrer();
                this.loading = false;
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données' });
                this.loading = false;
            }
        });
    }

    loadPlans() {
        this.planService.getAll().subscribe({
            next: (plans) => {
                this.plans = plans.map(p => this.mapPlan(p));
                this.planOptions = this.plans.map(p => ({ label: p.label, value: p.planId }));
                this.calculerPlansAbonnes();
            }
        });
    }

    private mapPlan(p: Plan): any {
        return {
            id: p.id,
            planId: p.planId,
            label: p.label,
            prix: p.prix ?? null,
            unite: p.prix ? 'DH/mois' : 'Sur devis',
            color: p.color || '#10b981',
            features: p.features ? p.features.split('\n').filter(f => f.trim()) : [],
            abonnes: 0
        };
    }

    private mapCabinetToAbonnement(c: Cabinet): any {
        let dateExp: Date | null = null;
        if (c.dateExpiration) {
            dateExp = c.dateExpiration.includes('/')
                ? (() => { const p = c.dateExpiration!.split('/'); return new Date(+p[2], +p[1]-1, +p[0]); })()
                : new Date(c.dateExpiration);
        }
        const joursRestants = dateExp
            ? Math.ceil((dateExp.getTime() - Date.now()) / 86400000)
            : 0;

        return {
            id: c.id,
            cabinet: c.nom,
            initiales: c.nom ? c.nom.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : 'CA',
            email: c.email,
            plan: c.plan || 'Starter',
            dateExpiration: dateExp ? dateExp.toLocaleDateString('fr-FR') : '—',
            dateExpirationIso: dateExp ? dateExp.toISOString().split('T')[0] : '',
            montant: this.getMontantPlan(c.plan || 'Starter'),
            joursRestants: Math.max(0, joursRestants),
            statut: joursRestants > 0 ? 'actif' : 'expire',
            statutLabel: joursRestants > 0 ? 'Actif' : 'Expiré'
        };
    }

    private getMontantPlan(planId: string): number {
        const p = this.plans.find(pl => pl.planId === planId);
        return p?.prix ?? 0;
    }

    private calculerStats() {
        this.stats.actifs   = this.abonnements.filter(a => a.statut === 'actif').length;
        this.stats.expirant = this.abonnements.filter(a => a.joursRestants > 0 && a.joursRestants <= 30).length;
        this.stats.expires  = this.abonnements.filter(a => a.statut === 'expire').length;
        const mrr = this.abonnements.filter(a => a.statut === 'actif').reduce((s, a) => s + a.montant, 0);
        this.stats.mrr = mrr.toLocaleString('fr-FR');
    }

    private calculerPlansAbonnes() {
        this.plans.forEach(p => {
            p.abonnes = this.abonnements.filter(a => a.plan === p.planId).length;
        });
    }

    private calculerRenouvellements() {
        this.renouvellements = this.abonnements
            .filter(a => a.joursRestants >= 0 && a.joursRestants <= 60)
            .sort((a, b) => a.joursRestants - b.joursRestants)
            .slice(0, 10);
    }

    filtrer() {
        if (!this.searchQuery.trim()) {
            this.abonnementsFiltres = [...this.abonnements];
        } else {
            const q = this.searchQuery.toLowerCase();
            this.abonnementsFiltres = this.abonnements.filter(a =>
                a.cabinet.toLowerCase().includes(q) ||
                a.plan.toLowerCase().includes(q) ||
                a.email?.toLowerCase().includes(q)
            );
        }
    }

    // ── Actions abonnements ──────────────────────
    ouvrirModifierPlan(a: any) {
        this.selectedAbonnement = a;
        this.formPlan = { plan: a.plan, dateExpiration: a.dateExpirationIso };
        this.dialogPlanVisible = true;
    }

    sauvegarderPlan() {
        if (!this.formPlan.plan) {
            this.messageService.add({ severity: 'warn', summary: 'Requis', detail: 'Veuillez sélectionner un plan' });
            return;
        }
        this.cabinetService.updatePlan(this.selectedAbonnement.id, this.formPlan.plan, this.formPlan.dateExpiration).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Plan mis à jour', detail: `${this.selectedAbonnement.cabinet} → ${this.formPlan.plan}` });
                this.dialogPlanVisible = false;
                this.loadAll();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
        });
    }

    renouveler(a: any) {
        const base = a.joursRestants > 0 ? new Date(a.dateExpirationIso) : new Date();
        base.setFullYear(base.getFullYear() + 1);
        this.cabinetService.updatePlan(a.id, a.plan, base.toISOString().split('T')[0]).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Renouvelé', detail: `${a.cabinet} — +1 an` });
                this.loadAll();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
        });
    }

    resilier(a: any) {
        this.confirmService.confirm({
            message: `Êtes-vous sûr de vouloir résilier l'abonnement de "${a.cabinet}" ?`,
            header: 'Confirmation Résiliation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.cabinetService.toggleStatus(a.id, 'suspendu').subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'warn', summary: 'Résilié', detail: a.cabinet });
                        this.loadAll();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
                });
            }
        });
    }

    // ── Gestion des plans SaaS ───────────────────
    ouvrirCreerPlan() {
        this.editingPlan = false;
        this.formNouveauPlan = { id: null, planId: '', label: '', prix: null, color: '#10b981', features: '' };
        this.dialogCreerPlanVisible = true;
    }

    sauvegarderNouveauPlan() {
        const f = this.formNouveauPlan;
        if (!f.planId?.trim() || !f.label?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Requis', detail: 'L\'identifiant et le nom sont obligatoires' });
            return;
        }

        const payload: Plan = {
            planId: f.planId.trim(),
            label: f.label.trim(),
            prix: f.prix || null,
            color: f.color,
            features: f.features || ''
        };

        if (this.editingPlan && f.id) {
            // Modification
            this.planService.update(f.id, payload).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Plan modifié', detail: payload.label });
                    this.dialogCreerPlanVisible = false;
                    this.loadPlans();
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
            });
        } else {
            // Création
            this.planService.create(payload).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Plan créé', detail: `"${payload.label}" sauvegardé en base de données` });
                    this.dialogCreerPlanVisible = false;
                    this.loadPlans();
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
            });
        }
    }

    supprimerPlan(plan: any) {
        if (plan.abonnes > 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Suppression impossible',
                detail: `${plan.abonnes} cabinet(s) utilisent le plan "${plan.label}". Modifiez-les d'abord.`
            });
            return;
        }
        this.confirmService.confirm({
            message: `Êtes-vous sûr de vouloir supprimer le plan "${plan.label}" ?`,
            header: 'Supprimer le plan',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.planService.delete(plan.id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Plan supprimé', detail: `"${plan.label}" supprimé.` });
                        this.loadPlans();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
                });
            }
        });
    }

    getPlanColor(planId: string): string {
        const p = this.plans.find(pl => pl.planId === planId);
        return p ? p.color : '#64748b';
    }

    getJoursClass(jours: number): string {
        if (jours <= 0) return 'badge--expire';
        if (jours <= 15) return 'badge--urgent';
        if (jours <= 30) return 'badge--warning';
        return 'badge--ok';
    }
}
