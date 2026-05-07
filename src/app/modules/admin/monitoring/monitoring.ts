import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-admin-monitoring',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule],
    providers: [MessageService],
    templateUrl: './monitoring.html',
    styleUrls: ['./monitoring.scss']
})
export class AdminMonitoringComponent implements OnInit, OnDestroy {
    logFiltre = 'TOUS';
    private timer: any;

    logFiltres = [
        { label: 'Tous', value: 'TOUS' },
        { label: 'Erreurs', value: 'error' },
        { label: 'Warning', value: 'warning' },
        { label: 'Info', value: 'info' }
    ];

    serveurs = [
        { id: 1, nom: 'Serveur Principal', statut: 'ok', cpu: 45, ram: 62, disque: 38, uptime: '99.9% (127j)' },
        { id: 2, nom: 'Serveur Base Données', statut: 'warning', cpu: 87, ram: 74, disque: 55, uptime: '99.7% (127j)' },
        { id: 3, nom: 'Serveur Fichiers', statut: 'ok', cpu: 23, ram: 41, disque: 81, uptime: '100% (89j)' },
        { id: 4, nom: 'Serveur Backup', statut: 'error', cpu: 0, ram: 0, disque: 0, uptime: 'HORS LIGNE' }
    ];

    logs = [
        { id: 1, time: '11:47:32', niveau: 'error', message: 'Connexion base de données échouée — retry 3/3' },
        { id: 2, time: '11:45:18', niveau: 'warning', message: 'CPU serveur BDD dépasse 85% depuis 15 minutes' },
        { id: 3, time: '11:42:05', niveau: 'info', message: 'Sauvegarde automatique démarrée — DB_backup_20260322' },
        { id: 4, time: '11:38:54', niveau: 'error', message: 'Tentatives de connexion suspectes — IP: 192.168.1.254' },
        { id: 5, time: '11:35:21', niveau: 'info', message: 'Cabinet Al Amal — 3 nouvelles consultations enregistrées' },
        { id: 6, time: '11:30:00', niveau: 'warning', message: 'Espace disque serveur fichiers < 20%' },
        { id: 7, time: '11:25:44', niveau: 'info', message: 'Mise à jour planifiée — v2.4.1 disponible' },
        { id: 8, time: '11:20:12', niveau: 'info', message: '12 utilisateurs actifs simultanément' },
        { id: 9, time: '11:15:33', niveau: 'error', message: 'Serveur Backup — connexion perdue' },
        { id: 10, time: '11:10:00', niveau: 'info', message: 'Rapport mensuel généré automatiquement' }
    ];

    apiStats = [
        { method: 'GET', endpoint: '/api/rdv/today', calls: '2,847', avgMs: 45 },
        { method: 'POST', endpoint: '/api/consultations', calls: '1,203', avgMs: 89 },
        { method: 'GET', endpoint: '/api/patients', calls: '4,521', avgMs: 32 },
        { method: 'POST', endpoint: '/api/ordonnances', calls: '867', avgMs: 156 },
        { method: 'PUT', endpoint: '/api/factures/:id', calls: '445', avgMs: 78 },
        { method: 'DELETE', endpoint: '/api/rdv/:id', calls: '123', avgMs: 245 }
    ];

    resume24h = [
        { label: 'Requêtes API', value: '124,832', icon: 'pi pi-server', color: 'blue' },
        { label: 'Erreurs', value: '47', icon: 'pi pi-exclamation-triangle', color: 'red' },
        { label: 'Uptime moyen', value: '99.7%', icon: 'pi pi-check-circle', color: 'green' },
        { label: 'Nouveaux users', value: '12', icon: 'pi pi-user-plus', color: 'orange' }
    ];

    constructor(
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadLogs();
        // Simuler mise à jour CPU en temps réel
        this.timer = setInterval(() => {
            this.serveurs[0].cpu = Math.min(100, Math.max(20, this.serveurs[0].cpu + (Math.random() > 0.5 ? 2 : -2)));
            this.serveurs[1].cpu = Math.min(100, Math.max(70, this.serveurs[1].cpu + (Math.random() > 0.5 ? 3 : -3)));
        }, 3000);
    }

    loadLogs() {
        // Notification service removed
    }

    ngOnDestroy() {
        if (this.timer) clearInterval(this.timer);
    }

    getLogsFiltres() {
        if (this.logFiltre === 'TOUS') return this.logs;
        return this.logs.filter((l) => l.niveau === this.logFiltre);
    }

    getCpuClass(val: number): string {
        if (val > 80) return 'danger';
        if (val > 60) return 'warn';
        return 'ok';
    }

    getHeure(): string {
        return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    rafraichir() {
        this.loadLogs();
        this.messageService.add({ severity: 'info', summary: 'Actualisé', detail: 'Données mises à jour' });
    }
}
