import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BillingService } from '../../../core/services/billing';
import { PatientService } from '../../../core/services/patient';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-facturation',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TableModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule, TooltipModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './facturation.html',
    styleUrls: ['./facturation.scss']
})
export class FacturationComponent implements OnInit {
    factures: any[] = [];
    facturesFiltrees: any[] = [];
    searchQuery = '';
    filtreActif = 'TOUS';

    dialogFactureVisible = false;
    dialogPaiementVisible = false;
    dialogCaisseVisible = false;
    factureSelectionnee: any = null;
    montantPaiement = 0;
    modePaiement = 'ESPECES';

    stats = { encaisseJour: 0, totalImpaye: 0, facturesJour: 0, enAttente: 0 };
    caisseDetails = { total: 0, especes: 0, cheque: 0, cmi: 0, virement: 0, assurance: 0, count: 0 };

    tabs = [
        { label: 'Toutes', value: 'TOUS', count: 0 },
        { label: 'Émises', value: 'EMISE', count: 0 },
        { label: 'Partielles', value: 'PARTIELLEMENT_PAYEE', count: 0 },
        { label: 'Payées', value: 'PAYEE', count: 0 },
        { label: 'Annulées', value: 'ANNULEE', count: 0 }
    ];

    nouvelleFacture: any = {
        patient: '',
        medecin: '',
        typeConsultation: '',
        montantTTC: 150,
        montantPaye: 0,
        modePaiement: ''
    };

    medecinAssocie: any = null;
    medecinOptions: any[] = [];
    patientOptions: any[] = [];
    patients: any[] = [];

    typeConsultOptions = [
        { label: 'Consultation', value: 'PRESENTIELLE' },
        { label: 'Téléconsultation', value: 'TELECONSULTATION' },
        { label: 'Contrôle', value: 'CONTROLE' },
        { label: 'Urgence', value: 'URGENCE' },
        { label: 'Suivi', value: 'SUIVI' }
    ];

    modePaiementOptions = [
        { label: 'Espèces', value: 'ESPECES' },
        { label: 'Chèque', value: 'CHEQUE' },
        { label: 'CMI/Carte', value: 'CMI_CARTE' },
        { label: 'Assurance', value: 'ASSURANCE' },
        { label: 'Virement', value: 'VIREMENT' }
    ];

    constructor(
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private billingService: BillingService,
        private patientService: PatientService,
        private authService: AuthService,
        private userAdminService: UserAdminService
    ) {}

    ngOnInit() {
        this.loadMedecinAssocie();
    }

    loadMedecinAssocie() {
        const user = this.authService.getCurrentUser();
        if (!user?.medecinId) {
            this.loadFactures();
            return;
        }

        this.userAdminService.getById(user.medecinId).subscribe({
            next: (m) => {
                const label = `Dr. ${m.firstName} ${m.lastName}`;
                this.medecinAssocie = {
                    id: m.id,
                    label: label,
                    nom: `${m.firstName} ${m.lastName}`
                };
                this.medecinOptions = [{ label: label, value: m.id }];
                this.loadFactures();
            },
            error: () => this.loadFactures()
        });
    }

    loadFactures() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            factures: this.billingService.getAll().pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                this.patients = res.patients;
                this.patientOptions = res.patients.map(p => ({
                    label: `${p.nom || ''} ${p.prenom || ''}`.trim() || `Patient #${p.id}`,
                    value: p.id
                }));

                const patientsMap = new Map<number, any>();
                res.patients.forEach(p => patientsMap.set(p.id, p));

