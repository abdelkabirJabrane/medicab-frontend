import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
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

@Component({
    selector: 'app-factures',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TableModule, DialogModule, InputTextModule, ToastModule, SelectModule],
    providers: [MessageService],
    templateUrl: './factures.html',
    styleUrls: ['./factures.scss']
})
export class FacturesComponent implements OnInit {
    factures: any[] = [];
    facturesFiltres: any[] = [];
    searchQuery = '';
    dialogPaiementVisible = false;
    factureSelectionnee: any = null;
    montantPaiement = 0;
    modePaiement = 'ESPECES';

    modePaiementOptions = [
        { label: 'Espèces', value: 'ESPECES' },
        { label: 'Chèque', value: 'CHEQUE' },
        { label: 'CMI/Carte', value: 'CMI_CARTE' },
        { label: 'Assurance', value: 'ASSURANCE' },
        { label: 'Virement', value: 'VIREMENT' }
    ];

    stats = { totalEncaisse: 0, totalImpaye: 0, nbFactures: 0, nbImpayes: 0 };

    constructor(
        private messageService: MessageService,
        private billingService: BillingService,
        private patientService: PatientService,
        private authService: AuthService,
        private userAdminService: UserAdminService
    ) {}

    get currentDoctor(): any {
        const user = this.authService.getCurrentUser();
        return {
            fullName: `Dr. ${user?.firstName || ''} ${user?.lastName || ''}`,
            specialty: 'Médecin Généraliste',
            email: user?.email || 'contact@MedGest.com',
            phone: (user as any)?.phoneNumber || '05 22 00 00 00',
            address: '123 Avenue Mohamed V, Casablanca',
            website: 'www.MedGest.ma'
        };
    }

