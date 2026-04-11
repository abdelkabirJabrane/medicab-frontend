import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { AppointmentService } from '../../../core/services/appointment';
import { PatientService } from '../../../core/services/patient';
import { NotificationService } from '../../../core/services/notification';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, DateSelectArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

@Component({
    selector: 'app-agenda',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ButtonModule, DialogModule, InputTextModule, ToastModule, TooltipModule, SelectModule, FullCalendarModule],
    providers: [MessageService],
    templateUrl: './agenda.html',
    styleUrls: ['./agenda.scss']
})
export class AgendaComponent implements OnInit {
    dateSelectionnee = new Date();
    moisActuel = new Date();

    tousRdv: any[] = [];
    rdvDuJour: any[] = [];
    dialogVisible = false;
    rdvDetailVisible = false;
    rdvSelectionne: any = null;

    calendarOptions: CalendarOptions = {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: frLocale,
        slotMinTime: '08:00:00',
        slotMaxTime: '19:00:00',
        slotDuration: '00:15:00',
        allDaySlot: false,
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        nowIndicator: true,
        select: this.handleDateSelect.bind(this),
        eventClick: this.handleEventClick.bind(this),
        eventDrop: this.handleEventDrop.bind(this),
        eventResize: this.handleEventResize.bind(this),
        events: []
    };

    medecinId = 2; // Switched to 2 to match backend test data
    patientsOptions: any[] = [];

    nouveauRdv: any = { patientId: null, date: null, heure: '', type: '', motif: '' };

    typeOptions = [
        { label: 'Consultation', value: 'PRESENTIELLE' },
        { label: 'Téléconsultation', value: 'TELECONSULTATION' },
        { label: 'Contrôle', value: 'CONTROLE' },
        { label: 'Urgence', value: 'URGENCE' },
        { label: 'Suivi', value: 'SUIVI' }
    ];

    heureOptions = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((h) => ({ label: h, value: h }));

    joursMois: any[] = [];
    joursNoms = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    constructor(
        private messageService: MessageService,
        private appointmentService: AppointmentService,
        private patientService: PatientService,
        private notificationService: NotificationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadPatients();
    }

    loadPatients() {
        this.patientService.getAll().subscribe({
            next: (data) => {
                this.patientsOptions = data.map(p => ({
                    id: p.id,
                    nomComplet: p.nomComplet || `${p.prenom} ${p.nom}`,
                    email: p.email || 'patient@example.com'
                }));
                this.loadRdv(); // On charge les rdv APRES avoir les patients
            },
            error: (err) => {
                console.error('Erreur chargement patients', err);
                this.loadRdv(); // On charge quand même en cas d'erreur
            }
        });
    }

    loadRdv() {
        this.appointmentService.getAll().subscribe({
            next: (data) => {
                this.tousRdv = data.map(rdv => {
                    const patObj = this.patientsOptions.find(p => p.id === rdv.patientId);
                    const realName = rdv.patientNom || (patObj ? patObj.nomComplet : 'Patient Inconnu');
                    
                    return {
                        id: rdv.id,
                        patientId: rdv.patientId || 1,
                        patient: realName,
                        initiales: (realName === 'Patient Inconnu' ? '??' : realName)
                                     .split(' ')
                                     .map((n: string) => n[0] || '')
                                     .join('')
                                     .toUpperCase()
                                     .substring(0, 2),
                        date: new Date(rdv.dateHeureDebut),
                        heure: new Date(rdv.dateHeureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        type: rdv.typeConsultation || 'PRESENTIELLE',
                        typeLabel: this.typeOptions.find(t => t.value === rdv.typeConsultation)?.label || 'Consultation',
                        motif: rdv.motif,
                        statut: rdv.statut,
                        dureeMinute: rdv.dureeMinute || 30
                    };
                });

                const events: EventInput[] = this.tousRdv.map(rdv => {
                    const d = new Date(rdv.date);
                    const dEnd = new Date(d);
                    dEnd.setMinutes(d.getMinutes() + rdv.dureeMinute);
                    return {
                        id: rdv.id.toString(),
                        title: `${rdv.patient} - ${rdv.motif}`,
                        start: d,
                        end: dEnd,
                        extendedProps: { ...rdv },
                        backgroundColor: rdv.statut === 'CONFIRME' ? '#10B981' : 
                                         rdv.statut === 'ANNULE' ? '#EF4444' :
                                         rdv.statut === 'TERMINE' ? '#6B7280' : 
                                         rdv.statut === 'EN_ATTENTE' ? '#F59E0B' : '#3B82F6',
                        borderColor: 'transparent'
                    };
                });
                
                this.calendarOptions = { ...this.calendarOptions, events };

                this.genererCalendrier();
                this.filtrerRdvDuJour();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les rendez-vous' });
                console.error(err);
            }
        });
    }

    handleDateSelect(selectInfo: DateSelectArg) {
        const d = selectInfo.start;
        this.dateSelectionnee = d;
        this.nouveauRdv = { 
            patientId: null, 
            date: d, 
            heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), 
            type: '', 
            motif: '' 
        };
        this.dialogVisible = true;
        this.cdr.detectChanges();
    }

    handleEventClick(clickInfo: EventClickArg) {
        this.rdvSelectionne = clickInfo.event.extendedProps;
        this.rdvDetailVisible = true;
        this.cdr.detectChanges();
    }

    handleEventDrop(dropInfo: EventDropArg) {
        this.updateRdvDate(dropInfo.event, dropInfo.revert);
    }

    handleEventResize(resizeInfo: EventResizeDoneArg) {
        this.updateRdvDate(resizeInfo.event, resizeInfo.revert);
    }

