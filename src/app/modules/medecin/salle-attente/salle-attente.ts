import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AppointmentService } from '../../../core/services/appointment';
import { PatientService } from '../../../core/services/patient';
import { AuthService } from '../../../core/services/auth';
import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export interface PatientAttente {
    id: number;
    rdvId: number;
    patient: string;
    initiales: string;
    heure: string;
    heureArrivee: string | null;
    type: string;
    typeLabel: string;
    motif: string;
    statut: 'EN_ATTENTE' | 'ARRIVE' | 'EN_CONSULTATION' | 'TERMINE' | 'ANNULE';
    couleur: string;
    priorite: 'NORMAL' | 'URGENT';
    numeroAttente: number;
    attenteMins: number;
    patientId: number;
}

@Component({
    selector: 'app-salle-attente',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ToastModule, DialogModule, TooltipModule],
    providers: [MessageService],
    templateUrl: './salle-attente.html',
    styleUrls: ['./salle-attente.scss']
})
export class SalleAttenteComponent implements OnInit, OnDestroy {

    patients: PatientAttente[] = [];
    loading = true;
    heureActuelle = '';
    dateActuelle = '';

    // Timer
    private timerSub: Subscription | null = null;
    private refreshSub: Subscription | null = null;

    // Dialog consultation
    consultationDialogVisible = false;
    patientEnConsultation: PatientAttente | null = null;

    // Stats
    get nbEnAttente(): number { return this.patients.filter(p => p.statut === 'ARRIVE').length; }
    get nbEnConsultation(): number { return this.patients.filter(p => p.statut === 'EN_CONSULTATION').length; }
    get nbTermines(): number { return this.patients.filter(p => p.statut === 'TERMINE').length; }
    get attenteMaxMins(): number {
        const arrives = this.patients.filter(p => p.statut === 'ARRIVE' && p.attenteMins > 0);
        return arrives.length > 0 ? Math.max(...arrives.map(p => p.attenteMins)) : 0;
    }

    // File d'attente (patients arrivés, triés par numéro)
    get fileAttente(): PatientAttente[] {
        return this.patients
            .filter(p => p.statut === 'ARRIVE')
            .sort((a, b) => a.numeroAttente - b.numeroAttente);
    }

    // En consultation maintenant
    get enConsultation(): PatientAttente[] {
        return this.patients.filter(p => p.statut === 'EN_CONSULTATION');
    }

    // RDV du jour non encore arrivés
    get rdvAttendus(): PatientAttente[] {
        return this.patients
            .filter(p => p.statut === 'EN_ATTENTE')
            .sort((a, b) => a.heure.localeCompare(b.heure));
    }

    // Terminés
    get termines(): PatientAttente[] {
        return this.patients
            .filter(p => p.statut === 'TERMINE')
            .sort((a, b) => b.numeroAttente - a.numeroAttente);
    }

    private arriveeCounter = 1;

    typeOptions: Record<string, string> = {
        PRESENTIELLE: 'Consultation',
        TELECONSULTATION: 'Téléconsultation',
        CONTROLE: 'Contrôle',
        URGENCE: 'Urgence',
        SUIVI: 'Suivi'
    };

    constructor(
        private appointmentService: AppointmentService,
        private patientService: PatientService,
        private authService: AuthService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.tickHorloge();
        this.timerSub = interval(1000).subscribe(() => {
            this.tickHorloge();
            this.updateAttenteMins();
            this.cdr.markForCheck();
        });
        this.loadData();

        // Rafraîchissement auto toutes les 60s
        this.refreshSub = interval(60000).subscribe(() => this.loadData());
    }

    ngOnDestroy(): void {
        this.timerSub?.unsubscribe();
        this.refreshSub?.unsubscribe();
    }

