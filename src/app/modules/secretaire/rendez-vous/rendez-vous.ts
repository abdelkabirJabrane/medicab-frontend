import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PatientService } from '../../../core/services/patient';
import { AppointmentService } from '../../../core/services/appointment';
import { NotificationService } from '../../../core/services/notification';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';

@Component({
    selector: 'app-sec-rendez-vous',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './rendez-vous.html',
    styleUrls: ['./rendez-vous.scss']
})
export class SecRendezVousComponent implements OnInit {
    dateSelectionnee = new Date();
    moisActuel = new Date();

    tousRdv: any[] = [];
    rdvFiltres: any[] = [];
    joursMois: any[] = [];
    joursNoms = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    vue = 'liste';
    medecinFiltre = 'TOUS';
    dialogVisible = false;
    rdvEnModification: any = null;

    timelineSlots: any[] = [];

    formRdv: any = {
        patient: '',
        medecin: '',
        type: '',
        date: '',
        heure: '',
        duree: 30,
        motif: '',
        note: ''
    };

    // Médecin associé à cette secrétaire (chargé dynamiquement)
    medecinAssocie: any = null;
    medecinsOptions: any[] = [];  // Pour le dropdown (1 seul médecin)

    typeOptions = [
        { label: 'Consultation', value: 'PRESENTIELLE' },
        { label: 'Téléconsultation', value: 'TELECONSULTATION' },
        { label: 'Contrôle', value: 'CONTROLE' },
        { label: 'Urgence', value: 'URGENCE' },
        { label: 'Suivi', value: 'SUIVI' }
    ];

    heureOptions = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((h) => ({ label: h, value: h }));

    dureeOptions = [
        { label: '15 min', value: 15 },
        { label: '30 min', value: 30 },
        { label: '45 min', value: 45 },
        { label: '60 min', value: 60 }
    ];

    patientsOptions: any[] = [];

    constructor(
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private patientService: PatientService,
        private appointmentService: AppointmentService,
        private notificationService: NotificationService,
        private authService: AuthService,
        private userAdminService: UserAdminService
    ) {}

    ngOnInit() {
        this.loadMedecinAssocie();
        this.loadRdv();
        this.genererCalendrier();
        this.filtrerRdv();
        this.genererTimeline();
    }

    loadMedecinAssocie() {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.medecinId) return;