                this.factures = res.factures.map(f => {
                    const p = patientsMap.get(f.patientId) || {};
                    const nomComplet = p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${f.patientId || '?'}`;
                    const dateAffichage = f.dateEmission ? new Date(f.dateEmission).toLocaleDateString('fr-FR') : (f.dateCreation ? new Date(f.dateCreation).toLocaleDateString('fr-FR') : 'N/A');

                    let mLabel = 'Médecin';
                    if (this.medecinAssocie && f.medecinId === this.medecinAssocie.id) {
                        mLabel = this.medecinAssocie.label;
                    }

                    // Calcul initials for avatar
                    const initials = (p.prenom?.[0] || '') + (p.nom?.[0] || '');

                    return {
                        id: f.id,
                        numero: f.numeroFacture || `FACT-2026-${String(f.id).padStart(3, '0')}`,
                        patientId: f.patientId,
                        patient: nomComplet,
                        initiales: initials.toUpperCase() || 'P',
                        medecin: mLabel,
                        date: dateAffichage,
                        montantTTC: f.montantTTC || 0,
                        montantPaye: f.montantPaye || 0,
                        montantRestant: f.montantRestant || 0,
                        statut: f.statut || 'EMISE',
                        typeConsultation: f.typeConsultation || 'Consultation',
                        modePaiement: f.paiements && f.paiements.length > 0 ? f.paiements[f.paiements.length - 1].modePaiement : null
                    };
                }).sort((a, b) => b.id - a.id);

                this.calculerStats(res.factures);
                this.filtrer();
                this.updateTabCounts();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les factures' });
                console.error(err);
            }
        });
    }

    calculerStats(rawFactures: any[] = []) {
        const todayStrFR = new Date().toLocaleDateString('fr-FR');
        this.stats.encaisseJour = this.factures.filter((f) => f.date === todayStrFR).reduce((s, f) => s + f.montantPaye, 0);
        this.stats.totalImpaye = this.factures.reduce((s, f) => s + f.montantRestant, 0);
        this.stats.facturesJour = this.factures.filter((f) => f.date === todayStrFR).length;
        this.stats.enAttente = this.factures.filter((f) => f.statut === 'EMISE' || f.statut === 'PARTIELLEMENT_PAYEE').length;

        // Calcul de la caisse basée sur le brut des factures
        this.caisseDetails = { total: 0, especes: 0, cheque: 0, cmi: 0, virement: 0, assurance: 0, count: 0 };
        const todayD = new Date();
        
        rawFactures.forEach(f => {
            const hasPayments = f.paiements && f.paiements.length > 0;
            if (hasPayments) {
                f.paiements.forEach((pay: any) => {
                    const pd = pay.datePaiement ? new Date(pay.datePaiement) : new Date(f.dateCreation);
                    if (pd.toLocaleDateString('fr-FR') === todayStrFR) {
                        this.caisseDetails.total += pay.montant;
                        this.caisseDetails.count++;
                        if (pay.modePaiement === 'ESPECES') this.caisseDetails.especes += pay.montant;
                        else if (pay.modePaiement === 'CHEQUE') this.caisseDetails.cheque += pay.montant;
                        else if (pay.modePaiement === 'CMI_CARTE') this.caisseDetails.cmi += pay.montant;
                        else if (pay.modePaiement === 'VIREMENT') this.caisseDetails.virement += pay.montant;
                        else this.caisseDetails.assurance += pay.montant;
                    }
                });
            } else {
                // Fallback struct
                const df = f.dateEmission ? new Date(f.dateEmission) : new Date(f.dateCreation);
                if (df.toLocaleDateString('fr-FR') === todayStrFR && f.montantPaye > 0) {
                    this.caisseDetails.total += f.montantPaye;
                    this.caisseDetails.count++;
                    const m = f.modePaiement || 'ESPECES';
                    if (m === 'ESPECES') this.caisseDetails.especes += f.montantPaye;
                    else if (m === 'CHEQUE') this.caisseDetails.cheque += f.montantPaye;
                    else if (m === 'CMI_CARTE') this.caisseDetails.cmi += f.montantPaye;
                    else if (m === 'VIREMENT') this.caisseDetails.virement += f.montantPaye;
                    else this.caisseDetails.assurance += f.montantPaye;
                }
            }
        });
    }

    updateTabCounts() {
        this.tabs[0].count = this.factures.length;
        this.tabs[1].count = this.factures.filter((f) => f.statut === 'EMISE').length;
        this.tabs[2].count = this.factures.filter((f) => f.statut === 'PARTIELLEMENT_PAYEE').length;
        this.tabs[3].count = this.factures.filter((f) => f.statut === 'PAYEE').length;
        this.tabs[4].count = this.factures.filter((f) => f.statut === 'ANNULEE').length;
    }

    setFiltre(value: string) {
        this.filtreActif = value;
        this.filtrer();
    }

    filtrer() {
        let result = [...this.factures];
        if (this.filtreActif !== 'TOUS') {
            result = result.filter((f) => f.statut === this.filtreActif);
        }
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter((f) => f.patient.toLowerCase().includes(q) || f.numero.toLowerCase().includes(q));
        }
        this.facturesFiltrees = result;
    }

    ouvrirNouvelleFacture() {
        this.nouvelleFacture = { 
            patientId: null, 
            medecinId: this.medecinAssocie?.id || '', 
            typeConsultation: 'PRESENTIELLE', 
            montantTTC: 150, 
            montantPaye: 150, 
            modePaiement: 'ESPECES' 
        };
        this.dialogFactureVisible = true;
    }

    sauvegarderFacture() {
        if (!this.nouvelleFacture.patientId || !this.nouvelleFacture.montantTTC) {
            this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez remplir les champs obligatoires' });
            return;
        }

        const dto = {
            patientId: this.nouvelleFacture.patientId,
            medecinId: this.nouvelleFacture.medecinId || (this.medecinAssocie?.id ?? null),
            montantTTC: this.nouvelleFacture.montantTTC,
            notesFacture: `Générée manuellement par secrétariat (${this.nouvelleFacture.typeConsultation})`
        };

        this.billingService.create(dto).subscribe({
            next: (saved) => {
                // Si un paiement a été saisi, on l'enregistre dans la foulée
                if (this.nouvelleFacture.montantPaye > 0) {
                    const payPayload = {
                        factureId: saved.id,
                        montant: this.nouvelleFacture.montantPaye,
                        modePaiement: this.nouvelleFacture.modePaiement
                    };
                    this.billingService.payer(payPayload).subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Facture et paiement créés' });
                            this.dialogFactureVisible = false;
                            this.loadFactures();
                        },
                        error: () => {
                            this.messageService.add({ severity: 'warn', summary: 'Partiel', detail: 'Facture créée mais échec du paiement' });
                            this.dialogFactureVisible = false;
                            this.loadFactures();
                        }
                    });
                } else {
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Facture créée' });
                    this.dialogFactureVisible = false;
                    this.loadFactures();
                }
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de création : ' + (err.message || 'Serveur indisponible') });
            }
        });
    }

    ouvrirPaiement(facture: any) {
        this.factureSelectionnee = facture;
        this.montantPaiement = facture.montantRestant;
        this.modePaiement = 'ESPECES';
        this.dialogPaiementVisible = true;
    }

    enregistrerPaiement() {
        if (!this.montantPaiement || this.montantPaiement <= 0) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Montant invalide' });
            return;
        }

        const payload = {
            factureId: this.factureSelectionnee.id,
            montant: this.montantPaiement,
            modePaiement: this.modePaiement,
            reference: '',
            numeroCheque: ''
        };

        this.billingService.payer(payload).subscribe({
            next: () => {
                this.dialogPaiementVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Paiement enregistré', detail: `${this.montantPaiement} MAD reçu` });
                this.loadFactures(); // reload
            },
            error: (err) => {
                let msg = 'Erreur lors du paiement';
                if (err.error) {
                    if (typeof err.error === 'string') msg = err.error;
                    else if (err.error.message) msg = err.error.message;
                }
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg });
                console.error(err);
            }
        });
    }

    annulerFacture(facture: any) {
        this.confirmService.confirm({
            message: `Annuler la facture ${facture.numero} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.billingService.annuler(facture.id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'info', summary: 'Facture annulée', detail: facture.numero });
                        this.loadFactures();
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'annuler' })
                });
            }
        });
    }

    imprimerFacture(facture: any) {
        console.log('Impression facture (secrétaire):', facture);
        
        const patientNom = facture.patient;
        const doctorNom = this.medecinAssocie?.label ?? 'Dr. Médecin';
        const doctorAddress = '123 Avenue Mohamed V, Casablanca'; 
        const doctorPhone = '05 22 00 00 00';
        
        const html = `
            <html>
                <head>
                    <title>Facture ${facture.numero}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        .clinic-info h1 { margin: 0; color: #1d4ed8; font-size: 24pt; }
                        .clinic-info p { margin: 5px 0; color: #64748b; font-size: 10pt; }
                        .invoice-meta { text-align: right; }
                        .invoice-meta h2 { margin: 0; color: #3b82f6; font-size: 18pt; }
                        .invoice-meta p { margin: 5px 0; color: #64748b; }
                        
                        .bill-to { margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .bill-to h3 { margin: 0 0 10px 0; font-size: 10pt; text-transform: uppercase; color: #94a3b8; }
                        .bill-to p { margin: 0; font-size: 14pt; font-weight: bold; color: #0f172a; }
                        
                        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        th { background: #f1f5f9; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 10pt; text-transform: uppercase; }
                        td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
                        
                        .totals { display: flex; flex-direction: column; align-items: flex-end; margin-top: 20px; }
                        .total-row { display: flex; justify-content: space-between; width: 250px; padding: 8px 0; }
                        .total-row.grand-total { border-top: 2px solid #3b82f6; margin-top: 10px; padding-top: 15px; font-weight: bold; font-size: 16pt; color: #1d4ed8; }
                        
                        .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; font-size: 8pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10pt; font-weight: bold; text-transform: uppercase; }
                        .status-payee { background: #dcfce7; color: #166534; }
                        .status-due { background: #fef2f2; color: #991b1b; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="clinic-info">
                            <h1>${doctorNom}</h1>
                            <p>Médecin Généraliste</p>
                            <p>${doctorAddress}</p>
                            <p>Tel: ${doctorPhone}</p>
                        </div>
                        <div class="invoice-meta">
                            <h2>FACTURE</h2>
                            <p><strong>N°:</strong> ${facture.numero}</p>
                            <p><strong>Date:</strong> ${facture.date}</p>
                            <div style="margin-top: 10px;">
                                <span class="badge ${facture.statut === 'PAYEE' ? 'status-payee' : 'status-due'}">
                                    ${this.getStatutLabel(facture.statut)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bill-to">
                        <h3>Facturé à</h3>
                        <p>${patientNom}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${facture.typeConsultation || 'Consultation Médicale'}</td>
                                <td style="text-align: right;">${facture.montantTTC} MAD</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="total-row">
                            <span>Total TTC:</span>
                            <span style="font-weight: 600;">${facture.montantTTC} MAD</span>
                        </div>
                        <div class="total-row">
                            <span>Montant versé:</span>
                            <span style="color: #166534; font-weight: 600;">- ${facture.montantPaye} MAD</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>RESTE À PAYER:</span>
                            <span>${facture.montantRestant} MAD</span>
                        </div>
                    </div>
                    
                    <div class="footer">
                        Cette facture est générée par MedGest - Solution de gestion de cabinet médical.
                        <br>Merci de votre confiance.
                    </div>
                </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow!.document;
        doc.write(html);
        doc.close();
        
        iframe.onload = () => {
            iframe.contentWindow!.focus();
            iframe.contentWindow!.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
        
        // Fallback
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
                setTimeout(() => document.body.removeChild(iframe), 2000);
            }
        }, 1500);
    }

    imprimerZReport() {
        // Clôture Z-Report
        const doctorNom = this.medecinAssocie?.label ?? 'Cabinet Médical';
        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        const html = `
            <html>
                <head>
                    <title>Z-Report - Clôture de Caisse</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; width: 300px; margin: 0 auto; }
                        h2, h3 { text-align: center; margin: 5px 0; }
                        .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
                        .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
                        .total-row { font-weight: bold; font-size: 16px; margin-top: 10px; }
                        .footer { text-align: center; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <h2>${doctorNom}</h2>
                    <h3>RAPPORT Z (CAISSE)</h3>
                    <div class="divider"></div>
                    <div class="row"><span>Date:</span> <span>${dateStr}</span></div>
                    <div class="row"><span>Heure:</span> <span>${timeStr}</span></div>
                    <div class="row"><span>Utilisateur:</span> <span>${this.authService.getCurrentUser()?.firstName || 'Secrétaire'}</span></div>
                    <div class="divider"></div>
                    
                    <h3 style="text-align: left;">VENTILATION</h3>
                    <div class="row"><span>Espèces:</span> <span>${this.caisseDetails.especes} MAD</span></div>
                    <div class="row"><span>TPE / CMI:</span> <span>${this.caisseDetails.cmi} MAD</span></div>
                    <div class="row"><span>Chèques:</span> <span>${this.caisseDetails.cheque} MAD</span></div>
                    <div class="row"><span>Virements:</span> <span>${this.caisseDetails.virement} MAD</span></div>
                    <div class="row"><span>Assurance:</span> <span>${this.caisseDetails.assurance} MAD</span></div>
                    <div class="divider"></div>
                    
                    <div class="row"><span>Nbr Encaissements:</span> <span>${this.caisseDetails.count}</span></div>
                    <div class="row total-row"><span>TOTAL ENCAISSÉ:</span> <span>${this.caisseDetails.total} MAD</span></div>
                    
                    <div class="divider" style="margin-top: 30px;"></div>
                    <div class="footer">
                        Fin de ticket de clôture.<br>Généré par MedGest.
                    </div>
                </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow!.document;
        doc.write(html);
        doc.close();
        
        iframe.onload = () => {
             iframe.contentWindow!.focus();
             iframe.contentWindow!.print();
             setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            PAYEE: 'Payée',
            PARTIELLEMENT_PAYEE: 'Partielle',
            EMISE: 'Émise',
            ANNULEE: 'Annulée'
        };
        return map[statut] ?? statut;
    }

    // ──────────────── IMPORT / EXPORT ────────────────

    triggerImport(fileInput: HTMLInputElement): void {
        fileInput.click();
    }

    importExcel(event: any): void {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const bstr = e.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data: any[] = XLSX.utils.sheet_to_json(ws);
            if (data.length === 0) return;
            this.messageService.add({ severity: 'info', summary: 'Importation', detail: `${data.length} entrées importées (simulation)` });
        };
        reader.readAsBinaryString(file);
    }

    exportExcel(): void {
        const data = this.factures.map(f => ({
            'N° Facture': f.numero,
            'Patient': f.patient,
            'Date': f.date,
            'Type': f.typeConsultation,
            'Total TTC': f.montantTTC + ' MAD',
            'Payé': f.montantPaye + ' MAD',
            'Restant': f.montantRestant + ' MAD',
            'Statut': this.getStatutLabel(f.statut)
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['factures'] };
        const buffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `factures_secretaire_${new Date().getTime()}.xlsx`);
    }

    exportPDF(): void {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(14);
        doc.text('Liste des Factures — Secrétariat', 14, 15);
        autoTable(doc, {
            head: [['N° Facture', 'Patient', 'Date', 'Type', 'Total TTC', 'Payé', 'Restant', 'Statut']],
            body: this.factures.map(f => [
                f.numero, f.patient, f.date, f.typeConsultation,
                f.montantTTC + ' MAD', f.montantPaye + ' MAD',
                f.montantRestant + ' MAD', this.getStatutLabel(f.statut)
            ]),
            startY: 22,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8 }
        });
        doc.save(`factures_secretaire_${new Date().getTime()}.pdf`);
    }

    getModeLabel(mode: string): string {
        const map: Record<string, string> = {
            ESPECES: 'Espèces',
            CHEQUE: 'Chèque',
            CMI_CARTE: 'Carte',
            ASSURANCE: 'Assurance',
            VIREMENT: 'Virement'
        };
        return map[mode] ?? mode;
    }

    getModeIcon(mode: string): string {
        const map: Record<string, string> = {
            ESPECES: 'pi pi-money-bill',
            CHEQUE: 'pi pi-file',
            CMI_CARTE: 'pi pi-credit-card',
            ASSURANCE: 'pi pi-shield',
            VIREMENT: 'pi pi-send'
        };
        return map[mode] ?? 'pi pi-money-bill';
    }
}
