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
import { AuthService } from '../../../core/services/auth';
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

    // ── Jours fermés / congés ──────────────────────────────
    /** Stocke les dates fermées au format 'YYYY-MM-DD' */
    joursFermes: Set<string> = new Set();
    montrerAideConge = false;

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
        // ── Bloquer weekends dans FullCalendar ──
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5],  // Lun–Ven uniquement
            startTime: '08:00',
            endTime: '19:00'
        },
        selectConstraint: 'businessHours',
        eventConstraint: 'businessHours',
        weekends: true,  // Afficher mais bloqués
        selectAllow: (selectInfo) => {
            return this.estJourAutorise(selectInfo.start);
        },
        dayCellClassNames: (arg) => {
            const key = this.toDateKey(arg.date);
            const isWeekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;
            const isFerme  = this.joursFermes.has(key);
            const classes: string[] = [];
            if (isWeekend) classes.push('fc-day-weekend-blocked');
            if (isFerme)   classes.push('fc-day-ferme');
            return classes;
        },
        select: this.handleDateSelect.bind(this),
        eventClick: this.handleEventClick.bind(this),
        eventDrop: this.handleEventDrop.bind(this),
        eventResize: this.handleEventResize.bind(this),
        events: []
    };

    medecinId = 0; // Initialisé dynamiquement depuis AuthService
    patientsOptions: any[] = [];

    nouveauRdv: any = { patientId: null, date: null, heure: '', type: '', motif: '' };

    typeOptions = [
        { label: 'Consultation', value: 'PRESENTIELLE' },
        { label: 'Téléconsultation', value: 'TELECONSULTATION' },
        { label: 'Contrôle', value: 'CONTROLE' },
        { label: 'Urgence', value: 'URGENCE' },
        { label: 'Suivi', value: 'SUIVI' }
    ];

    heureOptions = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
    ].map((h) => ({ label: h, value: h }));

    joursMois: any[] = [];
    joursNoms = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    constructor(
        private messageService: MessageService,
        private appointmentService: AppointmentService,
        private patientService: PatientService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        // ── Récupérer le vrai ID du médecin connecté ──────────────
        const user = this.authService.getCurrentUser();
        if (user?.id) {
            this.medecinId = user.id;
        }
        this.loadPatients();
        this.chargerJoursFermes();
    }

    chargerJoursFermes() {
        this.appointmentService.getClosedDays(this.medecinId).subscribe({
            next: (dates: string[]) => {
                // ✅ Backend = source de vérité : données fraîches uniquement
                this.joursFermes = new Set(dates);
                // Synchroniser le cache local
                localStorage.setItem(`joursFermes_med_${this.medecinId}`, JSON.stringify(dates));
                this.updateCalendarEvents();
                this.cdr.detectChanges();
            },
            error: () => {
                console.warn('Backend indisponible pour les jours fermés, passage en local');
                const saved = localStorage.getItem(`joursFermes_med_${this.medecinId}`);
                if (saved) {
                    const localDates = JSON.parse(saved);
                    localDates.forEach((d: string) => this.joursFermes.add(d));
                    this.updateCalendarEvents();
                    this.cdr.detectChanges();
                }
            }
        });
    }

    sauvegarderJoursFermes() {
        // Cette méthode devient obsolète car on sauvegarde via toggleBackend
        localStorage.setItem(`joursFermes_med_${this.medecinId}`, JSON.stringify(Array.from(this.joursFermes)));
    }

    loadPatients() {
        this.patientService.getAll().subscribe({
            next: (data) => {
                this.patientsOptions = data.map(p => ({
                    id: p.id,
                    nomComplet: p.nomComplet || `${p.prenom} ${p.nom}`,
                    email: p.email || '',
                    telephone: p.telephone || ''
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
        this.appointmentService.getByMedecin(this.medecinId).subscribe({
            next: (data) => {
                this.tousRdv = data.map(rdv => {
                    const patObj = this.patientsOptions.find(p => p.id === rdv.patientId);
                    let realName = rdv.patientNom || (patObj ? patObj.nomComplet : 'Patient Inconnu');
                    let phone = patObj?.telephone || '';
                    let email = patObj?.email || '';

                    // ── Extraction pour Patient Public / Invité / Dossier Absent ────────
                    if (rdv.notesInternes && (rdv.notesInternes.includes('PATIENT PUBLIC:') || rdv.notesInternes.includes('RDV INVITE:') || rdv.notesInternes.includes('Nom:'))) {
                        const matchNom = rdv.notesInternes.match(/Nom:\s*([^\n\r]*)/i);
                        if (matchNom && matchNom[1] && matchNom[1].trim()) {
                            realName = matchNom[1].trim();
                        }
                        const matchTel = rdv.notesInternes.match(/Tel:\s*([^\n\r]*)/i);
                        if (matchTel && matchTel[1]) phone = matchTel[1].trim();
                        
                        const matchEmail = rdv.notesInternes.match(/Email:\s*([^\n\r]*)/i);
                        if (matchEmail && matchEmail[1]) email = matchEmail[1].trim();
                    }

                    return {
                        id: rdv.id,
                        patientId: rdv.patientId || 1,
                        patient: realName,
                        telephone: phone,
                        email: email,
                        tenantId: rdv.tenantId, 
                        initiales: (realName === 'Patient Inconnu' ? '??' : realName)
                                     .split(' ')
                                     .map((n: string) => n[0] || '')
                                     .filter((n: string) => !!n)
                                     .join('')
                                     .toUpperCase()
                                     .substring(0, 2),
                        date: new Date(rdv.dateHeureDebut),
                        heure: new Date(rdv.dateHeureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        type: rdv.typeConsultation || 'PRESENTIELLE',
                        typeLabel: this.typeOptions.find(t => t.value === rdv.typeConsultation)?.label || 'Consultation',
                        motif: rdv.motif,
                        notesInternes: rdv.notesInternes,
                        statut: rdv.statut,
                        dureeMinute: rdv.dureeMinute || 30
                    };
                });

                this.updateCalendarEvents();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger vos rendez-vous' });
                console.error(err);
                this.tousRdv = [];
                this.updateCalendarEvents();
            }
        });
    }

    handleDateSelect(selectInfo: DateSelectArg) {
        const d = selectInfo.start;
        if (!this.estJourAutorise(d)) {
            const raison = this.getJourBloqueRaison(d);
            this.messageService.add({ severity: 'warn', summary: 'Jour non disponible', detail: raison });
            return;
        }
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
            this.joursMois.push({ numero: null, date: null, rdvCount: 0, estAujourdhui: false, estSelectionne: false, estWeekend: false, estFerme: false });
        }

        const today = new Date();
        for (let j = 1; j <= dernierJour.getDate(); j++) {
            const date = new Date(annee, mois, j);
            const jourSemaine = date.getDay(); // 0=Dim, 6=Sam
            const estWeekend = jourSemaine === 0 || jourSemaine === 6;
            const estFerme = this.joursFermes.has(this.toDateKey(date));
            const rdvCount = this.tousRdv.filter((r) => r.date.toDateString() === date.toDateString()).length;
            this.joursMois.push({
                numero: j,
                date,
                rdvCount,
                estAujourdhui: date.toDateString() === today.toDateString(),
                estSelectionne: date.toDateString() === this.dateSelectionnee.toDateString(),
                estWeekend,
                estFerme
            });
        }
    }

    selectionnerJour(jour: any) {
        if (!jour.date) return;
        if (jour.estWeekend) {
            this.messageService.add({ severity: 'info', summary: 'Week-end', detail: 'Le cabinet est fermé le week-end.' });
            return;
        }
        this.dateSelectionnee = jour.date;
        this.genererCalendrier();
        this.filtrerRdvDuJour();
        this.cdr.detectChanges();
    }

    updateCalendarEvents() {
        if (!this.tousRdv) return;
        
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

        // Background events pour les jours fermés
        this.joursFermes.forEach(dateStr => {
            events.push({
                start: dateStr,
                allDay: true,
                display: 'background',
                classNames: ['fc-day-ferme']
            });
        });

        this.calendarOptions = { ...this.calendarOptions, events };
        this.genererCalendrier();
    }

    // ── Gestion jours fermés / congés ───────────────────────
    toDateKey(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    toggleJourFerme(jour: any) {
        if (!jour.date || jour.estWeekend) return;
        const key = this.toDateKey(jour.date);
        
        this.appointmentService.toggleClosedDay(this.medecinId, key).subscribe({
            next: () => {
                if (this.joursFermes.has(key)) {
                    this.joursFermes.delete(key);
                    this.messageService.add({ severity: 'success', summary: 'Cabinet ouvert', detail: `Le ${jour.date.toLocaleDateString('fr-FR')} est de nouveau disponible` });
                } else {
                    this.joursFermes.add(key);
                    this.messageService.add({ severity: 'warn', summary: 'Cabinet fermé', detail: `Le ${jour.date.toLocaleDateString('fr-FR')} est marqué comme fermé` });
                }
                this.sauvegarderJoursFermes(); // Backup local
                this.updateCalendarEvents();
                this.cdr.detectChanges();
            },
            error: () => {
                this.messageService.add({ severity: 'warn', summary: 'Mode Hors-ligne', detail: 'Sauvegarde locale uniquement (Backend non disponible)' });
                // Fallback local
                if (this.joursFermes.has(key)) {
                    this.joursFermes.delete(key);
                } else {
                    this.joursFermes.add(key);
                }
                this.sauvegarderJoursFermes();
                this.updateCalendarEvents();
                this.cdr.detectChanges();
            }
        });
    }

    estJourAutorise(date: Date): boolean {
        const jourSemaine = date.getDay();
        if (jourSemaine === 0 || jourSemaine === 6) return false; // Weekend
        if (this.joursFermes.has(this.toDateKey(date))) return false; // Congé
        return true;
    }

    getJourBloqueRaison(date: Date): string {
        const jourSemaine = date.getDay();
        if (jourSemaine === 0 || jourSemaine === 6) return 'Le cabinet est fermé le week-end (samedi et dimanche).';
        if (this.joursFermes.has(this.toDateKey(date))) return 'Ce jour est marqué comme congé ou cabinet fermé.';
        return 'Ce jour n\'est pas disponible.';
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
        if (!this.estJourAutorise(this.dateSelectionnee)) {
            const raison = this.getJourBloqueRaison(this.dateSelectionnee);
            this.messageService.add({ severity: 'warn', summary: 'Jour non disponible', detail: raison });
            return;
        }
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