    updateRdvDate(event: EventApi, revertCb: () => void) {
        const localIsoString = new Date(event.start!.getTime() - (event.start!.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);
        const props = event.extendedProps;
        
        let duree = 30;
        if (event.end && event.start) {
            duree = Math.round((event.end.getTime() - event.start.getTime()) / 60000);
        }

        const payload = {
            tenantId: 1,
            patientId: props['patientId'],
            medecinId: this.medecinId,
            dateHeureDebut: localIsoString,
            motif: props['motif'],
            typeConsultation: props['type'],
            notesInternes: '',
            dureeMinute: duree,
            statut: props['statut']
        };

        this.appointmentService.update(props['id'], payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Planifié', detail: 'Créneau modifié avec succès' });
                this.loadRdv(); // Reload to sync
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la modification' });
                revertCb();
            }
        });
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

    selectionnerJour(jour: any) {
        if (!jour.date) return;
        this.dateSelectionnee = jour.date;
        this.genererCalendrier();
        this.filtrerRdvDuJour();
        this.cdr.detectChanges();
    }

    filtrerRdvDuJour() {
        this.rdvDuJour = this.tousRdv.filter((r) => r.date.toDateString() === this.dateSelectionnee.toDateString()).sort((a, b) => a.heure.localeCompare(b.heure));
    }

    moisPrecedent() {
        this.moisActuel = new Date(this.moisActuel.getFullYear(), this.moisActuel.getMonth() - 1, 1);
        this.genererCalendrier();
        this.cdr.detectChanges();
    }

    moisSuivant() {
        this.moisActuel = new Date(this.moisActuel.getFullYear(), this.moisActuel.getMonth() + 1, 1);
        this.genererCalendrier();
        this.cdr.detectChanges();
    }

    getNomMois(): string {
        return this.moisActuel.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }

    getDateLabel(): string {
        return this.dateSelectionnee.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    ouvrirDialogNouveauRdv() {
        this.nouveauRdv = { patientId: null, date: this.dateSelectionnee, heure: '', type: '', motif: '' };
        this.dialogVisible = true;
    }

    sauvegarderRdv() {
        if (!this.nouveauRdv.patientId || !this.nouveauRdv.heure) {
            this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Patient et heure obligatoires' });
            return;
        }

        const motifSaisi = this.nouveauRdv.motif ? this.nouveauRdv.motif.trim() : '';
        if (motifSaisi && motifSaisi.length < 3) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Le motif doit faire au moins 3 caractères' });
            return;
        }

        const dateFinale = this.nouveauRdv.date || this.dateSelectionnee;
        const [hours, minutes] = this.nouveauRdv.heure.split(':');
        const dateHeureDebut = new Date(dateFinale.getFullYear(), dateFinale.getMonth(), dateFinale.getDate(), +hours, +minutes);

        if (dateHeureDebut < new Date()) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'La date et l\'heure doivent être dans le futur' });
            return;
        }

        const localIsoString = new Date(dateHeureDebut.getTime() - (dateHeureDebut.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);

        const payload = {
            tenantId: 1,
            patientId: this.nouveauRdv.patientId,
            medecinId: this.medecinId,
            dateHeureDebut: localIsoString,
            motif: motifSaisi || 'Consultation',
            typeConsultation: this.nouveauRdv.type || 'PRESENTIELLE',
            notesInternes: ''
        };

        this.appointmentService.create(payload).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'RDV créé avec succès !' });
                this.dialogVisible = false;
                this.loadRdv(); // Recharge tout pour avoir l'ID réel et être à jour
            },
            error: (err) => {
                let msg = 'Impossible de créer le RDV';
                if (err.error) {
                    if (typeof err.error === 'string') msg = err.error;
                    else if (err.error.message) msg = err.error.message;
                    else if (err.error.errors) msg = Object.values(err.error.errors).join(', ');
                }
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg });
                console.error('Erreur API Create RDV:', err);
            }
        });
    }

    confirmerRdv(rdv: any) {
        this.appointmentService.confirmer(rdv.id).subscribe({
            next: () => {
                rdv.statut = 'CONFIRME';
                this.messageService.add({ severity: 'success', summary: 'RDV Confirmé', detail: `RDV de ${rdv.patient} confirmé` });

                const patient = this.patientsOptions.find(p => p.id === rdv.patientId);
                const email = patient ? patient.email : 'contact@patient.ma';

                this.notificationService.envoyerConfirmationRDV(
                    rdv.patientId || 1,
                    email,
                    'EMAIL',
                    rdv.date.toLocaleDateString('fr-FR') + ' à ' + rdv.heure
                ).subscribe({
                    next: () => console.log('Notification envoyée'),
                    error: (err) => console.error('Erreur notification', err)
                });
                this.cdr.detectChanges();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec confirmation' })
        });
    }

    annulerRdv(rdv: any) {
        this.appointmentService.annuler(rdv.id, "Annulé par le médecin").subscribe({
            next: () => {
                rdv.statut = 'ANNULE';
                this.genererCalendrier();
                this.filtrerRdvDuJour();
                this.messageService.add({ severity: 'info', summary: 'RDV Annulé', detail: `RDV de ${rdv.patient} annulé` });
                this.cdr.detectChanges();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec annulation' })
        });
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            CONFIRME: 'Confirmé',
            EN_ATTENTE: 'En attente',
            ANNULE: 'Annulé',
            EN_COURS: 'En cours',
            TERMINE: 'Terminé'
        };
        return map[statut] ?? statut;
    }

    protected readonly Math = Math;
}
