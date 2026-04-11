import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './app/core/guards/auth.guard';

export const appRoutes: Routes = [
    // ── Default → Login ───────────────────
    {
        path: '',
        redirectTo: '/auth/login',
        pathMatch: 'full'
    },

    // ── Auth ──────────────────────────────
    {
        path: 'auth',
        loadChildren: () => import('./app/pages/auth/auth.routes')
    },

    // ── Médecin ───────────────────────────
    {
        path: 'medecin',
        loadComponent: () => import('./app/layout/medecin-layout/medecin-layout').then((c) => c.MedecinLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ROLE_MEDECIN', 'ROLE_SUPER_ADMIN'] },
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./app/modules/medecin/dashboard/dashboard').then((c) => c.DashboardComponent) },
            { path: 'agenda', loadComponent: () => import('./app/modules/medecin/agenda/agenda').then((c) => c.AgendaComponent) },
            { path: 'patients', loadComponent: () => import('./app/modules/medecin/patients/patients').then((c) => c.PatientsComponent) },
            { path: 'consultations', loadComponent: () => import('./app/modules/medecin/consultations/consultations').then((c) => c.ConsultationsComponent) },
            { path: 'dossiers', loadComponent: () => import('./app/modules/medecin/dossiers/dossiers').then((c) => c.DossiersComponent) },
            { path: 'ordonnances', loadComponent: () => import('./app/modules/medecin/ordonnances/ordonnances').then((c) => c.OrdonnancesComponent) },
            { path: 'factures', loadComponent: () => import('./app/modules/medecin/factures/factures').then((c) => c.FacturesComponent) },
            { path: 'rapports', loadComponent: () => import('./app/modules/medecin/rapports/rapports.component').then((c) => c.RapportsComponent) },
            { path: 'salle-attente', loadComponent: () => import('./app/modules/medecin/salle-attente/salle-attente').then((c) => c.SalleAttenteComponent) },
            { path: 'comptes', loadComponent: () => import('./app/modules/medecin/comptes/comptes').then((c) => c.ComptesComponent) },
            { path: 'ai-assistant', loadComponent: () => import('./app/modules/ai-assistant/med-agent/med-agent').then((c) => c.MedAgentComponent) }
        ]
    },

    // ── Secrétaire ────────────────────────
    {
        path: 'secretaire',
        loadComponent: () => import('./app/layout/secretaire-layout/secretaire-layout').then((c) => c.SecretaireLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ROLE_SECRETAIRE', 'ROLE_SUPER_ADMIN'] },
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./app/modules/secretaire/dashboard/dashboard').then((c) => c.SecretaireDashboardComponent) },
            { path: 'rendez-vous', loadComponent: () => import('./app/modules/secretaire/rendez-vous/rendez-vous').then((c) => c.SecRendezVousComponent) },
            { path: 'patients', loadComponent: () => import('./app/modules/secretaire/patients/patients').then((c) => c.SecPatientsComponent) },
            { path: 'salle-attente', loadComponent: () => import('./app/modules/secretaire/salle-attente/salle-attente').then((c) => c.SalleAttenteComponent) },
            { path: 'facturation', loadComponent: () => import('./app/modules/secretaire/facturation/facturation').then((c) => c.FacturationComponent) },
            { path: 'scanner', loadComponent: () => import('./app/modules/secretaire/scanner/scanner').then((c) => c.ScannerComponent) },
            { path: 'notifications', loadComponent: () => import('./app/modules/secretaire/notifications/notifications').then((c) => c.NotificationsComponent) },
            { path: 'comptes', loadComponent: () => import('./app/modules/secretaire/comptes/comptes').then((c) => c.SecComptesComponent) }
        ]
    },

    // ── Admin (Super Admin) ──────────────
    {
        path: 'admin',
        loadComponent: () => import('./app/layout/admin-layout/admin-layout').then((c) => c.AdminLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ROLE_SUPER_ADMIN'] },
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./app/modules/admin/dashboard/dashboard').then((c) => c.AdminDashboardComponent) },
            { path: 'cabinets', loadComponent: () => import('./app/modules/admin/cabinets/cabinets').then((c) => c.AdminCabinetsComponent) },
            { path: 'utilisateurs', loadComponent: () => import('./app/modules/admin/utilisateurs/utilisateurs').then((c) => c.AdminUtilisateursComponent) },
            { path: 'abonnements', loadComponent: () => import('./app/modules/admin/abonnements/abonnements').then((c) => c.AdminAbonnementsComponent) },
            { path: 'monitoring', loadComponent: () => import('./app/modules/admin/monitoring/monitoring').then((c) => c.AdminMonitoringComponent) },
            { path: 'profil', loadComponent: () => import('./app/modules/admin/profil/profil').then((c) => c.AdminProfilComponent) }
        ]
    },

    {
        path: 'api-test',
        loadComponent: () =>
            import('./app/core/services/api-test.component')
                .then(c => c.ApiTestComponent)
    },

    // ── 404 ──────────────────────────────
    {
        path: 'notfound',
        loadComponent: () => import('./app/pages/notfound/notfound').then((c) => c.Notfound)
    },
    {
        path: '**',
        redirectTo: '/auth/login'
    }
];
