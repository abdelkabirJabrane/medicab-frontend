import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { HttpClient } from '@angular/common/http';
import { PublicService, PublicDoctor } from '../../../core/services/public.service';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SafeUrlPipe } from '../../../core/pipes/safe-url.pipe';

// ── URL directe vers appointment-service (bypass intercept d'auth) ──
const APPT_BASE = environment.services.appointments;          // http://localhost:8082/api/appointments
const APPT_PUBLIC = `${APPT_BASE}/public`;

@Component({
  selector: 'app-public-rdv',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DialogModule, InputTextModule, ToastModule, FullCalendarModule, SafeUrlPipe],
  providers: [MessageService],
  templateUrl: './public-rdv.html',
  styleUrls: ['./public-rdv.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PublicRdvComponent implements OnInit {

  @ViewChild('calendar') calendarCmp!: FullCalendarComponent;

  doctorSlug = '';
  doctor: PublicDoctor | null = null;
  loading = true;
  erreurChargement = false;

  /** Tous les RDV non annulés du médecin */
  tousRdv: any[] = [];
  /** Jours fermés en format YYYY-MM-DD */
  joursFermes: Set<string> = new Set();

  dialogVisible = false;
  enregistrement = false;
  nouveauRdv: any = { 
    date: null, 
    heure: '', 
    motif: 'Consultation',
    nomPatient: '',
    telephone: '',
    email: ''
  };

  /** Gestion du reveal du téléphone */
  phoneRevealed = false;

  /** Date du jour pour le template */
  today = new Date();

  /** Dialogue de choix d'authentification */
  authDialogVisible = false;
  authMode: 'login' | 'register' = 'login';
  isGuest = false; 

  // Données de connexion
  loginData = { username: '', password: '' };
  
  // Données d'inscription (NEW)
  registerData = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'ROLE_PATIENT'
  };

  loggingIn = false;
  registering = false;

  // ─── FullCalendar Options ────────────────────────────────────────────
  calendarOptions: CalendarOptions = this.buildOptions([]);

  constructor(
    private route: ActivatedRoute,
    public authService: AuthService,
    private http: HttpClient,
    private messageService: MessageService,
    public router: Router,
    private publicService: PublicService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.doctorSlug = params.get('slug') || '';
      const m = this.doctorSlug.match(/(\d+)/);
      const id = m ? +m[1] : null;
      if (!id) { this.router.navigate(['/search']); return; }
      this.loadPage(id);
    });
  }

  // ─── Chargement parallèle profil + jours fermés + RDV ───────────────
  loadPage(medecinId: number) {
    this.loading = true;
    this.erreurChargement = false;

    const profil$ = this.publicService.searchDoctors('', '', '', '').pipe(catchError(() => of([])));
    const closed$ = this.http.get<string[]>(`${APPT_PUBLIC}/closed-days?medecinId=${medecinId}`).pipe(catchError(() => of([])));
    const rdvs$   = this.http.get<any[]>(`${APPT_PUBLIC}/medecin/${medecinId}`).pipe(catchError(() => of([])));

    forkJoin({ profil: profil$, closed: closed$, rdvs: rdvs$ }).subscribe({
      next: ({ profil, closed, rdvs }) => {
        // Profil médecin
        const found = (profil as PublicDoctor[]).find(d => d.id === medecinId);
        this.doctor = found ?? {
          id: medecinId, slug: this.doctorSlug,
          firstName: '', lastName: 'Médecin', specialite: 'Praticien',
          address: '', slots: {},
          profileImageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=300&h=300&auto=format&fit=crop'
        };

        // Fallback si l'image du profil chargé est vide ou invalide
        if (!this.doctor.profileImageUrl || this.doctor.profileImageUrl.includes('placeholder.png')) {
          this.doctor.profileImageUrl = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=300&h=300&auto=format&fit=crop';
        }

        // Jours fermés
        this.joursFermes = new Set(closed as string[]);

        // RDV (sans annulés)
        this.tousRdv = (rdvs as any[]).filter(r => r.statut !== 'ANNULE');

        this.rebuildCalendar();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.erreurChargement = true; this.cdr.detectChanges(); }
    });
  }

  // ─── Reconstruction complète des options FullCalendar ───────────────
  rebuildCalendar() {
    const events: EventInput[] = [];

    // 1. RDV occupés → blocs gris "🔒 Indisponible"
    this.tousRdv.forEach(rdv => {
      const start = new Date(rdv.dateHeureDebut);
      const end   = rdv.dateHeureFin ? new Date(rdv.dateHeureFin) : new Date(start.getTime() + 30 * 60000);
      events.push({
        id: `rdv-${rdv.id}`,
        title: '🔒 Indisponible',
        start, end,
        backgroundColor: '#e2e8f0',
        textColor: '#94a3b8',
        borderColor: '#cbd5e1',
        display: 'block',
        extendedProps: { type: 'rdv' }
      });
    });

    // 2. Jours fermés → fond rouge sur toute la plage horaire
    this.joursFermes.forEach(dateStr => {
      events.push({
        id: `closed-bg-${dateStr}`,
        title: '🚫 Cabinet fermé',
        start: `${dateStr}T08:00:00`,
        end:   `${dateStr}T19:00:00`,
        display: 'background',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        extendedProps: { type: 'closed' }
      });
    });

    // 3. Week-ends → Bloquer visuellement Samedi et Dimanche
    // On ajoute des événements de fond récurrents pour chaque Samedi (6) et Dimanche (0)
    events.push({
      daysOfWeek: [0, 6], // Dimanche et Samedi
      startTime: '08:00:00',
      endTime: '19:00:00',
      display: 'background',
      backgroundColor: 'rgba(148, 163, 184, 0.12)', // Gris ardoise léger pour le weekend
      title: 'Week-end'
    });

    // Capture locale pour les callbacks
    const joursFermes = this.joursFermes;
    const tousRdv     = this.tousRdv;

    this.calendarOptions = this.buildOptions(events, joursFermes, tousRdv);
    this.cdr.detectChanges();
  }

  // ─── Fabrique une CalendarOptions fraîche ───────────────────────────
  private buildOptions(
    events: EventInput[],
    joursFermes: Set<string> = new Set(),
    tousRdv: any[]           = []
  ): CalendarOptions {
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      initialDate: new Date(),
      firstDay: 1,
      nowIndicator: true,
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
      locale: frLocale,
      slotMinTime: '08:00:00',
      slotMaxTime: '19:00:00',
      slotDuration: '00:30:00',
      allDaySlot: false,
      editable: false,
      selectable: true,
      selectMirror: true,
      weekends: true,
      events,
      // ── Coloration des colonnes de jours fermés + week-end ──
      dayCellClassNames: (arg) => {
        const key = this.toDateKey(arg.date);
        const day = arg.date.getDay();
        const css: string[] = [];
        if (day === 0 || day === 6)   css.push('fc-day-weekend-blocked');
        if (joursFermes.has(key))     css.push('fc-day-ferme');
        return css;
      },
      // ── Autorisation de sélection ──
      selectAllow: (info) => this.estAutorise(info.start, info.end, joursFermes, tousRdv),
      // ── Handler de sélection ──
      select: (info) => this.handleSelect(info, joursFermes, tousRdv)
    };
  }

  // ─── Vérifie si un créneau est sélectionnable ───────────────────────
  estAutorise(start: Date, end: Date, joursFermes: Set<string>, tousRdv: any[]): boolean {
    const day = start.getDay();
    if (day === 0 || day === 6) return false;
    if (joursFermes.has(this.toDateKey(start))) return false;
    const sMs = start.getTime(), eMs = end.getTime();
    return !tousRdv.some(rdv => {
      const rs = new Date(rdv.dateHeureDebut).getTime();
      const re = rdv.dateHeureFin ? new Date(rdv.dateHeureFin).getTime() : rs + 30 * 60000;
      return sMs < re && eMs > rs;
    });
  }

  handleSelect(info: DateSelectArg, joursFermes: Set<string>, tousRdv: any[]) {
    // 1. Vérification de disponibilité classique
    if (!this.estAutorise(info.start, info.end, joursFermes, tousRdv)) {
      this.messageService.add({
        severity: 'warn', summary: 'Créneau indisponible',
        detail: joursFermes.has(this.toDateKey(info.start))
          ? '🚫 Ce jour est fermé par le médecin.'
          : '🔒 Ce créneau est déjà réservé.'
      });
      return;
    }

    // 2. Préparation du RDV (Capturer la date/heure immédiatement)
    const currentUser = this.authService.getCurrentUser();
    this.nouveauRdv = {
      date: info.start,
      heure: info.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      motif: 'Consultation',
      nomPatient: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '',
      telephone: currentUser?.phoneNumber || '',
      email: currentUser?.email || ''
    };

    // 3. VÉRIFICATION DE CONNEXION AVANT D'OUVRIR LE DIALOGUE
    if (!this.authService.isLoggedIn() && !this.isGuest) {
      this.authMode = 'login'; // Reset au mode login par défaut
      this.authDialogVisible = true;
      this.cdr.detectChanges();
      return;
    }

    this.dialogVisible = true;
    this.cdr.detectChanges();
  }

  /** Exécuter le login directement depuis la popup */
  loginFromPopup() {
    if (!this.loginData.username || !this.loginData.password) return;
    
    this.loggingIn = true;
    this.authService.login(this.loginData.username, this.loginData.password).subscribe({
      next: () => {
        this.loggingIn = false;
        this.authDialogVisible = false;
        this.messageService.add({ severity: 'success', summary: 'Connecté', detail: 'Identité vérifiée.' });
        
        // Mettre à jour les infos patient dans le RDV
        const user = this.authService.getCurrentUser();
        if (user) {
            this.nouveauRdv.nomPatient = `${user.firstName} ${user.lastName}`;
            this.nouveauRdv.telephone = user.phoneNumber;
            this.nouveauRdv.email = user.email;
        }

        // On rouvre automatiquement le dialogue de confirmation
        this.dialogVisible = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loggingIn = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Identifiants incorrects.' });
      }
    });
  }

  /** Inscription directe depuis la popup */
  registerFromPopup() {
    if (!this.registerData.username || !this.registerData.password || !this.registerData.email || !this.registerData.firstName || !this.registerData.lastName) {
      this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Veuillez remplir toutes les informations (Nom, Prénom, Email, etc.).' });
      return;
    }

    this.registering = true;
    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Compte créé', detail: 'Identifiants générés avec succès.' });
        // Après inscription, on connecte automatiquement l'utilisateur
        this.authService.login(this.registerData.username, this.registerData.password).subscribe({
          next: () => {
             this.registering = false;
             this.authDialogVisible = false;
             
             // Mettre à jour les infos patient dans le RDV
             const user = this.authService.getCurrentUser();
             if (user) {
                 this.nouveauRdv.nomPatient = `${user.firstName} ${user.lastName}`;
                 this.nouveauRdv.telephone = user.phoneNumber;
                 this.nouveauRdv.email = user.email;
             }
             
             this.dialogVisible = true; // On ouvre le choix du motif
             this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.registering = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer le compte.' });
      }
    });
  }

  /** Passer en mode invité */
  continueAsGuest() {
    this.isGuest = true;
    this.authDialogVisible = false;
    this.dialogVisible = true;
    this.cdr.detectChanges();
  }

  /** Alias FR pour le template */
  continuerSansCompte() {
    this.continueAsGuest();
  }

  setAuthMode(mode: 'login' | 'register') {
    this.authMode = mode;
    this.cdr.detectChanges();
  }

  sauvegarderRdv() {
    // 1. Vérifier la session ou le mode invité
    const isConnected = this.authService.isLoggedIn();
    
    if (!isConnected && !this.isGuest) {
      this.authDialogVisible = true;
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    // 2. Validation des champs (obligatoires en mode Guest)
    if (!this.nouveauRdv.nomPatient?.trim() || this.nouveauRdv.nomPatient.trim().length < 3) {
       this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Nom et prénom obligatoires.' });
       return;
    }
    
    if (!isConnected && (!this.nouveauRdv.telephone || this.nouveauRdv.telephone.length < 8)) {
        this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Téléphone obligatoire pour les invités.' });
        return;
    }
    
    if (!this.nouveauRdv.motif?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Le motif est obligatoire.' });
      return;
    }

    try {
      this.enregistrement = true;
      const d: Date = this.nouveauRdv.date;
      if (!d) {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Date de rendez-vous invalide.' });
        this.enregistrement = false;
        return;
      }
      
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

      const notes = `RDV INVITE:\nNom: ${this.nouveauRdv.nomPatient}\nTel: ${this.nouveauRdv.telephone}\nEmail: ${this.nouveauRdv.email}\nMotif: ${this.nouveauRdv.motif}`;

      const payload = {
        tenantId: this.doctor?.tenantId || 1, 
        patientId: isConnected ? currentUser?.id : 1, 
        medecinId: this.doctor?.id,
        dateHeureDebut: iso,
        motif: this.nouveauRdv.motif.trim(),
        typeConsultation: 'PRESENTIELLE',
        notesInternes: notes
      };

      console.log('📤 Envoi réservation:', payload);

      this.http.post<any>(APPT_BASE, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: '✅ RDV confirmé', detail: 'C\'est enregistré !' });
          this.dialogVisible = false;
          this.enregistrement = false;
          this.isGuest = false; 
          
          if (isConnected) {
              setTimeout(() => this.router.navigate(['/patient/dashboard']), 1500);
          } else {
              setTimeout(() => window.location.reload(), 1500);
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur réservation:', err);
          this.enregistrement = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de réserver. ' + (err.error?.message || err.message || '') });
        }
      });
    } catch (e: any) {
      console.error('💥 Crash local sauvegarderRdv:', e);
      this.enregistrement = false;
      this.messageService.add({ severity: 'error', summary: 'Erreur locale', detail: e.message });
    }
  }

  toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  revealPhone() {
    this.phoneRevealed = true;
    this.cdr.detectChanges();
  }

  openGoogleMaps(address: string, city: string = '') {
    const fullAddress = `${address}${city ? ', ' + city : ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    window.open(url, '_blank');
  }
}
