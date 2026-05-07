import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientService } from '../../../core/services/patient';
import { AppointmentService } from '../../../core/services/appointment';
import { BillingService } from '../../../core/services/billing';
import { AuthService } from '../../../core/services/auth';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-secretaire-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.scss']
})
export class SecretaireDashboardComponent implements OnInit {

    constructor(
        private patientService: PatientService,
        private appointmentService: AppointmentService,
        private billingService: BillingService,
        private authService: AuthService
    ) {}

    kpis = [
        { titre: "RDV Aujourd'hui", valeur: '18', icon: 'pi pi-calendar', colorKey: 'blue', tendance: '12 confirmés', positif: true },
        { titre: 'En Salle Attente', valeur: '4', icon: 'pi pi-users', colorKey: 'orange', tendance: '+2 ce matin', positif: false },
        { titre: 'Nouveaux Patients', valeur: '3', icon: 'pi pi-user-plus', colorKey: 'green', tendance: "enregistrés aujourd'hui", positif: true },
        { titre: 'RDV Annulés', valeur: '2', icon: 'pi pi-times-circle', colorKey: 'purple', tendance: 'à reprogrammer', positif: false }
    ];

    rdvDuJour = [
        { id: 1, patient: 'Ahmed BENALI', initiales: 'AB', heure: '09:00', type: 'Consultation', medecin: 'ALAMI', statut: 'CONFIRME' },
        { id: 2, patient: 'Fatima ALAMI', initiales: 'FA', heure: '09:30', type: 'Contrôle', medecin: 'ALAMI', statut: 'ARRIVE' },
        { id: 3, patient: 'Omar TAZI', initiales: 'OT', heure: '10:00', type: 'Téléconsultation', medecin: 'ALAMI', statut: 'EN_ATTENTE' },
        { id: 4, patient: 'Sara IDRISSI', initiales: 'SI', heure: '10:30', type: 'Urgence', medecin: 'ALAMI', statut: 'EN_COURS' },
        { id: 5, patient: 'Karim MANSOURI', initiales: 'KM', heure: '11:00', type: 'Suivi', medecin: 'ALAMI', statut: 'CONFIRME' },
        { id: 6, patient: 'Laila BENJELLOUN', initiales: 'LB', heure: '14:00', type: 'Consultation', medecin: 'ALAMI', statut: 'EN_ATTENTE' }
    ];

    salleAttente = [
        { id: 1, patient: 'Fatima ALAMI', initiales: 'FA', attente: '15 min', urgence: false },
        { id: 2, patient: 'Sara IDRISSI', initiales: 'SI', attente: '8 min', urgence: true },
        { id: 3, patient: 'Hassan TAZI', initiales: 'HT', attente: '5 min', urgence: false },
        { id: 4, patient: 'Nadia BERRADA', initiales: 'NB', attente: '2 min', urgence: false }
    ];

    activiteRecente = [
        { icon: 'pi pi-user-plus', color: '#059669', bg: '#ECFDF5', texte: 'Nouveau patient enregistré — Hassan TAZI', temps: 'Il y a 10 min' },
        { icon: 'pi pi-calendar-plus', color: '#2563eb', bg: '#EFF6FF', texte: 'RDV créé — Nadia BERRADA à 14h30', temps: 'Il y a 25 min' },
        { icon: 'pi pi-check-circle', color: '#7c3aed', bg: '#F5F3FF', texte: 'RDV confirmé — Ahmed BENALI 09:00', temps: 'Il y a 40 min' },
        { icon: 'pi pi-times-circle', color: '#dc2626', bg: '#FEF2F2', texte: 'RDV annulé — Mohammed RAJI', temps: 'Il y a 1h' },
        { icon: 'pi pi-sign-in', color: '#d97706', bg: '#FFFBEB', texte: 'Arrivée enregistrée — Fatima ALAMI', temps: 'Il y a 1h15' }
    ];

    repartitionRdv = [
        { label: 'Confirmés', count: 12, pct: 67, color: 'green' },
        { label: 'En attente', count: 4, pct: 22, color: 'orange' },
        { label: 'En cours', count: 1, pct: 6, color: 'blue' },
        { label: 'Annulés', count: 2, pct: 11, color: 'red' }
    ];

    medecins = [
        { nom: 'ALAMI', initiales: 'MA', specialite: 'Médecin Généraliste', statut: 'occupe', statutLabel: 'En consultation', rdvRestants: 7 },
        { nom: 'BENSOUDA', initiales: 'HB', specialite: 'Cardiologue', statut: 'disponible', statutLabel: 'Disponible', rdvRestants: 4 },
        { nom: 'CHRAIBI', initiales: 'SC', specialite: 'Pédiatre', statut: 'disponible', statutLabel: 'Disponible', rdvRestants: 6 },
        { nom: 'IDRISSI', initiales: 'RI', specialite: 'Dermatologue', statut: 'absent', statutLabel: 'Absent', rdvRestants: 0 }
    ];

    ngOnInit() {
        this.loadDashboardData();
    }