    tickHorloge(): void {
        const now = new Date();
        this.heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.dateActuelle = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    updateAttenteMins(): void {
        const now = Date.now();
        this.patients.forEach(p => {
            if (p.statut === 'ARRIVE' && p.heureArrivee) {
                const arrivee = new Date(p.heureArrivee).getTime();
                p.attenteMins = Math.floor((now - arrivee) / 60000);
            }
        });
    }

    loadData(): void {
        this.loading = true;
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            rdvs: this.appointmentService.getAll().pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                const patientsMap = new Map<number, any>();
                res.patients.forEach((p: any) => patientsMap.set(p.id, p));

                const todayStr = new Date().toISOString().split('T')[0];
                const rdvsToday = res.rdvs.filter((r: any) =>
                    r.dateHeureDebut && r.dateHeureDebut.startsWith(todayStr) && r.statut !== 'ANNULE'
                );

                // Conserver les statuts locaux si les patients existent déjà
                const existingMap = new Map<number, PatientAttente>();
                this.patients.forEach(p => existingMap.set(p.rdvId, p));

                this.patients = rdvsToday.map((r: any) => {
                    const p = patientsMap.get(r.patientId) || {};
                    const nom = p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${r.patientId}`;
                    const initiales = nom.split(' ').map((n: string) => n[0] || '').join('').toUpperCase().substring(0, 2) || 'P?';
                    const heure = new Date(r.dateHeureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    const existing = existingMap.get(r.id);

                    // Mapper le statut backend → statut local
                    let statut: PatientAttente['statut'];
                    if (existing) {
                        statut = existing.statut; // Conserver le statut local
                    } else {
                        statut = r.statut === 'TERMINE' ? 'TERMINE'
                               : r.statut === 'EN_COURS' ? 'EN_CONSULTATION'
                               : r.statut === 'CONFIRME' ? 'EN_ATTENTE'
                               : 'EN_ATTENTE';
                    }

                    return {
                        id: r.id,
                        rdvId: r.id,
                        patientId: r.patientId,
                        patient: nom,
                        initiales,
                        heure,
                        heureArrivee: existing?.heureArrivee || null,
                        type: r.typeConsultation || 'PRESENTIELLE',
                        typeLabel: this.typeOptions[r.typeConsultation] || 'Consultation',
                        motif: r.motif || '',
                        statut,
                        couleur: this.getCouleurType(r.typeConsultation),
                        priorite: r.typeConsultation === 'URGENCE' ? 'URGENT' : 'NORMAL',
                        numeroAttente: existing?.numeroAttente || 0,
                        attenteMins: existing?.attenteMins || 0
                    } as PatientAttente;
                }).sort((a: PatientAttente, b: PatientAttente) => a.heure.localeCompare(b.heure));

                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loading = false;
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données' });
                this.cdr.markForCheck();
            }
        });
    }

    // ── Actions ──────────────────────────────────────

    marquerArrive(patient: PatientAttente): void {
        patient.statut = 'ARRIVE';
        patient.heureArrivee = new Date().toISOString();
        patient.attenteMins = 0;
        patient.numeroAttente = this.arriveeCounter++;

        this.messageService.add({
            severity: 'success',
            summary: 'Patient arrivé',
            detail: `${patient.patient} est en salle d'attente (N°${patient.numeroAttente})`
        });
        this.cdr.markForCheck();
    }

    demarrerConsultation(patient: PatientAttente): void {
        // Mettre EN_CONSULTATION localement
        patient.statut = 'EN_CONSULTATION';

        // Appel API pour passer en EN_COURS
        this.appointmentService.update(patient.rdvId, {
            tenantId: 1,
            patientId: patient.patientId,
            medecinId: this.authService.getCurrentUser()?.id || 1,
            dateHeureDebut: new Date().toISOString().slice(0, 19),
            motif: patient.motif,
            typeConsultation: patient.type,
            notesInternes: '',
            statut: 'EN_COURS'
        }).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Consultation démarrée',
                    detail: `Consultation de ${patient.patient} en cours`
                });
            },
            error: () => {
                // On laisse le statut local même si l'API échoue
            }
        });
        this.cdr.markForCheck();
    }

    terminerConsultation(patient: PatientAttente): void {
        patient.statut = 'TERMINE';

        this.appointmentService.terminer(patient.rdvId).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Consultation terminée',
                    detail: `${patient.patient} — consultation terminée`
                });
            },
            error: () => {}
        });
        this.cdr.markForCheck();
    }

    annulerRdv(patient: PatientAttente): void {
        patient.statut = 'ANNULE';
        this.appointmentService.annuler(patient.rdvId, 'Annulé depuis la salle d\'attente').subscribe({
            next: () => {
                this.patients = this.patients.filter(p => p.rdvId !== patient.rdvId);
                this.messageService.add({ severity: 'warn', summary: 'RDV annulé', detail: patient.patient });
            },
            error: () => {}
        });
        this.cdr.markForCheck();
    }

    marquerUrgent(patient: PatientAttente): void {
        patient.priorite = patient.priorite === 'URGENT' ? 'NORMAL' : 'URGENT';
        this.cdr.markForCheck();
    }

    // ── Helpers ──────────────────────────────────────

    getCouleurType(type: string): string {
        const map: Record<string, string> = {
            PRESENTIELLE: 'blue',
            TELECONSULTATION: 'purple',
            CONTROLE: 'teal',
            URGENCE: 'red',
            SUIVI: 'green'
        };
        return map[type] || 'blue';
    }

    formatAttente(mins: number): string {
        if (mins < 1) return 'À l\'instant';
        if (mins < 60) return `${mins} min`;
        return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
    }

    getAttenteClass(mins: number): string {
        if (mins >= 30) return 'long';
        if (mins >= 15) return 'medium';
        return 'short';
    }
}
