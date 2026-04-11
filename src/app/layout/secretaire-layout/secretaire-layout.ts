import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification';
import { AuthService } from '../../core/services/auth';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PatientService } from '../../core/services/patient';
import { AppointmentService } from '../../core/services/appointment';

import { FloatingAiWidgetComponent } from '../../shared/components/floating-ai-widget/floating-ai-widget';

@Component({
    selector: 'app-secretaire-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, DialogModule, FormsModule, InputTextModule, ButtonModule, FloatingAiWidgetComponent],
    providers: [MessageService],
    templateUrl: './secretaire-layout.html',
    styleUrls: ['./secretaire-layout.scss']
})
export class SecretaireLayoutComponent implements OnInit {
    sidebarOpen = true;
    nbEnAttente = 0;
    nbNotifs = 0;

    // Quick Action States
    showQuickAction = false;
    quickSearch = '';
    searchResults: any[] = [];
    isCreatingPatient = false;
    quickPatient = { nom: '', prenom: '', telephone: '' };
    quickAppoint = { date: '', heure: '', motif: 'Consultation', type: 'PRESENTIELLE' };

    constructor(
        public router: Router,
        public themeService: ThemeService,
        private notificationService: NotificationService,
        private authService: AuthService,
        private patientService: PatientService,
        private appointmentService: AppointmentService,
        private messageService: MessageService
    ) {}

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        // ALT + N
        if (event.altKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            this.openQuickAction();
        }
    }

    openQuickAction() {
        this.resetQuickAction();
        this.showQuickAction = true;
    }

    resetQuickAction() {
        this.quickSearch = '';
        this.searchResults = [];
        this.isCreatingPatient = false;
        this.quickPatient = { nom: '', prenom: '', telephone: '' };
        
        // Date par défaut : maintenant
        const now = new Date();
        this.quickAppoint = { 
            date: now.toISOString().split('T')[0], 
            heure: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
            motif: 'Consultation rapide',
            type: 'PRESENTIELLE'
        };
    }

    onSearch() {
        if (this.quickSearch.length < 2) {
            this.searchResults = [];
            return;
        }
        this.patientService.search(this.quickSearch).subscribe(res => {
            this.searchResults = res;
        });
    }

    selectPatient(p: any) {
        this.quickPatient.nom = p.nom;
        this.quickPatient.prenom = p.prenom;
        this.isCreatingPatient = false; // Il existe déjà
        this.searchResults = [];
        this.quickSearch = `${p.nom} ${p.prenom}`;
        (this.quickPatient as any)['id'] = p.id;
    }

    validateQuickAction() {
        const user = this.authService.getCurrentUser();
        if (!user?.medecinId && user?.roles?.includes('SECRETAIRE')) {
             // Logic check
        }

        if (this.isCreatingPatient) {
            // Créer patient d'abord
            this.patientService.create(this.quickPatient as any).subscribe(savedP => {
                this.createAppointment(savedP.id);
            });
        } else {
            const pId = (this.quickPatient as any)['id'];
            if (pId) {
                this.createAppointment(pId);
            } else {
                this.messageService.add({severity:'warn', summary:'Info', detail:'Veuillez sélectionner ou créer un patient'});
            }
        }
    }

    private createAppointment(patientId: number) {
        const user = this.authService.getCurrentUser();
        
        // Construction de la date locale ISO sans timezone (Y-m-dTH:M:S)
        const [hours, minutes] = this.quickAppoint.heure.split(':');
        const [year, month, day] = this.quickAppoint.date.split('-').map(Number);
        const d = new Date(year, month - 1, day, +hours, +minutes);
        
        // Format YYYY-MM-DDTHH:mm:ss
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);
        
        const dto = {
            patientId,
            medecinId: user?.medecinId || 2, // Priorité au médecin associé ou fallback 2 (test)
            dateHeureDebut: localIso,
            typeConsultation: this.quickAppoint.type || 'PRESENTIELLE',
            statut: 'EN_ATTENTE',
            motif: this.quickAppoint.motif || 'RDV Rapide (Tel)',
            dureeMinute: 30,
            notesInternes: 'Créé via Action Rapide'
        };

        this.appointmentService.create(dto as any).subscribe({
            next: () => {
                this.messageService.add({severity:'success', summary:'Succès', detail:'Rendez-vous enregistré'});
                this.showQuickAction = false;
                this.loadCounters();
            },
            error: (err) => {
                const errorDetail = err.error?.message || err.error || 'Erreur inconnue';
                this.messageService.add({severity:'error', summary:'Erreur API', detail: errorDetail});
                console.error('API Error:', err);
            }
        });
    }

    menuItems = [
        {
            label: 'PRINCIPAL',
            items: [{ label: 'Dashboard', icon: 'pi pi-home', route: '/secretaire/dashboard', badge: null }]
        },
        {
            label: 'GESTION',
            items: [
                { label: 'Rendez-vous', icon: 'pi pi-calendar', route: '/secretaire/rendez-vous', badge: null },
                { label: 'Patients', icon: 'pi pi-users', route: '/secretaire/patients', badge: null },
                { label: "Salle d'attente", icon: 'pi pi-clock', route: '/secretaire/salle-attente', badge: 4 },
                { label: 'Facturation', icon: 'pi pi-wallet', route: '/secretaire/facturation', badge: null },
                { label: 'Numérisation', icon: 'pi pi-print', route: '/secretaire/scanner', badge: 4 },
                { label: 'Communications', icon: 'pi pi-bell', route: '/secretaire/notifications', badge: null }
            ]
        },
        {
            label: 'PARAMÈTRES',
            items: [
                { label: 'Mon Profil', icon: 'pi pi-user-edit', route: '/secretaire/comptes', badge: null }
            ]
        }
    ];

    ngOnInit() {
        this.loadCounters();
    }

    loadCounters() {
        this.notificationService.count().subscribe({
            next: (res) => this.nbNotifs = res,
            error: (err) => console.warn('Erreur counters:', err)
        });
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
    }

    isActive(route: string): boolean {
        return this.router.url.startsWith(route);
    }

    logout() {
        this.authService.logout();
    }

    get currentUser() {
        return this.authService.getCurrentUser();
    }

    get userInitials(): string {
        const u = this.currentUser;
        if (!u) return 'SE';
        const p = u.firstName ? u.firstName[0] : '';
        const n = u.lastName ? u.lastName[0] : '';
        return (p + n).toUpperCase() || 'SE';
    }

    get userNameFull(): string {
        const u = this.currentUser;
        if (!u) return 'Secrétaire';
        return `${u.firstName || ''} ${u.lastName || ''}`.trim();
    }

    get userNameShort(): string {
        const u = this.currentUser;
        if (!u) return 'Secrétaire';
        const p = u.firstName ? u.firstName[0] + '.' : '';
        return `${p} ${u.lastName || ''}`.trim() || 'Secrétaire';
    }

    goToProfile() {
        // Optionnel : s'il y a un compte pour la secrétaire
        this.router.navigate(['/secretaire/comptes']).catch(() => {
            console.warn("La route /secretaire/comptes n'existe pas encore");
        });
    }
}
