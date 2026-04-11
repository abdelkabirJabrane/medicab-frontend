import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OrdonnanceService, OrdonnanceResponse, OrdonnanceRequest, LigneOrdonnanceRequest } from '../../../core/services/ordonnance';
import { PatientService } from '../../../core/services/patient';
import { MedicalRecordService } from '../../../core/services/medical-record';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

@Component({
    selector: 'app-ordonnances',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule,
        ButtonModule, TableModule, DialogModule,
        InputTextModule, ToastModule, SelectModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './ordonnances.html',
    styleUrls: ['./ordonnances.scss']
})
export class OrdonnancesComponent implements OnInit {
    ordonnances: OrdonnanceResponse[] = [];
    ordonnanceActive: OrdonnanceResponse | null = null;
    dialogVisible = false;
    loading = false;

    // ── Patients ──────────────────────────────────────────────────
    patients: any[] = [];
    patientsOptions: { label: string; value: number }[] = [];
    selectedPatientId: number | null = null;

    // ── Consultations ─────────────────────────────────────────────
    consultations: any[] = [];
    consultationsOptions: { label: string; value: number; patientId: number }[] = [];
    selectedConsultationId: number | null = null;

    // ── Formulaire nouvelle ordonnance ────────────────────────────
    medecinId: number = 1;
    dateEmission: string = new Date().toISOString().split('T')[0];
    dateValidite: string = '';
    instructions: string = '';
    renouvellement: boolean = false;

    lignes: LigneOrdonnanceRequest[] = [];
    nouvelleLigne: LigneOrdonnanceRequest & { dureeTraitementNum: number; unite: string } = {
        medicament: '',
        dci: '',
        dosage: '',
        forme: '',
        posologie: '',
        dureeTraitementNum: 7,
        unite: 'jours',
        instructions: '',
        substituable: false
    };

    uniteOptions = [
        { label: 'Jours',    value: 'jours' },
        { label: 'Semaines', value: 'semaines' },
        { label: 'Mois',     value: 'mois' }
    ];