    loadDashboardData() {
        const currentUser = this.authService.getCurrentUser();
        const mId = currentUser?.medecinId;

        const appointments$ = mId 
            ? this.appointmentService.getByMedecin(mId)
            : this.appointmentService.getAll();

        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            rdvs: appointments$.pipe(catchError(() => of([]))),
            factures: this.billingService.getAll().pipe(catchError(() => of([])))
        }).subscribe(res => {
            const today = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            const rdvsToday = res.rdvs.filter(r => r.dateHeureDebut && r.dateHeureDebut.startsWith(todayStr));
            
            const patientsMap = new Map<number, string>();
            res.patients.forEach(p => patientsMap.set(p.id, p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${p.id}`));

            // RDV Aujourd'hui
            let confirmes = rdvsToday.filter(r => r.statut === 'CONFIRME').length;
            let arrives = rdvsToday.filter(r => r.statut === 'ARRIVE' || r.statut === 'EN_ATTENTE').length;
            let annules = rdvsToday.filter(r => r.statut === 'ANNULE').length;

            // Nouveaux patients aujourd'hui
            let nxPatients = res.patients.filter(p => p.dateCreation && p.dateCreation.startsWith(todayStr)).length;

            this.kpis = [
                { titre: "RDV Aujourd'hui", valeur: rdvsToday.length.toString(), icon: 'pi pi-calendar', colorKey: 'blue', tendance: `${confirmes} confirmés`, positif: true },
                { titre: 'En Salle Attente', valeur: arrives.toString(), icon: 'pi pi-users', colorKey: 'orange', tendance: "en attente / arrivés", positif: arrives > 0 },
                { titre: 'Nouveaux Patients', valeur: nxPatients.toString(), icon: 'pi pi-user-plus', colorKey: 'green', tendance: "enregistrés aujourd'hui", positif: true },
                { titre: 'RDV Annulés', valeur: annules.toString(), icon: 'pi pi-times-circle', colorKey: 'purple', tendance: 'à reprogrammer', positif: false }
            ];

            this.rdvDuJour = rdvsToday.map(r => {
                const nom = patientsMap.get(r.patientId) || `Patient ${r.patientId}`;
                let initials = nom.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                if (!initials) initials = 'PI';
                
                let mLabel = 'ALAMI';
                if (r.medecinId === 3) mLabel = 'BENSOUDA';
                if (r.medecinId === 4) mLabel = 'CHRAIBI';

                return {
                    id: r.id,
                    patient: nom,
                    initiales: initials,
                    heure: new Date(r.dateHeureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    type: r.typeConsultation || 'Consultation',
                    medecin: mLabel,
                    statut: r.statut || 'EN_ATTENTE'
                };
            }).sort((a,b) => a.heure.localeCompare(b.heure));

            this.salleAttente = rdvsToday.filter(r => r.statut === 'ARRIVE' || r.statut === 'EN_ATTENTE').map(r => {
                const nom = patientsMap.get(r.patientId) || `Patient ${r.patientId}`;
                let initials = nom.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                return {
                    id: r.id,
                    patient: nom,
                    initiales: initials,
                    attente: '... min',
                    urgence: r.motif?.toLowerCase().includes('urgence')
                };
            });

            const tot = rdvsToday.length || 1;
            const sConfirme = rdvsToday.filter(r => r.statut === 'CONFIRME' || r.statut === 'ARRIVE').length;
            const sAttente = rdvsToday.filter(r => r.statut === 'EN_ATTENTE').length;
            const sCours = rdvsToday.filter(r => r.statut === 'EN_COURS').length;
            const sAnnule = rdvsToday.filter(r => r.statut === 'ANNULE').length;

            this.repartitionRdv = [
                { label: 'Confirmés/Arrivés', count: sConfirme, pct: Math.round(sConfirme/tot*100), color: 'green' },
                { label: 'En attente', count: sAttente, pct: Math.round(sAttente/tot*100), color: 'orange' },
                { label: 'En cours', count: sCours, pct: Math.round(sCours/tot*100), color: 'blue' },
                { label: 'Annulés', count: sAnnule, pct: Math.round(sAnnule/tot*100), color: 'red' }
            ];

            // Activité Récente (combiner RDV, Patients)
            let acti: any[] = [];
            
            res.patients.sort((a,b) => b.id - a.id).slice(0,2).forEach(p => acti.push({ 
                icon: 'pi pi-user-plus', color: '#059669', bg: '#ECFDF5', 
                texte: `Nouveau patient enregistré — ${p.nom || 'Patient'}`, temps: 'Récemment', ts: new Date(p.dateCreation || Date.now()).getTime() 
            }));

            res.rdvs.sort((a,b) => b.id - a.id).slice(0,3).forEach(r => {
                const nom = patientsMap.get(r.patientId) || `Patient ${r.patientId}`;
                let col = '#2563eb', bg = '#EFF6FF', ic = 'pi pi-calendar-plus', txt = `RDV créé — ${nom}`;
                if(r.statut === 'ANNULE') { col = '#dc2626'; bg = '#FEF2F2'; ic = 'pi pi-times-circle'; txt = `RDV annulé — ${nom}`; }
                if(r.statut === 'CONFIRME') { col = '#7c3aed'; bg = '#F5F3FF'; ic = 'pi pi-check-circle'; txt = `RDV confirmé — ${nom}`; }
                if(r.statut === 'ARRIVE') { col = '#d97706'; bg = '#FFFBEB'; ic = 'pi pi-sign-in'; txt = `Arrivée enregistrée — ${nom}`; }
                
                acti.push({ icon: ic, color: col, bg: bg, texte: txt, temps: 'Récemment', ts: new Date(r.dateCreation || Date.now()).getTime() });
            });

            this.activiteRecente = acti.sort((a,b) => b.ts - a.ts).slice(0, 5);
        });
    }

    getDateAujourdhui(): string {
        return new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
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

    confirmerRdv(rdv: any) {
        rdv.statut = 'CONFIRME';
    }
    annulerRdv(rdv: any) {
        rdv.statut = 'ANNULE';
    }
    marquerArrivee(rdv: any) {
        rdv.statut = 'ARRIVE';
        this.salleAttente.push({
            id: this.salleAttente.length + 1,
            patient: rdv.patient,
            initiales: rdv.initiales,
            attente: '0 min',
            urgence: false
        });
    }

    ouvrirNouveauRdv() {
        // Navigation vers rendez-vous
    }
}
