import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CabinetService } from '../../core/services/cabinet';
import { UserAdminService } from '../../core/services/user-admin';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth';

import { FloatingAiWidgetComponent } from '../../shared/components/floating-ai-widget/floating-ai-widget';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, FormsModule, FloatingAiWidgetComponent],
    providers: [MessageService],
    templateUrl: './admin-layout.html',
    styleUrls: ['./admin-layout.scss']
})
export class AdminLayoutComponent implements OnInit {
    sidebarOpen = true;
    currentUser = computed(() => this.authService.getCurrentUser());

    // OmniSearch State
    searchQuery = '';
    searchResults: any[] = [];
    isSearching = false;

    constructor(
        public router: Router,
        public themeService: ThemeService,
        private authService: AuthService,
        private cabinetService: CabinetService,
        private userAdminService: UserAdminService
    ) {}

    onGlobalSearch() {
        if (!this.searchQuery || this.searchQuery.length < 2) {
            this.searchResults = [];
            return;
        }

        const query = this.searchQuery.toLowerCase();
        this.isSearching = true;

        forkJoin({
            cabinets: this.cabinetService.getAll().pipe(catchError(() => of([]))),
            users: this.userAdminService.getAll().pipe(catchError(() => of([])))
        }).subscribe(res => {
            const results: any[] = [];

            // Rechercher dans les cabinets
            const filteredCabs = res.cabinets.filter(c => 
                c.nom.toLowerCase().includes(query) || 
                (c.ville && c.ville.toLowerCase().includes(query))
            );
            filteredCabs.forEach(c => {
                results.push({
                    type: 'CABINET',
                    title: c.nom,
                    subtitle: `${c.ville || '—'} • ${c.plan}`,
                    icon: 'pi pi-building',
                    route: '/admin/cabinets',
                    id: c.id
                });
            });

            // Rechercher dans les médecins
            const filteredMedecins = res.users.filter(u => 
                u.roles.includes('ROLE_MEDECIN') && (
                    (u.firstName + ' ' + u.lastName).toLowerCase().includes(query) ||
                    u.email.toLowerCase().includes(query)
                )
            );
            filteredMedecins.forEach(m => {
                results.push({
                    type: 'MEDECIN',
                    title: `${m.firstName} ${m.lastName}`,
                    subtitle: `Médecin • ${m.email}`,
                    icon: 'pi pi-user',
                    route: '/admin/utilisateurs',
                    id: m.id
                });
            });

            this.searchResults = results.slice(0, 8); // Limiter à 8 résultats
            this.isSearching = false;
        });
    }

    goToResult(res: any) {
        this.searchQuery = '';
        this.searchResults = [];
        this.router.navigate([res.route], { queryParams: { id: res.id } });
    }

    menuItems = [
        {
            label: 'PRINCIPAL',
            items: [{ label: 'Dashboard', icon: 'pi pi-home', route: '/admin/dashboard', badge: null, badgeColor: '' }]
        },
        {
            label: 'GESTION',
            items: [
                { label: 'Cabinets', icon: 'pi pi-building', route: '/admin/cabinets', badge: null, badgeColor: '' },
                { label: 'Utilisateurs', icon: 'pi pi-users', route: '/admin/utilisateurs', badge: null, badgeColor: '' },
                { label: 'Abonnements', icon: 'pi pi-credit-card', route: '/admin/abonnements', badge: '3', badgeColor: 'orange' }
            ]
        },
        {
            label: 'SYSTÈME',
            items: [{ label: 'Monitoring', icon: 'pi pi-chart-line', route: '/admin/monitoring', badge: '2', badgeColor: 'red' }]
        },
        {
            label: 'PARAMÈTRES',
            items: [{ label: 'Mon Profil', icon: 'pi pi-user', route: '/admin/profil', badge: null, badgeColor: '' }]
        }
    ];

    ngOnInit() {}

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
    }
    isActive(route: string): boolean {
        return this.router.url.startsWith(route);
    }
    getInitials(user: any): string {
        if (!user) return 'SA';
        return (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
    }

    logout() {
        this.authService.logout();
    }
}