        this.userAdminService.getById(currentUser.medecinId).subscribe({
            next: (m) => {
                const initiales = ((m.firstName?.[0] || '') + (m.lastName?.[0] || '')).toUpperCase() || 'MD';
                this.medecinAssocie = {
                    id: m.id,
                    label: `Dr. ${m.firstName} ${m.lastName}`,
                    value: m.id,
                    initiales
                };
                // Le dropdown ne contiendra que ce médecin
                this.medecinsOptions = [this.medecinAssocie];
                // Pré-sélectionner dans le formulaire
                this.formRdv.medecinId = m.id;
            },
            error: () => console.warn('Impossible de charger le médecin associé')
        });
    }

    loadRdv() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            rdvs: this.appointmentService.getAll().pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                const patientsMap = new Map<number, any>();
                res.patients.forEach(p => patientsMap.set(p.id, p));

                this.patientsOptions = res.patients.map(p => {
                    const np = p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${p.id}`;
                    return { label: np, value: p.id, email: p.email || 'patient@example.com' };
                });

                this.tousRdv = res.rdvs.map(r => {
                    const pInfo = patientsMap.get(r.patientId) || {};
                    const np = pInfo.nomComplet || `${pInfo.prenom || ''} ${pInfo.nom || ''}`.trim() || `Patient ${r.patientId}`;
                    let initials = np.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                    if (!initials) initials = 'PI';

                    const d = r.dateHeureDebut ? new Date(r.dateHeureDebut) : new Date();
                    const dEnd = r.dateHeureFin ? new Date(r.dateHeureFin) : new Date(d.getTime() + 30 * 60000);
                    const diffMins = Math.round((dEnd.getTime() - d.getTime()) / 60000);

                    // Get doctor name dynamically
                    let mName = 'Médecin';
                    if (this.medecinAssocie && r.medecinId === this.medecinAssocie.id) {
                        mName = this.medecinAssocie.label.replace('Dr. ', '');
                    }

                    return {
                        id: r.id,
                        patientId: r.patientId,
                        patient: np,
                        initiales: initials,
                        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), // Midnight
                        heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        duree: diffMins > 0 ? diffMins : 30,
                        type: r.typeConsultation || 'Consultation',
                        medecin: mName,
                        motif: r.motif || '',
                        statut: r.statut || 'EN_ATTENTE'
                    };
                });

                this.updateMedecinCounts();
                this.genererCalendrier();
                this.filtrerRdv();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les RDV' });
            }
        });
    }

    updateMedecinCounts() {
        // Avec un seul médecin associé, on compte juste les RDV du jour
        const rdvJour = this.tousRdv.filter((r) => r.date.toDateString() === this.dateSelectionnee.toDateString());
        if (this.medecinAssocie) {
            this.medecinAssocie.rdvCount = rdvJour.length;
        }
    }

    genererCalendrier() {
        const annee = this.moisActuel.getFullYear();
        const mois = this.moisActuel.getMonth();
        const premierJour = new Date(annee, mois, 1);
        const dernierJour = new Date(annee, mois + 1, 0);
        let decalage = premierJour.getDay() - 1;
        if (decalage < 0) decalage = 6;

        this.joursMois = [];
        for (let i = 0; i < decalage; i++) {
            this.joursMois.push({ numero: null, date: null, rdvCount: 0, estAujourdhui: false, estSelectionne: false });
        }
        const today = new Date();
        for (let j = 1; j <= dernierJour.getDate(); j++) {
            const date = new Date(annee, mois, j);
            const rdvCount = this.tousRdv.filter((r) => r.date.toDateString() === date.toDateString()).length;
            this.joursMois.push({
                numero: j,
                date,
                rdvCount,
                estAujourdhui: date.toDateString() === today.toDateString(),
                estSelectionne: date.toDateString() === this.dateSelectionnee.toDateString()
            });
        }
    }

    genererTimeline() {
        const heures = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
        this.timelineSlots = heures.map((h) => ({
            heure: h,
            rdv: this.rdvFiltres.find((r) => r.heure === h) || null
        }));
    }

    filtrerRdv() {
        let result = this.tousRdv.filter((r) => r.date.toDateString() === this.dateSelectionnee.toDateString());
        if (this.medecinFiltre !== 'TOUS') {
            result = result.filter((r) => r.medecin === this.medecinFiltre);
        }
        this.rdvFiltres = result.sort((a, b) => a.heure.localeCompare(b.heure));
        this.genererTimeline();
    }

    selectionnerJour(jour: any) {
        if (!jour.date) return;
        this.dateSelectionnee = jour.date;
        this.genererCalendrier();
        this.filtrerRdv();
        this.updateMedecinCounts();
    }

    setMedecinFiltre(value: string) {
        this.medecinFiltre = value;
        this.filtrerRdv();
    }

    moisPrecedent() {
        this.moisActuel = new Date(this.moisActuel.getFullYear(), this.moisActuel.getMonth() - 1, 1);
        this.genererCalendrier();
    }
    moisSuivant() {
        this.moisActuel = new Date(this.moisActuel.getFullYear(), this.moisActuel.getMonth() + 1, 1);
        this.genererCalendrier();
    }

    getNomMois(): string {
        return this.moisActuel.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    getDateAujourdhui(): string {
        return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    getDateLabel(): string {
        return this.dateSelectionnee.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    ouvrirNouveauRdv() {
        this.rdvEnModification = null;
        this.formRdv = { patient: '', medecin: '', type: '', date: '', heure: '', duree: 30, motif: '', note: '' };
        this.dialogVisible = true;
    }

    ouvrirModification(rdv: any) {
        this.rdvEnModification = rdv;
        this.formRdv = { ...rdv, date: rdv.date.toISOString().split('T')[0] };
        this.dialogVisible = true;
    }

    sauvegarderRdv() {
        if (!this.formRdv.patientId || !this.formRdv.heure) {
            this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Patient et heure obligatoires' });
            return;
        }

        const dateBase = new Date(this.formRdv.date || this.dateSelectionnee);
        const [hh, mm] = this.formRdv.heure.split(':').map(Number);
        
        const dDebut = new Date(dateBase);
        dDebut.setHours(hh, mm, 0, 0);

        const dFin = new Date(dDebut);
        dFin.setMinutes(dFin.getMinutes() + (this.formRdv.duree || 30));

        // Récupérer le medecinId du compte connecté (secrétaire lié à un médecin)
        const currentUser = this.authService.getCurrentUser();
        const mId = currentUser?.medecinId || this.formRdv.medecinId || 2;

        const payload = {
            patientId: this.formRdv.patientId,
            medecinId: mId,
            tenantId: currentUser?.tenantId,
            dateHeureDebut: dDebut.toISOString(),
            dateHeureFin: dFin.toISOString(),
            motif: this.formRdv.motif || 'Séance',
            typeConsultation: this.formRdv.type || 'PRESENTIELLE',
            notesInternes: this.formRdv.note || ''
        };

        this.appointmentService.create(payload).subscribe({
            next: () => {
                this.dialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'RDV enregistré', detail: `RDV sauvegardé avec succès` });
                this.loadRdv();
            },
            error: (err) => {
                let msg = 'Erreur serveur';
                if (err.error && typeof err.error === 'string') msg = err.error;
                else if (err.error?.message) msg = err.error.message;
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg });
                console.error(err);
            }
        });
    }

    confirmerRdv(rdv: any) {
        this.appointmentService.confirmer(rdv.id).subscribe({
            next: () => {
                rdv.statut = 'CONFIRME';
                this.messageService.add({ severity: 'success', summary: 'RDV confirmé', detail: `${rdv.patient} à ${rdv.heure}` });

                const pt = this.patientsOptions.find(p => p.value === rdv.patientId);
                const contact = pt ? pt.email : 'contact@patient.ma';

                this.notificationService.envoyerConfirmationRDV(
                    rdv.patientId,
                    contact,
                    'EMAIL',
                    rdv.date.toLocaleDateString('fr-FR') + ' à ' + rdv.heure
                ).subscribe({
                    next: () => console.log('Notification envoyée'),
                    error: (e) => console.error('Erreur notification', e)
                });

                this.loadRdv();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de confirmer' })
        });
    }

    annulerRdv(rdv: any) {
        this.confirmService.confirm({
            message: `Annuler le RDV de ${rdv.patient} à ${rdv.heure} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.appointmentService.annuler(rdv.id, 'Annulé par le secrétariat').subscribe({
                    next: () => {
                        rdv.statut = 'ANNULE';
                        this.genererCalendrier();
                        this.filtrerRdv();
                        this.messageService.add({ severity: 'info', summary: 'RDV annulé', detail: `${rdv.patient} à ${rdv.heure}` });
                        this.loadRdv();
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'annuler' })
                });
            }
        });
    }

    marquerArrivee(rdv: any) {
        rdv.statut = 'ARRIVE';
        this.messageService.add({ severity: 'success', summary: 'Arrivée enregistrée', detail: `${rdv.patient} est dans la salle d'attente` });
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            CONFIRME: 'Confirmé',
            EN_ATTENTE: 'En attente',
            ANNULE: 'Annulé',
            EN_COURS: 'En cours',
            ARRIVE: 'Arrivé',
            TERMINE: 'Terminé'
        };
        return map[statut] ?? statut;
    }

    protected readonly Math = Math;
}