    imprimerFacture(facture: any) {
        console.log('Impression facture:', facture);
        
        const patientNom = facture.patient;
        const doctor = this.currentDoctor;
        
        const html = `
            <html>
                <head>
                    <title>Facture ${facture.numeroFacture}</title>
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
                            <h1>${doctor.fullName}</h1>
                            <p>${doctor.specialty}</p>
                            <p>${doctor.address}</p>
                            <p>Tel: ${doctor.phone}</p>
                        </div>
                        <div class="invoice-meta">
                            <h2>FACTURE</h2>
                            <p><strong>N°:</strong> ${facture.numeroFacture}</p>
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
                                <td>Consultation Médicale</td>
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

    ngOnInit() {
        this.loadFactures();
    }

    loadFactures() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            factures: this.billingService.getAll().pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                const patientsMap = new Map<number, any>();
                res.patients.forEach(p => patientsMap.set(p.id, p));

                this.factures = res.factures.map(f => {
                    const p = patientsMap.get(f.patientId) || {};
                    const nomComplet = p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${f.patientId || '?'}`;
                    const dateAffichage = f.dateEmission ? new Date(f.dateEmission).toLocaleDateString('fr-FR') : (f.dateCreation ? new Date(f.dateCreation).toLocaleDateString('fr-FR') : 'N/A');

                    return {
                        id: f.id,
                        numeroFacture: f.numeroFacture || `FACT-2026-${String(f.id).padStart(3, '0')}`,
                        patient: nomComplet,
                        date: dateAffichage,
                        montantTTC: f.montantTTC || 0,
                        montantPaye: f.montantPaye || 0,
                        montantRestant: f.montantRestant || 0,
                        statut: f.statut || 'EMISE',
                        modePaiement: f.paiements && f.paiements.length > 0 ? f.paiements[f.paiements.length - 1].modePaiement : null
                    };
                }).sort((a, b) => b.id - a.id);

                this.facturesFiltres = [...this.factures];
                this.calculerStats();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les factures' });
                console.error(err);
            }
        });
    }

    calculerStats() {
        this.stats.totalEncaisse = this.factures.reduce((s, f) => s + f.montantPaye, 0);
        this.stats.totalImpaye = this.factures.reduce((s, f) => s + f.montantRestant, 0);
        this.stats.nbFactures = this.factures.length;
        this.stats.nbImpayes = this.factures.filter(f => f.montantRestant > 0 && f.statut !== 'ANNULEE').length;
    }

    rechercher() {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) {
            this.facturesFiltres = [...this.factures];
        } else {
            this.facturesFiltres = this.factures.filter(f =>
                (f.patient         || '').toLowerCase().includes(q) ||
                (f.numeroFacture   || '').toLowerCase().includes(q) ||
                this.getStatutLabel(f.statut).toLowerCase().includes(q)
            );
        }
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
                this.loadFactures(); // Recharger pour avoir le nouveau statut + montants réels du backend
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

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            PAYEE: 'Payée',
            PARTIELLEMENT_PAYEE: 'Partielle',
            EMISE: 'Émise',
            ANNULEE: 'Annulée',
            BROUILLON: 'Brouillon'
        };
        return map[statut] ?? statut;
    }

    // ──────────────── IMPORT / EXPORT ────────────────

    exportExcel(): void {
        const data = this.factures.map((f) => ({
            Numéro: f.numeroFacture,
            Patient: f.patient,
            Date: f.date,
            'Total TTC': f.montantTTC + ' MAD',
            'Versé': f.montantPaye + ' MAD',
            'Reste': f.montantRestant + ' MAD',
            Statut: this.getStatutLabel(f.statut)
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['factures'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'liste_factures');
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
        saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    }

    exportPDF(): void {
        const doc = new jsPDF('l', 'mm', 'a4');
        const head = [['Numéro', 'Patient', 'Date', 'Total TTC', 'Versé', 'Reste', 'Statut']];
        const body = this.factures.map(f => [
            f.numeroFacture,
            f.patient,
            f.date,
            f.montantTTC + ' MAD',
            f.montantPaye + ' MAD',
            f.montantRestant + ' MAD',
            this.getStatutLabel(f.statut)
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });

        doc.save(`factures_${new Date().getTime()}.pdf`);
    }

    triggerImport(fileInput: HTMLInputElement): void {
        fileInput.click();
    }

    importExcel(event: any): void {
        console.log('🚀 DÉBUT IMPORTATION RÉELLE DES FACTURES');
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: any) => {
            const bstr = e.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data: any[] = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                this.messageService.add({ severity: 'warn', summary: 'Fichier vide', detail: 'Aucune donnée trouvée.' });
                return;
            }

            let success = 0;
            let failed  = 0;

            this.messageService.add({
                severity: 'info',
                summary:  'Import en cours…',
                detail:   `Traitement de ${data.length} facture(s) vers la base de données.`
            });

            // Charger les patients pour le mapping si pas déjà fait
            this.patientService.getAll().subscribe(patients => {
                const processNext = (index: number) => {
                    if (index >= data.length) {
                        event.target.value = '';
                        this.loadFactures();
                        this.messageService.add({
                            severity: success > 0 ? 'success' : 'warn',
                            summary:  'Import terminé',
                            detail:   `${success} facture(s) créée(s) ✔️ — ${failed} échouée(s).`
                        });
                        return;
                    }

                    const row = data[index];
                    const patientName = (row['Patient'] || row['patient'] || '').toLowerCase().trim();

                    // Recherche du patient par nom (fuzzy match)
                    const patient = patients.find(p => {
                        const fullName = (p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`).toLowerCase();
                        if (fullName.includes(patientName)) return true;
                        
                        // Split and check each part (ex: "Simo Hamouda" matches "Hamouda Simo")
                        const parts = patientName.split(' ').filter((word: string) => word.length > 2);
                        return parts.length > 0 && parts.every((part: string) => fullName.includes(part));
                    });

                    if (!patient) {
                        console.warn(`⚠️ Patient "${patientName}" non trouvé.`);
                        failed++;
                        processNext(index + 1);
                        return;
                    }

                    // Nettoyage des montants
                    const montantTTCRaw = String(row['Montant'] || row['montant'] || '0');
                    const montantTTC    = parseFloat(montantTTCRaw.replace(/[^\d.]/g, '')) || 0;
                    
                    const verseRaw      = String(row['Versé'] || row['Verse'] || row['verse'] || '0');
                    const montantPaye   = parseFloat(verseRaw.replace(/[^\d.]/g, '')) || 0;

                    // Déduction du statut si pas précisé
                    let statut = (row['Statut'] || row['statut'] || '').toUpperCase();
                    if (!statut) {
                        if (montantPaye >= montantTTC) statut = 'PAYEE';
                        else if (montantPaye > 0) statut = 'PARTIELLEMENT_PAYEE';
                        else statut = 'EMISE';
                    }

                    const payload = {
                        patientId: patient.id,
                        medecinId: this.authService.getCurrentUser()?.id || 1,
                        dateEmission: this.formatXlsxDate(row['Date'] || row['date']),
                        montantTTC: montantTTC,
                        montantPaye: montantPaye,
                        montantHT: montantTTC / 1.2, // Simulation TVA 20%
                        tva: montantTTC - (montantTTC / 1.2),
                        statut: statut,
                        nature: 'CONSULTATION',
                        typeFacture: 'NORMAL'
                    };

                    this.billingService.create(payload).subscribe({
                        next: () => { success++; processNext(index + 1); },
                        error: (err) => {
                            console.error(`❌ Ligne ${index + 1} :`, err);
                            failed++;
                            processNext(index + 1);
                        }
                    });
                };

                processNext(0);
            });
        };
        reader.readAsBinaryString(file);
    }

    private formatXlsxDate(val: any): string {
        if (!val) return new Date().toISOString().split('T')[0];
        
        // Si c'est déjà une date ISO
        if (typeof val === 'string' && val.includes('-')) return val;
        
        // Si c'est DD/MM/YYYY
        if (typeof val === 'string' && val.includes('/')) {
            const p = val.split('/');
            if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        
        return new Date().toISOString().split('T')[0];
    }
}
