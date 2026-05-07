import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

@Component({
    selector: 'app-sec-rendez-vous',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule, FullCalendarModule],
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

    // ── Jours fermés / congés ──────────────────────────────
    /** Stocke les dates fermées au format 'YYYY-MM-DD' */
    joursFermes: Set<string> = new Set();

    dialogVisible = false;
    detailVisible = false; // 👈 Nouvelle visibilité pour le détail
    rdvSelectionne: any = null; // 👈 Stocke le RDV cliqué
    rdvEnModification: any = null;

    // ── FullCalendar configuration ──
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
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '08:00',
            endTime: '19:00'
        },
        selectConstraint: 'businessHours',
        eventConstraint: 'businessHours',
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
        events: []
    };

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

    heureOptions = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
    ].map((h) => ({ label: h, value: h }));

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
        private authService: AuthService,
        private userAdminService: UserAdminService,
        private cdr: ChangeDetectorRef
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
                this.chargerJoursFermes();
            },
            error: () => console.warn('Impossible de charger le médecin associé')
        });
    }

    chargerJoursFermes() {
        if (!this.medecinAssocie) return;
        this.appointmentService.getClosedDays(this.medecinAssocie.id).subscribe({
            next: (dates: string[]) => {
                // ✅ Backend = source de vérité : on utilise UNIQUEMENT les dates du backend
                // (ne pas fusionner avec localStorage pour éviter que les jours "rouverts" restent fermés)
                this.joursFermes = new Set(dates);
                // Mettre à jour le cache local avec les données fraîches
                localStorage.setItem(`joursFermes_med_${this.medecinAssocie.id}`, JSON.stringify(dates));
                this.updateCalendarEvents();
                this.genererCalendrier(); // 👈 Recalculer la grille du mini-calendrier
            },
            error: () => {
                // Fallback uniquement si le backend est inaccessible
                const saved = localStorage.getItem(`joursFermes_med_${this.medecinAssocie.id}`);
                if (saved) {
                    const localDates = JSON.parse(saved);
                    localDates.forEach((d: string) => this.joursFermes.add(d));
                this.updateCalendarEvents();
                this.genererCalendrier();
                }
            }
        });
    }

    sauvegarderJoursFermes() {
        if (!this.medecinAssocie) return;
        localStorage.setItem(`joursFermes_med_${this.medecinAssocie.id}`, JSON.stringify(Array.from(this.joursFermes)));
    }

    loadRdv() {
        const currentUser = this.authService.getCurrentUser();
        const mId = currentUser?.medecinId;

        const appointments$ = mId 
            ? this.appointmentService.getByMedecin(mId)
            : this.appointmentService.getAll();

        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            rdvs: appointments$.pipe(catchError(() => of([])))
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
                    let np = pInfo.nomComplet || `${pInfo.prenom || ''} ${pInfo.nom || ''}`.trim() || `Patient ${r.patientId}`;

                    // ── Extraction pour Patient Public / Invité / Dossier Absent ────────
                    let phone = pInfo.telephone || '';
                    let email = pInfo.email || '';

                    // ── Extraction pour Patient Public / Invité / Dossier Absent ────────
                    if (r.notesInternes && (r.notesInternes.includes('PATIENT PUBLIC:') || r.notesInternes.includes('RDV INVITE:') || r.notesInternes.includes('Nom:'))) {
                        const matchNom = r.notesInternes.match(/Nom:\s*([^\n\r]*)/i);
                        if (matchNom && matchNom[1] && matchNom[1].trim()) {
                            np = matchNom[1].trim();
                        }
                        const matchTel = r.notesInternes.match(/Tel:\s*([^\n\r]*)/i);
                        if (matchTel && matchTel[1]) phone = matchTel[1].trim();
                        
                        const matchEmail = r.notesInternes.match(/Email:\s*([^\n\r]*)/i);
                        if (matchEmail && matchEmail[1]) email = matchEmail[1].trim();
                    }

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
                        telephone: phone,
                        email: email,
                        patientEmail: pInfo.email || email,
                        initiales: initials,
                        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), // Midnight
                        heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        duree: diffMins > 0 ? diffMins : 30,
                        type: r.typeConsultation || 'Consultation',
                        medecin: mName,
                        motif: r.motif || '',
                        notesInternes: r.notesInternes || '',
                        statut: r.statut || 'EN_ATTENTE'
                    };
                });

                this.updateCalendarEvents();

                this.updateMedecinCounts();
                this.genererCalendrier();
                this.filtrerRdv();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les RDV' });
                this.tousRdv = [];
                this.updateCalendarEvents();
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

    updateCalendarEvents() {
        if (!this.tousRdv) return;

        const events: EventInput[] = [];
        this.tousRdv.forEach(r => {
            try {
                const dStart = new Date(r.date);
                let h = 8, m = 0;
                if (r.heure && typeof r.heure === 'string' && r.heure.includes(':')) {
                    const parts = r.heure.split(':').map(Number);
                    h = parts[0] || 0;
                    m = parts[1] || 0;
                }
                dStart.setHours(h, m, 0, 0);
                const dEnd = new Date(dStart.getTime() + (r.duree || 30) * 60000);

                events.push({
                    id: (r.id || Math.random()).toString(),
                    title: `${r.patient || 'Patient'} (${r.type || 'RDV'})`,
                    start: dStart,
                    end: dEnd,
                    extendedProps: { ...r },
                    backgroundColor: r.statut === 'CONFIRME' ? '#10B981' : 
                                     r.statut === 'ANNULE' ? '#EF4444' :
                                     r.statut === 'ARRIVE' ? '#7C3AED' :
                                     r.statut === 'EN_ATTENTE' ? '#F59E0B' : '#3B82F6',
                    borderColor: 'transparent'
                });
            } catch (e) {
                console.error('Erreur mapping rdv', r, e);
            }
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
        this.cdr.detectChanges();
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

    toDateKey(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    estJourAutorise(date: Date | string): boolean {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return false;
        const jourSemaine = d.getDay();
        if (jourSemaine === 0 || jourSemaine === 6) return false; // Weekend
        if (this.joursFermes.has(this.toDateKey(d))) return false; // Congé
        return true;
    }

    getJourBloqueRaison(date: Date | string): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'Date invalide';
        const jourSemaine = d.getDay();
        if (jourSemaine === 0 || jourSemaine === 6) return 'Le cabinet est fermé le week-end.';
        if (this.joursFermes.has(this.toDateKey(d))) return 'Ce jour est marqué comme fermé (Congé).';
        return 'Jour non disponible.';
    }

    genererTimeline() {
        const heures = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
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

    // ── FullCalendar Event Handlers ──
    handleDateSelect(selectInfo: DateSelectArg) {
        const d = selectInfo.start;
        if (!this.estJourAutorise(d)) {
            const raison = this.getJourBloqueRaison(d);
            this.messageService.add({ severity: 'warn', summary: 'Jour non disponible', detail: raison });
            return;
        }
        this.dateSelectionnee = d;
        this.ouvrirNouveauRdv(d);
    }

    handleEventClick(clickInfo: EventClickArg) {
        this.rdvSelectionne = clickInfo.event.extendedProps;
        this.detailVisible = true;
    }

    handleEventDrop(dropInfo: EventDropArg) {
        const event = dropInfo.event;
        const props = event.extendedProps;
        
        // Update logic for drag & drop
        const payload = {
            patientId: props['patientId'],
            medecinId: this.medecinAssocie?.id || 2,
            dateHeureDebut: event.start!.toISOString(),
            dateHeureFin: event.end?.toISOString() || new Date(event.start!.getTime() + 30 * 60000).toISOString(),
            motif: props['motif'],
            typeConsultation: props['type'],
            statut: props['statut']
        };

        this.appointmentService.update(props['id'], payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Mis à jour', detail: 'RDV déplacé' });
                this.loadRdv();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec du déplacement' });
                dropInfo.revert();
            }
        });
    }

    selectionnerJour(jour: any) {
        if (!jour.date) return;
        this.dateSelectionnee = jour.date;
        this.genererCalendrier();
        this.filtrerRdv();
        this.updateMedecinCounts();

        if (!this.estJourAutorise(jour.date)) {
            const raison = this.getJourBloqueRaison(jour.date);
            this.messageService.add({ severity: 'info', summary: 'Information', detail: raison });
        }
    }

    toggleJourFerme(jour: any) {
        if (!jour.date || jour.estWeekend || !this.medecinAssocie) return;
        const key = this.toDateKey(jour.date);
        
        this.appointmentService.toggleClosedDay(this.medecinAssocie.id, key).subscribe({
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
                this.genererCalendrier(); // 👈 Recalculer la grille
            },
            error: () => {
                this.messageService.add({ severity: 'warn', summary: 'Mode Hors-ligne', detail: 'Sauvegarde locale uniquement (Backend non disponible)' });
                if (this.joursFermes.has(key)) {
                    this.joursFermes.delete(key);
                } else {
                    this.joursFermes.add(key);
                }
                this.sauvegarderJoursFermes();
                this.updateCalendarEvents();
                this.genererCalendrier(); // 👈 Recalculer la grille
            }
        });
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

    ouvrirNouveauRdv(prefillDate?: any) {
        try {
            let d = this.dateSelectionnee;
            let heureStr = '';
            
            if (prefillDate && typeof prefillDate.getHours === 'function') {
                d = prefillDate;
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                heureStr = `${hh}:${mm}`;
                
                if (!this.heureOptions.find(o => o.value === heureStr) && heureStr !== '00:00') {
                    this.heureOptions = [...this.heureOptions, { label: heureStr, value: heureStr }]
                        .sort((a, b) => a.value.localeCompare(b.value));
                }
                if (heureStr === '00:00') {
                    heureStr = ''; 
                }
            }

            if (!this.estJourAutorise(d)) {
                const raison = this.getJourBloqueRaison(d);
                this.messageService.add({ severity: 'warn', summary: 'Jour non disponible', detail: raison });
                return;
            }
            this.rdvEnModification = null;
            
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;

            this.formRdv = { 
                patient: '',
                patientId: null, 
                medecin: '',
                medecinId: this.medecinAssocie?.id || '', 
                type: '', 
                date: dateStr, 
                heure: heureStr, 
                duree: 30, 
                motif: '', 
                note: '' 
            };
            this.dialogVisible = true;
            this.cdr.detectChanges();
        } catch (e) {
            console.error(e);
            this.dialogVisible = true;
            this.cdr.detectChanges();
        }
    }

    ouvrirModification(rdv: any) {
        this.rdvEnModification = rdv;
        this.detailVisible = false; // Fermer le détail si ouvert
        
        let dStr = '';
        if (rdv.date instanceof Date) {
            dStr = rdv.date.toISOString().split('T')[0];
        } else if (typeof rdv.date === 'string') {
            dStr = rdv.date.split('T')[0];
        } else {
            dStr = new Date().toISOString().split('T')[0];
        }

        this.formRdv = { 
            ...rdv, 
            date: dStr,
            patientId: rdv.patientId,
            medecinId: this.medecinAssocie?.id || 2,
            type: rdv.type === 'Consultation' ? 'PRESENTIELLE' : rdv.type // Mapping simple
        };
        this.dialogVisible = true;
    }

    formatLocalISOString(d: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
            dateHeureDebut: this.formatLocalISOString(dDebut),
            dateHeureFin: this.formatLocalISOString(dFin),
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
