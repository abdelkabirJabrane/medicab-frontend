import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { PatientService } from '../../../core/services/patient';
import { AppointmentService } from '../../../core/services/appointment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';

@Component({
    selector: 'app-salle-attente',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, DialogModule, InputTextModule, ToastModule, SelectModule],
    providers: [MessageService],
    templateUrl: './salle-attente.html',
    styleUrls: ['./salle-attente.scss']
})
export class SalleAttenteComponent implements OnInit, OnDestroy {
    patients: any[] = [];
    consultes: any[] = [];

    dialogVisible = false;
    appelEnCours: any = null;
    private timerInterval: any;

    formArrivee: any = {
        nom: '',
        medecin: '',
        type: '',
        motif: '',
        urgence: false
    };

    medecinAssocie: any = null;
    medecins: any[] = [];
    medecinOptions: any[] = [];

    typeOptions = [
        { label: 'Consultation', value: 'PRESENTIELLE' },
        { label: 'Téléconsultation', value: 'TELECONSULTATION' },
        { label: 'Contrôle', value: 'CONTROLE' },
        { label: 'Urgence', value: 'URGENCE' },
        { label: 'Suivi', value: 'SUIVI' }
    ];

    constructor(
        private messageService: MessageService,
        private patientService: PatientService,
        private appointmentService: AppointmentService,
        private authService: AuthService,
        private userAdminService: UserAdminService
    ) {}

    ngOnInit() {
        this.loadMedecinAssocie();
        // Timer pour incrémenter les minutes d'attente toutes les minutes
        this.timerInterval = setInterval(() => {
            this.patients.forEach((p) => p.minutesAttente++);
        }, 60000);
    }

    loadMedecinAssocie() {
        const user = this.authService.getCurrentUser();
        if (!user?.medecinId) {
            this.loadPatients();
            return;
        }

        this.userAdminService.getById(user.medecinId).subscribe({
            next: (m) => {
                const label = `Dr. ${m.firstName} ${m.lastName}`;
                const initiales = ((m.firstName?.[0] || '') + (m.lastName?.[0] || '')).toUpperCase() || 'MD';
                this.medecinAssocie = {
                    id: m.id,
                    nom: `${m.firstName} ${m.lastName}`,
                    label: label,
                    value: m.id,
                    initiales: initiales,
                    statut: 'disponible',
                    statutLabel: 'Disponible'
                };
                this.medecins = [this.medecinAssocie];
                this.medecinOptions = [{ label: label, value: m.id }];
                this.loadPatients();
            },
            error: () => this.loadPatients()
        });
    }

    ngOnDestroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    loadPatients() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            rdvs: this.appointmentService.getAll().pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                const patientsMap = new Map<number, any>();
                res.patients.forEach(p => patientsMap.set(p.id, p));

                const todayStr = new Date().toISOString().split('T')[0];
                const rdvsToday = res.rdvs.filter(r => r.dateHeureDebut && r.dateHeureDebut.startsWith(todayStr));