    constructor(
        private ordonnanceService: OrdonnanceService,
        private patientService: PatientService,
        private medicalRecordService: MedicalRecordService,
        private authService: AuthService,
        private userAdminService: UserAdminService,
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    get currentDoctor(): any {
        const user = this.authService.getCurrentUser();
        return {
            fullName: `Dr. ${user?.firstName || ''} ${user?.lastName || ''}`,
            specialty: 'Médecin Généraliste',
            email: user?.email || 'contact@medicab.com',
            phone: (user as any)?.phoneNumber || '05 22 00 00 00',
            address: '123 Avenue Mohamed V, Casablanca',
            website: 'www.medicab.ma'
        };
    }

    imprimerOrdonnance(ord: any) {
        console.log('Impression via iframe:', ord);
        
        if (!ord || !ord.lignes) {
            this.messageService.add({ severity: 'warn', summary: 'Ordonnance vide', detail: 'Cette ordonnance ne contient aucun médicament.' });
            return;
        }

        const patientNom = this.getPatientNom(ord.patientId);
        const medsHtml = ord.lignes.map((l: any, i: number) => `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14pt;">${i + 1}. ${l.medicament} ${l.dosage ? '(' + l.dosage + ')' : ''}</div>
                <div style="padding-left: 20px; font-style: italic;">${l.posologie}</div>
                <div style="padding-left: 20px; font-size: 10pt; color: #666;">Pendant ${l.dureeTraitement} ${l.unite}</div>
            </div>
        `).join('');

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 40px; }
                        .doc-name { font-size: 24pt; font-weight: bold; color: #1E40AF; margin: 0; }
                        .patient-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 40px; border: 1px solid #e2e8f0; }
                        .rx { font-size: 40pt; font-weight: 900; color: #1E40AF; margin-bottom: 20px; font-family: serif; }
                        .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; border-top: 2px solid #2563EB; padding-top: 20px; font-size: 9pt; color: #666; display: flex; justify-content: space-between; }
                        .sig { margin-top: 60px; text-align: right; border-top: 1px solid #ccc; width: 200px; padding-top: 5px; float: right; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 class="doc-name">${this.currentDoctor.fullName}</h1>
                            <div style="color: #666; text-transform: uppercase;">${this.currentDoctor.specialty}</div>
                        </div>
                        <div style="text-align: right; color: #2563EB; opacity: 0.1; font-size: 40pt;">✚</div>
                    </div>

                    <div class="patient-box">
                        <div style="margin-bottom: 8px;"><strong>Patient:</strong> ${patientNom}</div>
                        <div style="display: flex; justify-content: space-between;">
                            <div><strong>Date:</strong> ${this.formatDate(ord.dateEmission)}</div>
                            <div><strong>Réf:</strong> #ORD-${ord.id}</div>
                        </div>
                    </div>

                    <div class="rx">Rx</div>
                    <div class="meds">${medsHtml}</div>

                    ${ord.instructions ? `<div style="margin-top: 40px; border-left: 4px solid #2563EB; padding-left: 15px; font-style: italic;">${ord.instructions}</div>` : ''}

                    <div class="sig">Signature & Cachet</div>

                    <div class="footer">
                        <div>${this.currentDoctor.address}</div>
                        <div>Tel: ${this.currentDoctor.phone} | Email: ${this.currentDoctor.email}</div>
                    </div>
                </body>
            </html>
        `;

        // Créer un iframe invisible
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow!.document;
        doc.write(html);
        doc.close();

        // Attendre que l'iframe soit chargé avant d'imprimer
        iframe.onload = () => {
            iframe.contentWindow!.focus();
            iframe.contentWindow!.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };

        // Fallback si l'onload ne se déclenche pas (ex: Safari)
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
            }
        }, 1500);
    }

    ngOnInit() {
        this.loadOrdonnances();
        this.loadPatients();
        this.loadConsultations();
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Chargement des ordonnances
    // ─────────────────────────────────────────────────────────────
    loadOrdonnances() {
        this.loading = true;
        this.ordonnanceService.getAll().subscribe({
            next: (data) => {
                this.ordonnances = data;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les ordonnances : ' + err.message });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Chargement des patients
    // ─────────────────────────────────────────────────────────────
    loadPatients() {
        this.patientService.getAll().subscribe({
            next: (data) => {
                this.patients = data;
                this.patientsOptions = data.map((p: any) => ({
                    label: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Patient #${p.id}`,
                    value: p.id
                }));
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.warn('⚠️ Patients :', err.message);
                this.cdr.markForCheck();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Chargement des consultations depuis le service
    // ─────────────────────────────────────────────────────────────
    loadConsultations() {
        this.medicalRecordService.getAllConsultations().subscribe({
            next: (data) => {
                this.consultations = data;
                this.consultationsOptions = data.map((c: any) => {
                    // Construire un label lisible : date + motif + patient
                    const date = c.dateConsultation
                        ? new Date(c.dateConsultation).toLocaleDateString('fr-FR')
                        : (c.date ? new Date(c.date).toLocaleDateString('fr-FR') : `#${c.id}`);
                    const motif = c.motif || c.type || '';
                    const patientNom = this.getPatientNom(c.patientId ?? c.patient?.id);
                    const label = `${date}${motif ? ' — ' + motif : ''}${patientNom ? ' (' + patientNom + ')' : ''} [#${c.id}]`;
                    return {
                        label,
                        value: c.id,
                        patientId: c.patientId ?? c.patient?.id ?? null
                    };
                });
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.warn('⚠️ Consultations :', err.message);
                this.cdr.markForCheck();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Quand on choisit une consultation → auto-remplir le patient
    // ─────────────────────────────────────────────────────────────
    onConsultationChange(consultationId: number | null) {
        if (!consultationId) {
            this.selectedPatientId = null;
            return;
        }
        const opt = this.consultationsOptions.find(c => c.value === consultationId);
        if (opt?.patientId) {
            this.selectedPatientId = opt.patientId;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Voir l'aperçu d'une ordonnance
    // ─────────────────────────────────────────────────────────────
    voirOrdonnance(ord: OrdonnanceResponse) {
        this.ordonnanceActive = ord;
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Ouvrir le dialog nouvelle ordonnance
    // ─────────────────────────────────────────────────────────────
    nouvelleOrdonnance() {
        this.selectedPatientId    = null;
        this.selectedConsultationId = null;
        this.dateEmission = new Date().toISOString().split('T')[0];
        this.dateValidite = '';
        this.instructions = '';
        this.renouvellement = false;
        this.lignes = [];
        this.resetNouvelleFilm();
        this.dialogVisible = true;
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Ajouter une ligne de médicament
    // ─────────────────────────────────────────────────────────────
    ajouterLigne() {
        if (!this.nouvelleLigne.medicament?.trim()) return;
        const ligne: LigneOrdonnanceRequest = {
            medicament:       this.nouvelleLigne.medicament,
            dci:              this.nouvelleLigne.dci        || undefined,
            dosage:           this.nouvelleLigne.dosage     || undefined,
            forme:            this.nouvelleLigne.forme      || undefined,
            posologie:        this.nouvelleLigne.posologie  || undefined,
            dureeTraitement:  this.nouvelleLigne.dureeTraitementNum ?? undefined,  // ✅ number
            unite:            this.nouvelleLigne.unite      || undefined,
            instructions:     this.nouvelleLigne.instructions || undefined,
            substituable:     this.nouvelleLigne.substituable ?? false
        };
        this.lignes.push(ligne);
        this.resetNouvelleFilm();
    }

    supprimerLigne(i: number) {
        this.lignes.splice(i, 1);
    }

    private resetNouvelleFilm() {
        this.nouvelleLigne = {
            medicament: '', dci: '', dosage: '', forme: '',
            posologie: '', dureeTraitementNum: 7, unite: 'jours',
            instructions: '', substituable: false
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Créer l'ordonnance via l'API
    // ─────────────────────────────────────────────────────────────
    sauvegarder() {
        if (!this.selectedPatientId || this.lignes.length === 0) {
            this.messageService.add({
                severity: 'warn', summary: 'Incomplet',
                detail: 'Veuillez sélectionner un patient et ajouter au moins un médicament'
            });
            return;
        }

        const dto: OrdonnanceRequest = {
            tenantId:        1,
            consultationId:  this.selectedConsultationId ?? 0,
            patientId:       this.selectedPatientId,
            medecinId:       this.medecinId,
            dateEmission:    this.dateEmission  || undefined,
            dateValidite:    this.dateValidite  || undefined,
            instructions:    this.instructions  || undefined,
            renouvellement:  this.renouvellement,
            statut:          'ACTIVE',
            lignes:          [...this.lignes]
        };

        console.log('📤 Ordonnance payload:', JSON.stringify(dto, null, 2));

        this.ordonnanceService.create(dto).subscribe({
            next: (created) => {
                this.ordonnances.unshift(created);
                this.dialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Ordonnance créée', detail: `Ordonnance #${created.id} créée` });
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Création échouée : ' + err.message });
                this.cdr.markForCheck();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Supprimer une ordonnance
    // ─────────────────────────────────────────────────────────────
    supprimerOrdonnance(ord: OrdonnanceResponse) {
        this.confirmService.confirm({
            message: `Êtes-vous sûr de vouloir supprimer cette ordonnance (Réf #${ord.id}) ?`,
            header: 'Confirmation de suppression',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Oui',
            rejectLabel: 'Non',
            accept: () => {
                this.ordonnanceService.delete(ord.id).subscribe({
                    next: () => {
                        this.ordonnances = this.ordonnances.filter(o => o.id !== ord.id);
                        if (this.ordonnanceActive?.id === ord.id) this.ordonnanceActive = null;
                        this.messageService.add({ severity: 'success', summary: 'Supprimée', detail: `Ordonnance #${ord.id} supprimée` });
                        this.cdr.markForCheck();
                    },
                    error: (err) => {
                        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                        this.cdr.markForCheck();
                    }
                });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Changer le statut d'une ordonnance
    // ─────────────────────────────────────────────────────────────
    changerStatut(ord: OrdonnanceResponse, statut: string) {
        this.ordonnanceService.changerStatut(ord.id, statut).subscribe({
            next: (updated) => {
                const idx = this.ordonnances.findIndex(o => o.id === ord.id);
                if (idx !== -1) this.ordonnances[idx] = updated;
                if (this.ordonnanceActive?.id === ord.id) this.ordonnanceActive = updated;
                this.messageService.add({ severity: 'info', summary: 'Statut mis à jour', detail: `Ordonnance #${ord.id} → ${statut}` });
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                this.cdr.markForCheck();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Getters pour la consultation affichée dans l'aperçu
    // ─────────────────────────────────────────────────────────────
    getConsultationLabel(consultationId: number): string {
        const c = this.consultations.find(x => x.id === consultationId);
        if (!c) return `Consultation #${consultationId}`;
        const date   = c.dateConsultation ? new Date(c.dateConsultation).toLocaleDateString('fr-FR') : '';
        const motif  = c.motif || c.type || '';
        return `#${c.id}${date ? ' — ' + date : ''}${motif ? ' (' + motif + ')' : ''}`;
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 Helpers d'affichage
    // ─────────────────────────────────────────────────────────────
    getPatientNom(patientId: number): string {
        if (!patientId) return '';
        const p = this.patients.find(x => x.id === patientId);
        if (!p) return `Patient #${patientId}`;
        return `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Patient #${patientId}`;
    }

    getInitiales(patientId: number): string {
        const p = this.patients.find(x => x.id === patientId);
        if (!p) return `P${patientId}`;
        const nom    = (p.nom    ?? '')[0] ?? '';
        const prenom = (p.prenom ?? '')[0] ?? '';
        return (prenom + nom).toUpperCase() || `P${patientId}`;
    }

    formatDate(dateStr: string | undefined): string {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR');
    }

    getStatutLabel(statut: string | undefined): string {
        switch (statut) {
            case 'ACTIVE':  return 'Active';
            case 'EXPIREE': return 'Expirée';
            case 'ANNULEE': return 'Annulée';
            default:        return statut ?? '—';
        }
    }

    // ──────────────── IMPORT / EXPORT ────────────────

    exportExcel(): void {
        const data = this.ordonnances.map((o) => ({
            Référence: `#ORD-${o.id}`,
            Patient: this.getPatientNom(o.patientId),
            Date: this.formatDate(o.dateEmission),
            Statut: this.getStatutLabel(o.statut),
            'Nombre de médicaments': o.lignes?.length || 0,
            Instructions: o.instructions || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['ordonnances'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'liste_ordonnances');
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
        saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    }

    exportPDF(): void {
        const doc = new jsPDF('l', 'mm', 'a4');
        const head = [['Référence', 'Patient', 'Date', 'Statut', 'Médicaments', 'Instructions']];
        const body = this.ordonnances.map(o => [
            `#ORD-${o.id}`,
            this.getPatientNom(o.patientId),
            this.formatDate(o.dateEmission),
            this.getStatutLabel(o.statut),
            o.lignes?.length || 0,
            o.instructions || ''
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });

        doc.save(`ordonnances_${new Date().getTime()}.pdf`);
    }

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

            this.messageService.add({ severity: 'info', summary: 'Importation', detail: `Importation de ${data.length} ordonnances simulée...` });
        };
        reader.readAsBinaryString(file);
    }
}
