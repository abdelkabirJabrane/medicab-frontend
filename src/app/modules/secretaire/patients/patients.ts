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
import { PatientService } from '../../../core/services/patient';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

@Component({
    selector: 'app-sec-patients',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TableModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './patients.html',
    styleUrls: ['./patients.scss']
})
export class SecPatientsComponent implements OnInit {
    patients: any[] = [];
    patientsFiltres: any[] = [];
    searchQuery = '';
    filtreActif = 'TOUS';

    dialogVisible = false;
    detailVisible = false;
    isEditMode = false;
    patientSelectionne: any = null;

    tabs = [
        { label: 'Tous', value: 'TOUS', count: 0 },
        { label: 'Actifs', value: 'ACTIF', count: 0 },
        { label: 'Inactifs', value: 'INACTIF', count: 0 }
    ];

    nouveauPatient: any = {
        nom: '',
        prenom: '',
        cin: '',
        dateNaissance: '',
        telephone: '',
        email: '',
        sexe: '',
        groupeSanguin: '',
        typeAssurance: '',
        medecinRef: '',
        ville: ''
    };

    sexeOptions = [
        { label: 'Masculin', value: 'MASCULIN' },
        { label: 'Féminin', value: 'FEMININ' }
    ];

    groupeSanguinOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({ label: g, value: g }));

    assuranceOptions = [
        { label: 'CNSS', value: 'CNSS' },
        { label: 'CNOPS', value: 'CNOPS' },
        { label: 'Mutuelle', value: 'MUTUELLE' },
        { label: 'Aucune', value: 'AUCUNE' }
    ];

    medecinAssocie: any = null;
    medecinOptions: any[] = [];

    constructor(
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private patientService: PatientService,
        private authService: AuthService,
        private userAdminService: UserAdminService
    ) {}

    ngOnInit() {
        const user = this.authService.getCurrentUser();
        if (user?.medecinId) {
            this.userAdminService.getById(user.medecinId).subscribe({
                next: (m) => {
                    const label = `Dr. ${m.firstName} ${m.lastName}`;
                    const initiales = ((m.firstName?.[0] || '') + (m.lastName?.[0] || '')).toUpperCase() || 'MD';
                    this.medecinAssocie = {
                        id: m.id,
                        label: label,
                        value: m.id,
                        initiales: initiales
                    };
                    this.medecinOptions = [this.medecinAssocie];
                    this.nouveauPatient.medecinRef = label;
                    
                    // Une fois le médecin chargé, on charge les patients pour le mapping
                    this.loadPatients();
                },
                error: (err) => {
                    console.warn('Impossible de charger le médecin associé', err);
                    this.loadPatients();
                }
            });
        } else {
            this.loadPatients();
        }
    }

    loadPatients() {
        this.patientService.getAll().subscribe({
            next: (data) => {
                this.patients = data.map(p => {
                    const nomComplet = p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${p.id}`;
                    let initials = nomComplet.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                    if (!initials) initials = 'PI';
                    
                    return {
                        id: p.id,
                        nom: p.nom || nomComplet.split(' ')[1] || nomComplet,
                        prenom: p.prenom || nomComplet.split(' ')[0] || '',
                        initiales: initials,
                        cin: p.cin || 'N/A',
                        email: p.email || '',
                        telephone: p.telephone || '',
                        age: this.getAge(p.dateNaissance),
                        sexe: p.sexe || 'MASCULIN',
                        groupeSanguin: p.groupeSanguin || 'N/A',
                        typeAssurance: p.mutuelle || p.assurance || 'N/A',
                        medecinRef: this.medecinAssocie?.label || 'Médecin',
                        medecinInitiales: this.medecinAssocie?.initiales || 'MD',
                        ville: p.ville || 'Inconnue',
                        actif: true, // par défaut
                        dernierRdv: 'Aucun'
                    };
                }).sort((a,b) => b.id - a.id);
                this.updateTabCounts();
                this.filtrer();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les patients' });
                console.error(err);
            }
        });
    }

    getAge(dateStr: string) {
        if (!dateStr) return 0;
        const diff = Date.now() - new Date(dateStr).getTime();
        if (isNaN(diff)) return 0;
        return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }

    updateTabCounts() {
        this.tabs[0].count = this.patients.length;
        this.tabs[1].count = this.patients.filter((p) => p.actif).length;
        this.tabs[2].count = this.patients.filter((p) => !p.actif).length;
    }

    setFiltre(value: string) {
        this.filtreActif = value;
        this.filtrer();
    }

    filtrer() {
        let result = [...this.patients];
        if (this.filtreActif === 'ACTIF') result = result.filter((p) => p.actif);
        if (this.filtreActif === 'INACTIF') result = result.filter((p) => !p.actif);
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter((p) => p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q) || p.cin.toLowerCase().includes(q) || p.telephone.includes(q));
        }
        this.patientsFiltres = result;
    }

    rechercher() {
        this.filtrer();
    }

    voirDetail(patient: any) {
        this.patientSelectionne = patient;
        this.detailVisible = true;
    }

    ouvrirNouveauPatient() {
        this.isEditMode = false;
        this.nouveauPatient = { nom: '', prenom: '', cin: '', dateNaissance: '', telephone: '', email: '', sexe: '', groupeSanguin: '', typeAssurance: '', medecinRef: '', ville: '' };
        this.dialogVisible = true;
    }

    editerPatient(patient: any) {
        this.isEditMode = true;
        // On récupère les données brutes du patient pour l'édition si possible, sinon on bind ce qu'on a
        this.patientService.getById(patient.id).subscribe({
            next: (p) => {
                this.nouveauPatient = {
                    ...p,
                    typeAssurance: p.mutuelle || p.assurance || 'AUCUNE'
                };
                if (this.nouveauPatient.dateNaissance) {
                    this.nouveauPatient.dateNaissance = this.nouveauPatient.dateNaissance.split('T')[0];
                }
                this.dialogVisible = true;
            },
            error: () => {
                // Fallback si le getById échoue
                this.nouveauPatient = { ...patient };
                this.dialogVisible = true;
            }
        });
    }

    sauvegarderPatient() {
        if (!this.nouveauPatient.nom || !this.nouveauPatient.prenom || !this.nouveauPatient.cin) {
            this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Nom, Prénom et CIN obligatoires' });
            return;
        }

        const payload = {
            ...this.nouveauPatient,
            mutuelle: this.nouveauPatient.typeAssurance,
            adresse: this.nouveauPatient.adresse || ''
        };

        if (this.isEditMode) {
            this.patientService.update(this.nouveauPatient.id, payload).subscribe({
                next: () => {
                    this.dialogVisible = false;
                    this.messageService.add({ severity: 'success', summary: 'Patient mis à jour', detail: `${this.nouveauPatient.prenom} ${this.nouveauPatient.nom} modifié avec succès` });
                    this.loadPatients();
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de modifier le patient' });
                    console.error(err);
                }
            });
        } else {
            this.patientService.create(payload).subscribe({
                next: () => {
                    this.dialogVisible = false;
                    this.messageService.add({ severity: 'success', summary: 'Patient enregistré', detail: `${this.nouveauPatient.prenom} ${this.nouveauPatient.nom} ajouté avec succès` });
                    this.loadPatients();
                },
                error: (err) => {
                    let msg = 'Impossible de créer le patient';
                    if (err.error && typeof err.error === 'string') msg = err.error;
                    else if (err.message) msg = err.message;
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg });
                    console.error(err);
                }
            });
        }
    }

    desactiverPatient(patient: any) {
        this.confirmService.confirm({
            message: `Désactiver / Supprimer définitivement ${patient.prenom} ${patient.nom} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.patientService.delete(patient.id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Patient supprimé', detail: `${patient.prenom} ${patient.nom}` });
                        this.loadPatients();
                    },
                    error: (err) => {
                        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer ce patient' });
                        console.error(err);
                    }
                });
            }
        });
    }

    nouveauRdv(patient: any) {
        this.messageService.add({ severity: 'info', summary: 'Nouveau RDV', detail: `Redirection vers agenda pour ${patient.prenom} ${patient.nom}` });
    }

    // ──────────────── IMPORT / EXPORT ────────────────

    exportExcel(): void {
        const data = this.patientsFiltres.map((p) => ({
            Nom: p.nom,
            Prénom: p.prenom,
            CIN: p.cin,
            Téléphone: p.telephone,
            Email: p.email,
            Sexe: p.sexe,
            'Groupe Sanguin': p.groupeSanguin,
            Assurance: p.typeAssurance,
            Ville: p.ville
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['patients'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'liste_patients_sec');
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
        saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    }

    exportPDF(): void {
        const doc = new jsPDF('l', 'mm', 'a4');
        const head = [['Nom', 'Prénom', 'CIN', 'Téléphone', 'Email', 'Assurance', 'Ville']];
        const body = this.patientsFiltres.map(p => [
            p.nom,
            p.prenom,
            p.cin,
            p.telephone,
            p.email,
            p.typeAssurance,
            p.ville
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });

        doc.save(`patients_sec_${new Date().getTime()}.pdf`);
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

            this.messageService.add({ severity: 'info', summary: 'Importation', detail: `Importation de ${data.length} patients simulée...` });
        };
        reader.readAsBinaryString(file);
    }
}
