import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-api-test',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div style="font-family:monospace;
                padding:2rem;
                background:#0f172a;
                min-height:100vh;
                color:#e2e8f0">

            <h1 style="color:#60a5fa;
                    font-size:1.5rem;
                    margin-bottom:2rem">
                🧪 MedGest — API Test
            </h1>

            <!-- Statuts services -->
            <div style="display:grid;
                    grid-template-columns:repeat(3,1fr);
                    gap:1rem;
                    margin-bottom:2rem">

                @for (test of tests; track test.name) {
                    <div style="padding:1rem;
                         border-radius:8px;
                         border:1px solid"
                         [style.border-color]="
                    test.status === 'OK' ? '#059669'
                    : test.status === 'ERROR' ? '#dc2626'
                    : '#334155'"
                         [style.background]="
                    test.status === 'OK'
                    ? 'rgba(5,150,105,0.1)'
                    : test.status === 'ERROR'
                    ? 'rgba(220,38,38,0.1)'
                    : 'rgba(51,65,85,0.5)'">

                        <div style="display:flex;
                             align-items:center;
                             gap:0.5rem;
                             margin-bottom:0.5rem">
                    <span style="font-size:1.2rem">
                        {{ test.status === 'OK' ? '✅'
                        : test.status === 'ERROR'
                            ? '❌' : '⏳' }}
                    </span>
                            <span style="font-weight:700;
                                  color:#f1f5f9">
                        {{ test.name }}
                    </span>
                        </div>

                        <div style="font-size:0.75rem;
                             color:#94a3b8">
                            Port: {{ test.port }}
                        </div>

                        <div style="font-size:0.75rem;
                             margin-top:0.25rem"
                             [style.color]="
                        test.status === 'OK'
                        ? '#34d399'
                        : test.status === 'ERROR'
                        ? '#f87171' : '#94a3b8'">
                            {{ test.message }}
                        </div>

                        @if (test.count !== null) {
                            <div style="font-size:0.85rem;
                             color:#60a5fa;
                             margin-top:0.5rem;
                             font-weight:600">
                                {{ test.count }} enregistrements
                            </div>
                        }

                    </div>
                }
            </div>

            <!-- Patients -->
            @if (patients.length > 0) {
                <div style="margin-bottom:2rem">
                    <h2 style="color:#34d399; margin-bottom:1rem">
                        👤 Patients ({{ patients.length }})
                    </h2>
                    <table style="width:100%;
                           border-collapse:collapse;
                           font-size:0.8rem">
                        <thead>
                        <tr style="background:#1e293b">
                            <th style="padding:0.5rem;
                                    text-align:left;
                                    color:#94a3b8">ID</th>
                            <th style="padding:0.5rem;
                                    text-align:left;
                                    color:#94a3b8">Nom</th>
                            <th style="padding:0.5rem;
                                    text-align:left;
                                    color:#94a3b8">CIN</th>
                            <th style="padding:0.5rem;
                                    text-align:left;
                                    color:#94a3b8">
                                Téléphone</th>
                            <th style="padding:0.5rem;
                                    text-align:left;
                                    color:#94a3b8">
                                Statut</th>
                        </tr>
                        </thead>
                        <tbody>
                            @for (p of patients; track p.id) {
                                <tr style="border-top:1px solid #1e293b">
                                    <td style="padding:0.5rem;
                                    color:#60a5fa">
                                        #{{ p.id }}
                                    </td>
                                    <td style="padding:0.5rem;
                                    color:#f1f5f9;
                                    font-weight:600">
                                        {{ p.prenom }} {{ p.nom }}
                                    </td>
                                    <td style="padding:0.5rem;
                                    color:#94a3b8">
                                        {{ p.cin }}
                                    </td>
                                    <td style="padding:0.5rem;
                                    color:#94a3b8">
                                        {{ p.telephone }}
                                    </td>
                                    <td style="padding:0.5rem">
                            <span [style.color]="
                                p.actif
                                ? '#34d399' : '#f87171'">
                                {{ p.actif
                                ? '✅ Actif'
                                : '❌ Inactif' }}
                            </span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }

            <!-- RDV -->
            @if (rdvs.length > 0) {
                <div style="margin-bottom:2rem">
                    <h2 style="color:#60a5fa; margin-bottom:1rem">
                        📅 RDV ({{ rdvs.length }})
                    </h2>
                    <div style="display:flex;
                         flex-wrap:wrap; gap:0.5rem">
                        @for (rdv of rdvs; track rdv.id) {
                            <div style="padding:0.75rem;
                             background:#1e293b;
                             border-radius:8px;
                             min-width:200px;
                             border:1px solid #334155">
                                <div style="color:#f1f5f9;
                                 font-weight:600;
                                 font-size:0.85rem">
                                    Patient #{{ rdv.patientId }}
                                </div>
                                <div style="color:#94a3b8;
                                 font-size:0.75rem;
                                 margin-top:0.25rem">
                                    {{ rdv.dateHeureDebut }}
                                </div>
                                <div style="font-size:0.75rem;
                                 margin-top:0.25rem"
                                     [style.color]="
                            rdv.statut === 'CONFIRME'
                            ? '#34d399'
                            : rdv.statut === 'ANNULE'
                            ? '#f87171' : '#fbbf24'">
                                    {{ rdv.statut }}
                                </div>
                            </div>
                        }
                    </div>
                </div>
            }

            <!-- Stats factures -->
            @if (facturesStats.total > 0) {
                <div style="margin-bottom:2rem">
                    <h2 style="color:#fbbf24; margin-bottom:1rem">
                        💰 Facturation
                    </h2>
                    <div style="display:flex; gap:1rem">
                        <div style="padding:1rem;
                             background:#1e293b;
                             border-radius:8px;
                             border:1px solid #059669">
                            <div style="color:#94a3b8;
                                 font-size:0.75rem">
                                Total
                            </div>
                            <div style="color:#34d399;
                                 font-size:1.5rem;
                                 font-weight:800">
                                {{ facturesStats.total }}
                            </div>
                        </div>
                        <div style="padding:1rem;
                             background:#1e293b;
                             border-radius:8px;
                             border:1px solid #2563eb">
                            <div style="color:#94a3b8;
                                 font-size:0.75rem">
                                Encaissé
                            </div>
                            <div style="color:#60a5fa;
                                 font-size:1.5rem;
                                 font-weight:800">
                                {{ facturesStats.encaisse }} MAD
                            </div>
                        </div>
                        <div style="padding:1rem;
                             background:#1e293b;
                             border-radius:8px;
                             border:1px solid #dc2626">
                            <div style="color:#94a3b8;
                                 font-size:0.75rem">
                                Impayé
                            </div>
                            <div style="color:#f87171;
                                 font-size:1.5rem;
                                 font-weight:800">
                                {{ facturesStats.impaye }} MAD
                            </div>
                        </div>
                    </div>
                </div>
            }

            <!-- Logs -->
            <div>
                <h2 style="color:#a78bfa; margin-bottom:1rem">
                    📋 Logs
                </h2>
                <div style="background:#1e293b;
                         border-radius:8px;
                         padding:1rem;
                         font-size:0.75rem;
                         max-height:250px;
                         overflow-y:auto">
                    @for (log of logs; track $index) {
                        <div style="padding:0.2rem 0"
                             [style.color]="
                    log.includes('✅') ? '#34d399'
                    : log.includes('❌') ? '#f87171'
                    : '#94a3b8'">
                            {{ log }}
                        </div>
                    }
                </div>
            </div>

        </div>
    `
})
export class ApiTestComponent implements OnInit {

    // ── Données ──────────────────────────────
    tests: any[] = [
        {
            name: 'Patient Service',
            port: '8083',
            status: 'LOADING',
            message: 'Test en cours...',
            count: null
        },
        {
            name: 'Appointment Service',
            port: '8082',
            status: 'LOADING',
            message: 'Test en cours...',
            count: null
        },
        {
            name: 'Medical Record Service',
            port: '8084',
            status: 'LOADING',
            message: 'Test en cours...',
            count: null
        },
        {
            name: 'Billing Service',
            port: '8085',
            status: 'LOADING',
            message: 'Test en cours...',
            count: null
        },
        {
            name: 'Notification Service',
            port: '8086',
            status: 'LOADING',
            message: 'Test en cours...',
            count: null
        }
    ];

    patients: any[] = [];
    rdvs: any[] = [];
    facturesStats = {
        total: 0,
        encaisse: 0,
        impaye: 0
    };
    logs: string[] = [];

    // ── URLs directes ─────────────────────────
    private readonly PATIENT_URL =
        'http://localhost:8083/api/patients';
    private readonly APPOINTMENT_URL =
        'http://localhost:8082/api/appointments';
    private readonly DOSSIER_URL =
        'http://localhost:8084/api/dossiers';
    private readonly BILLING_URL =
        'http://localhost:8085/api/factures';
    private readonly NOTIF_URL =
        'http://localhost:8086/api/notifications';
    private readonly TENANT_ID = 1;

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.addLog('🚀 Démarrage des tests API...');
        this.testPatients();
        this.testAppointments();
        this.testMedicalRecords();
        this.testBilling();
        this.testNotifications();
    }

    private addLog(msg: string): void {
        const time = new Date()
            .toLocaleTimeString('fr-FR');
        this.logs.unshift(`[${time}] ${msg}`);
    }



    testPatients(): void {
        this.addLog('📡 Test patient-service...');
        console.log('🔵 [Patient] URL appelée:',
            `http://localhost:8083/api/patients?tenantId=1`
        );

        this.http.get<any[]>(
            `${this.PATIENT_URL}?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (data: any[]) => {
                console.log('✅ [Patient] Réponse reçue:',
                    data);
                console.log('✅ [Patient] Nombre:',
                    data.length);
                console.log('✅ [Patient] Premier:',
                    data[0]);

                this.patients = data;
                this.tests[0].status = 'OK';
                this.tests[0].count = data.length;
                this.tests[0].message =
                    'Connexion réussie !';
                this.addLog(
                    `✅ Patients: ${data.length} trouvés`
                );
            },
            error: (err: any) => {
                console.error('❌ [Patient] Erreur:',
                    err);
                console.error('❌ [Patient] Status:',
                    err.status);
                console.error('❌ [Patient] Message:',
                    err.message);
                console.error('❌ [Patient] URL:',
                    err.url);

                this.tests[0].status = 'ERROR';
                this.tests[0].message =
                    err.status === 0
                        ? 'CORS ou service arrêté'
                        : `HTTP ${err.status}`;
                this.addLog(
                    `❌ Patient: ${this.tests[0].message}`
                );
            }
        });
    }

    testAppointments(): void {
        this.addLog('📡 Test appointment-service...');
        console.log('🔵 [Appointment] URL:',
            `http://localhost:8082/api/appointments?tenantId=1`
        );

        this.http.get<any[]>(
            `${this.APPOINTMENT_URL}?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (data: any[]) => {
                console.log('✅ [Appointment] Réponse:',
                    data);
                console.log('✅ [Appointment] Nombre:',
                    data.length);

                this.rdvs = data;
                this.tests[1].status = 'OK';
                this.tests[1].count = data.length;
                this.tests[1].message =
                    'Connexion réussie !';
                this.addLog(
                    `✅ RDV: ${data.length} trouvés`
                );
            },
            error: (err: any) => {
                console.error('❌ [Appointment] Erreur:',
                    err);
                console.error('❌ [Appointment] Status:',
                    err.status);

                this.tests[1].status = 'ERROR';
                this.tests[1].message =
                    err.status === 0
                        ? 'CORS ou service arrêté'
                        : `HTTP ${err.status}`;
                this.addLog(
                    `❌ Appointment: ${this.tests[1].message}`
                );
            }
        });
    }

    testMedicalRecords(): void {
        this.addLog('📡 Test medical-record-service...');
        console.log('🔵 [Medical] URL:',
            `http://localhost:8084/api/dossiers?tenantId=1`
        );

        this.http.get<any[]>(
            `${this.DOSSIER_URL}?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (data: any[]) => {
                console.log('✅ [Medical] Réponse:',
                    data);
                console.log('✅ [Medical] Nombre:',
                    data.length);

                this.tests[2].status = 'OK';
                this.tests[2].count = data.length;
                this.tests[2].message =
                    'Connexion réussie !';
                this.addLog(
                    `✅ Dossiers: ${data.length} trouvés`
                );
            },
            error: (err: any) => {
                console.error('❌ [Medical] Erreur:',
                    err);
                console.error('❌ [Medical] Status:',
                    err.status);

                this.tests[2].status = 'ERROR';
                this.tests[2].message =
                    err.status === 0
                        ? 'CORS ou service arrêté'
                        : `HTTP ${err.status}`;
                this.addLog(
                    `❌ Medical: ${this.tests[2].message}`
                );
            }
        });
    }

    testBilling(): void {
        this.addLog('📡 Test billing-service...');
        console.log('🔵 [Billing] URL:',
            `http://localhost:8085/api/factures?tenantId=1`
        );

        this.http.get<any[]>(
            `${this.BILLING_URL}?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (data: any[]) => {
                console.log('✅ [Billing] Réponse:',
                    data);
                console.log('✅ [Billing] Nombre:',
                    data.length);

                this.tests[3].status = 'OK';
                this.tests[3].count = data.length;
                this.tests[3].message =
                    'Connexion réussie !';
                this.facturesStats.total = data.length;
                this.addLog(
                    `✅ Factures: ${data.length} trouvées`
                );
            },
            error: (err: any) => {
                console.error('❌ [Billing] Erreur:',
                    err);
                console.error('❌ [Billing] Status:',
                    err.status);

                this.tests[3].status = 'ERROR';
                this.tests[3].message =
                    err.status === 0
                        ? 'CORS ou service arrêté'
                        : `HTTP ${err.status}`;
                this.addLog(
                    `❌ Billing: ${this.tests[3].message}`
                );
            }
        });

        this.http.get<number>(
            `${this.BILLING_URL}/stats/encaisse?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (v: number) => {
                console.log('✅ [Billing] Encaissé:', v);
                this.facturesStats.encaisse = v || 0;
                this.addLog(`✅ Encaissé: ${v} MAD`);
            },
            error: (err: any) => {
                console.error('❌ [Billing] Stats err:',
                    err);
            }
        });

        this.http.get<number>(
            `${this.BILLING_URL}/stats/impaye?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (v: number) => {
                console.log('✅ [Billing] Impayé:', v);
                this.facturesStats.impaye = v || 0;
                this.addLog(`✅ Impayé: ${v} MAD`);
            },
            error: (err: any) => {
                console.error('❌ [Billing] Impayé err:',
                    err);
            }
        });
    }

    testNotifications(): void {
        this.addLog('📡 Test notification-service...');
        console.log('🔵 [Notification] URL:',
            `http://localhost:8086/api/notifications?tenantId=1`
        );

        this.http.get<any[]>(
            `${this.NOTIF_URL}?tenantId=${this.TENANT_ID}`
        ).subscribe({
            next: (data: any[]) => {
                console.log('✅ [Notification] Réponse:',
                    data);
                console.log('✅ [Notification] Nombre:',
                    data.length);

                this.tests[4].status = 'OK';
                this.tests[4].count = data.length;
                this.tests[4].message =
                    'Connexion réussie !';
                this.addLog(
                    `✅ Notifications: ${data.length}`
                );
            },
            error: (err: any) => {
                console.error('❌ [Notification] Erreur:',
                    err);
                console.error('❌ [Notification] Status:',
                    err.status);

                this.tests[4].status = 'ERROR';
                this.tests[4].message =
                    err.status === 0
                        ? 'CORS ou service arrêté'
                        : `HTTP ${err.status}`;
                this.addLog(
                    `❌ Notification: ${this.tests[4].message}`
                );
            }
        });
    }
}
