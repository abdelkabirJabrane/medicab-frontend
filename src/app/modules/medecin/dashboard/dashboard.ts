import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ThemeService } from '../../../core/services/theme.service';
import { PatientService } from '../../../core/services/patient';
import { AppointmentService } from '../../../core/services/appointment';
import { BillingService } from '../../../core/services/billing';
import { AuthService } from '../../../core/services/auth';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
    themeService = inject(ThemeService);
    patientService = inject(PatientService);
    appointmentService = inject(AppointmentService);
    billingService = inject(BillingService);
    authService = inject(AuthService);
    cdr = inject(ChangeDetectorRef);

    get nomMedecin(): string {
        const u = this.authService.getCurrentUser();
        if (!u) return 'Dr. ALAMI';
        return `Dr. ${u.lastName || ''}`.trim() || 'Dr. ALAMI';
    }

    // ── Écoute les changements de thème ──────────
    private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    private themeObserver: MutationObserver | null = null;

    kpis = [
        { titre: 'Total Patients', valeur: '1,247', icon: 'pi pi-users', colorKey: 'blue', tendance: '+12 ce mois', positif: true },
        { titre: "RDV Aujourd'hui", valeur: '24', icon: 'pi pi-calendar', colorKey: 'orange', tendance: '8 confirmés', positif: true },
        { titre: 'CA Mensuel', valeur: '18,450 MAD', icon: 'pi pi-money-bill', colorKey: 'green', tendance: '+8% vs dernier mois', positif: true },
        { titre: "Liste d'attente", valeur: '5', icon: 'pi pi-clock', colorKey: 'purple', tendance: '2 urgences', positif: false }
    ];

    rdvDuJour = [
        { id: 1, patient: 'Ahmed BENALI', initiales: 'AB', heure: '09:00', type: 'Consultation', statut: 'CONFIRME', motif: 'Fièvre persistante' },
        { id: 2, patient: 'Fatima ALAMI', initiales: 'FA', heure: '09:30', type: 'Contrôle', statut: 'EN_ATTENTE', motif: 'Suivi tension' },
        { id: 3, patient: 'Omar TAZI', initiales: 'OT', heure: '10:00', type: 'Téléconsultation', statut: 'CONFIRME', motif: 'Résultats analyses' },
        { id: 4, patient: 'Sara IDRISSI', initiales: 'SI', heure: '10:30', type: 'Urgence', statut: 'ANNULE', motif: 'Douleurs abdominales' },
        { id: 5, patient: 'Karim MANSOURI', initiales: 'KM', heure: '11:00', type: 'Suivi', statut: 'CONFIRME', motif: 'Diabète type 2' }
    ];

    activiteRecente = [
        { icon: 'pi pi-check-circle', color: '#059669', bg: '#ECFDF5', texte: 'Consultation terminée — Ahmed BENALI', temps: 'Il y a 30 min' },
        { icon: 'pi pi-file-edit', color: '#2563eb', bg: '#EFF6FF', texte: 'Ordonnance créée — Fatima ALAMI', temps: 'Il y a 1h' },
        { icon: 'pi pi-user-plus', color: '#7c3aed', bg: '#F5F3FF', texte: 'Nouveau patient — Hassan TAZI', temps: 'Il y a 2h' },
        { icon: 'pi pi-money-bill', color: '#d97706', bg: '#FFFBEB', texte: 'Paiement reçu — 200 MAD', temps: 'Il y a 3h' }
    ];

    caChartData: any;
    caChartOptions: any;

    typeChartData: any;
    typeChartOptions: any;

    tauxChartData: any;
    tauxChartOptions: any;

    allFactures: any[] = [];
    allRdvs: any[] = [];

    ngOnInit() {
        this.initChart();
        this.loadDashboardData();

        // Observer les changements de classe sur <html> pour re-générer le chart
        this.themeObserver = new MutationObserver(() => {
            this.initChart();
        });

        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    ngOnDestroy() {
        this.themeObserver?.disconnect();
    }

    getDateAujourdhui(): string {
        return new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    initChart() {
        const dark = this.themeService.isDark();

        const textColor = dark ? '#9BAAC5' : '#8A95B0';
        const gridColor = dark ? 'rgba(42,58,85,.6)' : 'rgba(148,163,184,.1)';

        // 1. Graphique linéaire CA sur 30 jours
        const labels30J = Array.from({length: 30}, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (29 - i));
            return d.getDate() + '/' + (d.getMonth() + 1);
        });
        
        let dataCA = new Array(30).fill(0);
        const now = new Date();
        this.allFactures.forEach(f => {
            const d = f.dateEmission ? new Date(f.dateEmission) : (f.dateCreation ? new Date(f.dateCreation) : null);
            if (d) {
                const diffTime = now.getTime() - d.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays < 30) {
                    const idx = 29 - diffDays;
                    dataCA[idx] += (f.montantPaye || 0);
                }
            }
        });

        this.caChartData = {
            labels: labels30J,
            datasets: [{
                label: 'Chiffre d\'Affaires (MAD)',
                data: dataCA,
                fill: true,
                borderColor: dark ? '#3B82F6' : '#2563EB',
                backgroundColor: dark ? 'rgba(59,130,246, 0.1)' : 'rgba(37,99,235, 0.1)',
                tension: 0.4,
                pointRadius: 0
            }]
        };

        this.caChartOptions = {
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { color: textColor, maxTicksLimit: 7 }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        };

        // 2. Bar chart consultations par type
        let cptRoutine = 0, cptUrgence = 0, cptSuivi = 0, cptTele = 0;
        this.allRdvs.forEach(r => {
             if (r.statut !== 'ANNULE') {
                 if (r.typeConsultation === 'Urgence') cptUrgence++;
                 else if (r.typeConsultation === 'Suivi') cptSuivi++;
                 else if (r.typeConsultation === 'Téléconsultation') cptTele++;
                 else cptRoutine++;
             }
        });

        // Si zéro données pour pas avoir un chart vide
        if (cptRoutine === 0 && cptUrgence === 0 && cptSuivi === 0 && cptTele === 0) cptRoutine = 1;

        this.typeChartData = {
            labels: ['Routine', 'Urgence', 'Suivi', 'Téléconsultation'],
            datasets: [{
                label: 'Consultations',
                backgroundColor: [
                    dark ? '#3B82F6' : '#2563EB',
                    dark ? '#EF4444' : '#DC2626',
                    dark ? '#10B981' : '#059669',
                    dark ? '#8B5CF6' : '#7C3AED'
                ],
                borderRadius: 4,
                data: [cptRoutine, cptUrgence, cptSuivi, cptTele]
            }]
        };

        this.typeChartOptions = {
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: dark ? '#1A2235' : '#fff', titleColor: dark ? '#E8EDF5' : '#0D1B3E', bodyColor: dark ? '#9BAAC5' : '#4A5878' }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        };

        // 3. Taux d'occupation (Doughnut)
        const todayStr = new Date().toISOString().split('T')[0];
        const rdvsToday = this.allRdvs.filter(r => r.dateHeureDebut && r.dateHeureDebut.startsWith(todayStr) && r.statut !== 'ANNULE');
        const maxCapacity = 20; // Hypothétique: 20 slots/jour
        const occupied = rdvsToday.length;
        const free = Math.max(0, maxCapacity - occupied);

        this.tauxChartData = {
            labels: ['Occupé', 'Libre'],
            datasets: [{
                data: [occupied || 1, free || 1],
                backgroundColor: [
                    dark ? '#10B981' : '#059669',
                    dark ? '#374151' : '#E5E7EB'
                ],
                borderWidth: 0,
                cutout: '75%'
            }]
        };

        this.tauxChartOptions = {
            plugins: {
                legend: { display: true, position: 'bottom', labels: { color: textColor, usePointStyle: true, boxWidth: 8 } }
            }
        };
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

    loadDashboardData() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            rdvs: this.appointmentService.getAll().pipe(catchError(() => of([]))),
            factures: this.billingService.getAll().pipe(catchError(() => of([])))
        }).subscribe(res => {
            const totalPatients = res.patients.length;
            const patientsMap = new Map<number, string>();
            res.patients.forEach(p => patientsMap.set(p.id, p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${p.id}`));

            // Store globally for charts
            this.allFactures = res.factures;
            this.allRdvs = res.rdvs;

            // Mettre à jour les charts avec les vraies données
            this.initChart();

            // RDV du jour
            const todayStr = new Date().toISOString().split('T')[0];
            const rdvsToday = res.rdvs.filter(r => r.dateHeureDebut && r.dateHeureDebut.startsWith(todayStr));
            
            this.rdvDuJour = rdvsToday.map(r => {
                let nom = patientsMap.get(r.patientId) || `Patient ${r.patientId}`;

                // ── Extraction pour Patient Public / Invité / Dossier Absent ────────
                if (r.notesInternes && (r.notesInternes.includes('PATIENT PUBLIC:') || r.notesInternes.includes('RDV INVITE:') || r.notesInternes.includes('Nom:'))) {
                    const match = r.notesInternes.match(/Nom:\s*([^\n\r]*)/i);
                    if (match && match[1] && match[1].trim()) {
                        nom = match[1].trim();
                    }
                }

                let initials = nom.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                if (!initials) initials = 'PI';
                return {
                    id: r.id,
                    patient: nom,
                    initiales: initials,
                    heure: new Date(r.dateHeureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    type: r.typeConsultation || 'Consultation',
                    statut: r.statut || 'EN_ATTENTE',
                    motif: r.motif
                };
            }).sort((a, b) => a.heure.localeCompare(b.heure));

            const enAttente = rdvsToday.filter(r => r.statut !== 'CONFIRME' && r.statut !== 'ANNULE' && r.statut !== 'TERMINE').length;

            // CA Mensuel
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            let caMensuel = 0;
            res.factures.forEach(f => {
                const d = f.dateEmission ? new Date(f.dateEmission) : (f.dateCreation ? new Date(f.dateCreation) : null);
                if (d && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    caMensuel += (f.montantPaye || 0);
                }
            });

            this.kpis = [
                { titre: 'Total Patients', valeur: totalPatients.toString(), icon: 'pi pi-users', colorKey: 'blue', tendance: 'Actifs', positif: true },
                { titre: "RDV Aujourd'hui", valeur: rdvsToday.length.toString(), icon: 'pi pi-calendar', colorKey: 'orange', tendance: `${rdvsToday.filter(r => r.statut === 'CONFIRME').length} confirmés`, positif: true },
                { titre: 'CA Mensuel', valeur: `${caMensuel} MAD`, icon: 'pi pi-money-bill', colorKey: 'green', tendance: 'Encaissé ce mois', positif: true },
                { titre: "Liste d'attente", valeur: enAttente.toString(), icon: 'pi pi-clock', colorKey: 'purple', tendance: "Aujourd'hui", positif: enAttente === 0 }
            ];

            // Activité
            let activites: any[] = [];
            const sortedFactures = [...res.factures].sort((a,b) => b.id - a.id).slice(0, 3);
            sortedFactures.forEach(f => {
                if(f.montantPaye > 0) {
                   activites.push({ timestamp: new Date(f.dateCreation || Date.now()).getTime(), type: 'facture', obj: f });
                }
            });
            const sortedPatients = [...res.patients].sort((a,b) => b.id - a.id).slice(0, 3);
            sortedPatients.forEach(p => {
                activites.push({ timestamp: new Date(p.dateCreation || Date.now()).getTime(), type: 'patient', obj: p });
            });

            activites.sort((a,b) => b.timestamp - a.timestamp);
            const dark = this.themeService.isDark();
            
            this.activiteRecente = activites.slice(0, 4).map(a => {
                if (a.type === 'facture') return { icon: 'pi pi-money-bill', color: dark ? '#FBBF24' : '#d97706', bg: dark ? 'rgba(251,191,36,.15)' : '#FFFBEB', texte: `Paiement reçu — ${a.obj.montantPaye} MAD`, temps: 'Récemment' };
                if (a.type === 'patient') {
                   const nom = a.obj.nomComplet || `${a.obj.prenom || ''} ${a.obj.nom || ''}`.trim() || `Patient ${a.obj.id}`;
                   return { icon: 'pi pi-user-plus', color: dark ? '#A78BFA' : '#7c3aed', bg: dark ? 'rgba(167,139,250,.15)' : '#F5F3FF', texte: `Nouveau patient — ${nom}`, temps: 'Récemment' };
                }
                return { icon: 'pi pi-info', color: '#888', bg: '#eee', texte: 'Action', temps: '' };
            });
            // Assure qu'on a un min
            if(this.activiteRecente.length === 0) {
                this.activiteRecente = [{ icon: 'pi pi-check', color: dark ? '#10B981' : '#059669', bg: dark ? 'rgba(16,185,129,.15)' : '#ECFDF5', texte: 'Prêt à travailler', temps: 'Maintenant' }];
            }

            this.cdr.markForCheck();
        });
    }
}
