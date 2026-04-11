import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth';
import { PatientService } from '../../core/services/patient';
import { FormsModule } from '@angular/forms';

import { FloatingAiWidgetComponent } from '../../shared/components/floating-ai-widget/floating-ai-widget';

@Component({
    selector: 'app-medecin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, FormsModule, FloatingAiWidgetComponent],
    providers: [MessageService],
    templateUrl: './medecin-layout.html',
    styleUrls: ['./medecin-layout.scss']
})
export class MedecinLayoutComponent implements OnInit {
    sidebarOpen = true;

    constructor(
        public router: Router,
        public themeService: ThemeService,
        public lang: LanguageService,
        private authService: AuthService,
        private patientService: PatientService
    ) {}

    menuItems = computed(() => [
        {
            label: this.lang.translate('menu.principal'),
            items: [{ label: this.lang.translate('menu.dashboard'), icon: 'pi pi-home', route: '/medecin/dashboard' }]
        },
        {
            label: this.lang.translate('menu.medical'),
            items: [
                { label: this.lang.translate('menu.mon_agenda'), icon: 'pi pi-calendar', route: '/medecin/agenda' },
                { label: 'Salle d\'Attente', icon: 'pi pi-users', route: '/medecin/salle-attente' },
                { label: this.lang.translate('menu.mes_patients'), icon: 'pi pi-id-card', route: '/medecin/patients' },
                { label: this.lang.translate('menu.consultations'), icon: 'pi pi-heart', route: '/medecin/consultations' },
                { label: this.lang.translate('menu.dossiers'), icon: 'pi pi-folder-open', route: '/medecin/dossiers' },
                { label: this.lang.translate('menu.ordonnances'), icon: 'pi pi-file-edit', route: '/medecin/ordonnances' }
            ]
        },
        {
            label: this.lang.translate('menu.ia_analyses') || 'IA & Assistant',
            items: [
                { label: '🤖 AI Assistant', icon: 'pi pi-sparkles', route: '/medecin/ai-assistant' }
            ]
        },
        {
            label: this.lang.translate('menu.finance'),
            items: [
                { label: this.lang.translate('menu.mes_factures'), icon: 'pi pi-wallet', route: '/medecin/factures' },
                { label: 'Rapports Financiers', icon: 'pi pi-chart-line', route: '/medecin/rapports' }
            ]
        },
        {
            label: this.lang.translate('menu.parametres') || 'Paramètres',
            items: [{ label: 'Gestion des Comptes', icon: 'pi pi-users', route: '/medecin/comptes' }]
        }
    ]);

    ngOnInit() {}

    // ── Recherche Globale ──────────────────────────────────────
    searchQuery = '';
    globalSearchResults: any[] = [];
    private searchTimeout: any;

    onGlobalSearch(query: string) {
        if (!query || query.trim().length < 2) {
            this.globalSearchResults = [];
            return;
        }
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.patientService.getAll().subscribe({
                next: (patients) => {
                    const q = query.toLowerCase();
                    const filtered = patients.filter(p => 
                        (p.nom || '').toLowerCase().includes(q) || 
                        (p.prenom || '').toLowerCase().includes(q) ||
                        (p.cin || '').toLowerCase().includes(q)
                    ).slice(0, 5);
                    
                    this.globalSearchResults = filtered.map(p => ({
                        id: p.id,
                        type: 'Patient',
                        title: p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim(),
                        desc: `CIN: ${p.cin || 'N/A'} - Tél: ${p.telephone || 'N/A'}`,
                        icon: 'pi pi-user',
                        route: '/medecin/patients'
                    }));

                    if (this.globalSearchResults.length === 0) {
                        this.globalSearchResults = [{
                            id: -1, type: 'Info', title: 'Aucun résultat trouvé',
                            desc: 'Vérifiez l\'orthographe', icon: 'pi pi-info-circle', route: ''
                        }];
                    }
                },
                error: () => this.globalSearchResults = []
            });
        }, 300);
    }

    openResult(res: any) {
        if (res.id === -1) return;
        this.globalSearchResults = [];
        this.searchQuery = '';
        this.router.navigate([res.route]);
    }

    // ── Fin Recherche Globale ──────────────────────────────────

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
        if (!u) return 'DR';
        const p = u.firstName ? u.firstName[0] : '';
        const n = u.lastName ? u.lastName[0] : '';
        return (p + n).toUpperCase() || 'DR';
    }

    get userNameFull(): string {
        const u = this.currentUser;
        if (!u) return 'Dr. Inconnu';
        return `Dr. ${u.firstName || ''} ${u.lastName || ''}`.trim();
    }

    get userNameShort(): string {
        const u = this.currentUser;
        if (!u) return 'Dr. Inconnu';
        const p = u.firstName ? u.firstName[0] + '.' : '';
        return `Dr. ${p} ${u.lastName || ''}`.trim();
    }

    goToProfile() {
        this.router.navigate(['/medecin/comptes']);
    }
}