                this.patients = rdvsToday.filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'ARRIVE').map(r => {
                    const pInfo = patientsMap.get(r.patientId) || {};
                    const np = pInfo.nomComplet || `${pInfo.prenom || ''} ${pInfo.nom || ''}`.trim() || `Patient ${r.patientId}`;
                    let initials = np.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

                    let mLabel = 'Médecin';
                    if (this.medecinAssocie && r.medecinId === this.medecinAssocie.id) {
                        mLabel = this.medecinAssocie.nom;
                    }

                    const dateArr = r.dateHeureDebut ? new Date(r.dateHeureDebut) : new Date();
                    let mins = Math.round((Date.now() - dateArr.getTime()) / 60000);
                    if (mins < 0) mins = 0;

                    return {
                        id: r.id,
                        nom: np,
                        initiales: initials,
                        medecin: mLabel,
                        type: r.typeConsultation || 'Consultation',
                        motif: r.motif || '',
                        minutesAttente: mins,
                        urgence: (r.motif || '').toLowerCase().includes('urgence'),
                        heureArrivee: dateArr.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    };
                });

                this.trierFile();

                this.consultes = rdvsToday.filter(r => r.statut === 'TERMINE' || r.statut === 'EN_COURS').map(r => {
                    const pInfo = patientsMap.get(r.patientId) || {};
                    const np = pInfo.nomComplet || `${pInfo.prenom || ''} ${pInfo.nom || ''}`.trim() || `Patient ${r.patientId}`;
                    let initials = np.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                    let mLabel = 'Médecin';
                    if (this.medecinAssocie && r.medecinId === this.medecinAssocie.id) {
                        mLabel = this.medecinAssocie.nom;
                    }

                    return {
                        id: r.id,
                        nom: np,
                        initiales: initials,
                        medecin: mLabel,
                        heureConsulte: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    };
                });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la salle d\'attente' });
            }
        });
    }

    trierFile() {
        this.patients.sort((a, b) => {
            if (a.urgence && !b.urgence) return -1;
            if (!a.urgence && b.urgence) return 1;
            return a.minutesAttente - b.minutesAttente;
        });
    }

    ouvrirAjout() {
        this.formArrivee = { 
            nom: '', 
            medecin: this.medecinAssocie?.id || '', 
            type: 'PRESENTIELLE', 
            motif: '', 
            urgence: false 
        };
        this.dialogVisible = true;
    }

    enregistrerArrivee() {
        if (!this.formArrivee.nom || !this.formArrivee.medecin) {
            this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Nom et médecin obligatoires' });
            return;
        }

        const patient = {
            id: Date.now(),
            nom: this.formArrivee.nom,
            initiales: this.formArrivee.nom
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2),
            medecin: this.formArrivee.medecin,
            type: this.formArrivee.type || 'Consultation',
            motif: this.formArrivee.motif,
            urgence: this.formArrivee.urgence,
            minutesAttente: 0,
            heureArrivee: this.getHeure()
        };

        if (patient.urgence) {
            // Insérer après les autres urgences mais avant les cas normaux
            const lastUrgenceIdx = this.patients.reduce((last, p, i) => (p.urgence ? i : last), -1);
            this.patients.splice(lastUrgenceIdx + 1, 0, patient);
        } else {
            this.patients.push(patient);
        }

        this.dialogVisible = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Arrivée enregistrée',
            detail: `${patient.nom} ajouté${patient.urgence ? ' en priorité' : ''} à la file`
        });
    }

    appelerPatient(patient: any, index: number) {
        this.appelEnCours = patient;
        this.messageService.add({
            severity: 'info',
            summary: 'Patient appelé',
            detail: `${patient.nom} — salle Dr. ${patient.medecin}`
        });
    }

    marquerConsulte(patient: any, index: number) {
        const heure = this.getHeure();
        this.consultes.unshift({ ...patient, heureConsulte: heure });
        this.patients.splice(index, 1);
        if (this.appelEnCours?.id === patient.id) this.appelEnCours = null;
        this.messageService.add({
            severity: 'success',
            summary: 'Consultation enregistrée',
            detail: `${patient.nom} marqué comme consulté`
        });
    }

    marquerSorti(patient: any, index: number) {
        this.patients.splice(index, 1);
        if (this.appelEnCours?.id === patient.id) this.appelEnCours = null;
        this.messageService.add({
            severity: 'info',
            summary: 'Patient sorti',
            detail: `${patient.nom} a quitté la salle d'attente`
        });
    }

    monterPatient(index: number) {
        if (index <= 0) return;
        [this.patients[index - 1], this.patients[index]] = [this.patients[index], this.patients[index - 1]];
    }

    descendrePatient(index: number) {
        if (index >= this.patients.length - 1) return;
        [this.patients[index], this.patients[index + 1]] = [this.patients[index + 1], this.patients[index]];
    }

    getNbUrgences(): number {
        return this.patients.filter((p) => p.urgence).length;
    }
    getAttentemoyenne(): number {
        if (!this.patients.length) return 0;
        return Math.round(this.patients.reduce((s, p) => s + p.minutesAttente, 0) / this.patients.length);
    }

    getHeure(): string {
        return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
}
