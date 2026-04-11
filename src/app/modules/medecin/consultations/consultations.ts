import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { MedicalRecordService } from '../../../core/services/medical-record';
import { PatientService } from '../../../core/services/patient';
import { AuthService } from '../../../core/services/auth';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

@Component({
    selector: 'app-consultations',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule,
        ButtonModule, TableModule, DialogModule,
        InputTextModule, TextareaModule,
        ToastModule, TooltipModule, SelectModule
    ],
    providers: [MessageService],
    templateUrl: './consultations.html',
    styleUrls: ['./consultations.scss']
})
export class ConsultationsComponent implements OnInit {

    consultations:      any[] = [];
    consultationActive: any   = null;
    dialogVisible = false;
    activeStep    = 0;

    dossiersOptions: any[] = [];

    etapes = ['Anamnèse', 'Examen Clinique', 'Ordonnance'];

    consultation: any = {
        dossierId: null, motif: '', anamnese: '',
        examenClinique: '', diagnostic: '', conclusion: '',
        recommandations: '', typeConsultation: 'PRESENTIELLE',
        tensionSystolique: null, tensionDiastolique: null,
        frequenceCardiaque: null, temperature: null,
        saturationO2: null, poids: null, taille: null,
        montantTotal: 150
    };

    lignesOrdonnance: any[] = [];

    nouvelleLigne: any = {
        medicament: '', dosage: '', posologie: '',
        dureeTraitement: 7, unite: 'jours'
    };

    typeOptions = [
        { label: 'Présentielle',    value: 'PRESENTIELLE'    },
        { label: 'Téléconsultation',value: 'TELECONSULTATION'},
        { label: 'Urgence',         value: 'URGENCE'         },
        { label: 'Contrôle',        value: 'CONTROLE'        },
        { label: 'Suivi',           value: 'SUIVI'           }
    ];

    constructor(
        private messageService: MessageService,
        private medicalRecordService: MedicalRecordService,
        private patientService: PatientService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() { this.loadData(); }

    loadData() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            dossiers: this.medicalRecordService.getAllDossiers().pipe(catchError(() => of([]))),
            consultations: this.medicalRecordService.getAllConsultations().pipe(catchError(() => of([])))
        }).subscribe(res => {
            const patientsMap = new Map<number, string>();
            res.patients.forEach(p => patientsMap.set(p.id, p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient #${p.id}`));

            const patientHasDossier = new Map<number, number>();
            res.dossiers.forEach(d => {
                patientHasDossier.set(d.patientId, d.id);
            });

            this.dossiersOptions = res.patients.map(p => {
                const nom = patientsMap.get(p.id);
                const dossierId = patientHasDossier.get(p.id);
                return {
                    id: dossierId || `NEW_${p.id}`,  // SI pas de dossier, id = "NEW_xxx"
                    patientId: p.id,
                    dossierId: dossierId,
                    label: dossierId ? `Dos. ${dossierId} - ${nom}` : `Créer Dossier - ${nom}`
                };
            });

            const dossierToPatientMap = new Map<number, string>();
            res.dossiers.forEach(d => {
                dossierToPatientMap.set(d.id, patientsMap.get(d.patientId) || `Patient ${d.patientId || '?'}`);
            });

            this.consultations = res.consultations.map(c => {
                const nom = dossierToPatientMap.get(c.dossierId) || `Dos. ${c.dossierId}`;
                return {
                    id: c.id,
                    patient: nom,
                    initiales: nom.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2).padEnd(2, '?'),
                    date: c.dateHeure ? new Date(c.dateHeure).toLocaleDateString('fr-FR') : 'N/A',
                    heure: c.dateHeure ? new Date(c.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
                    type: c.typeConsultation || 'PRESENTIELLE',
                    typeLabel: this.typeOptions.find(t => t.value === c.typeConsultation)?.label || 'Consultation',
                    motif: c.motif,
                    diagnostic: c.diagnostic || 'En cours',
                    montant: c.montantTotal || 0,
                    hasOrdonnance: !!c.hasOrdonnance,
                    statut: c.statut || 'TERMINE'
                };
            }).sort((a, b) => {
                // Pour pouvoir trier plus précisément il faudrait conserver l'objet date. On garde le tri simple sans date si ce n'est pas fiable.
                return b.id - a.id;
            });
            this.cdr.markForCheck();
        });
    }

    nouvelleConsultation() {
        this.consultation = {
            dossierId: null, motif: '', anamnese: '',
            examenClinique: '', diagnostic: '', conclusion: '',
            recommandations: '', typeConsultation: 'PRESENTIELLE',
            tensionSystolique: null, tensionDiastolique: null,
            frequenceCardiaque: null, temperature: null,
            saturationO2: null, poids: null, taille: null,
            montantTotal: 150
        };
        this.lignesOrdonnance = [];
        this.activeStep = 0;
        this.dialogVisible = true;
    }

    voirConsultation(c: any) { this.consultationActive = c; }

    ajouterLigne() {
        if (!this.nouvelleLigne.medicament) return;
        this.lignesOrdonnance.push({ ...this.nouvelleLigne });
        this.nouvelleLigne = { medicament: '', dosage: '', posologie: '', dureeTraitement: 7, unite: 'jours' };
    }

    supprimerLigne(index: number) { this.lignesOrdonnance.splice(index, 1); }

    getIMC(): number {
        if (!this.consultation.poids || !this.consultation.taille || this.consultation.taille === 0) return 0;
        return Math.round((this.consultation.poids / (this.consultation.taille * this.consultation.taille)) * 100) / 100;
    }

    sauvegarderConsultation() {
        if (!this.consultation.dossierId || !this.consultation.motif || this.consultation.motif.trim().length < 3) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Patient et motif (> 3 car) obligatoires' });
            return;
        }

        if (typeof this.consultation.dossierId === 'string' && this.consultation.dossierId.startsWith('NEW_')) {
            const patientId = parseInt(this.consultation.dossierId.split('_')[1], 10);
            
            this.medicalRecordService.createDossier({ patientId: patientId, historiqueMedical: '', antecedentsFamiliaux: '', allergies: '' }).subscribe({
                next: (newDossier) => {
                    this.consultation.dossierId = newDossier.id;
                    this.envoyerConsultationApi();
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer le dossier pour ce patient automatiquement.' });
                }
            });
        } else {
            this.envoyerConsultationApi();
        }
    }

    private envoyerConsultationApi() {
        const dateHeureDebut = new Date();
        const localIsoString = new Date(dateHeureDebut.getTime() - (dateHeureDebut.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);

        const payload = {
            tenantId: this.authService.getCurrentUser()?.tenantId || 1,
            medecinId: this.authService.getCurrentUser()?.id || 1,
            dossierId: this.consultation.dossierId,
            dateHeure: localIsoString,
            motif: this.consultation.motif.trim(),
            anamnese: this.consultation.anamnese,
            examenClinique: this.consultation.examenClinique,
            diagnostic: this.consultation.diagnostic,
            conclusion: this.consultation.conclusion,
            recommandations: this.consultation.recommandations,
            typeConsultation: this.consultation.typeConsultation,
            tensionSystolique: this.consultation.tensionSystolique,
            tensionDiastolique: this.consultation.tensionDiastolique,
            frequenceCardiaque: this.consultation.frequenceCardiaque,
            temperature: this.consultation.temperature,
            saturationO2: this.consultation.saturationO2,
            poids: this.consultation.poids,
            taille: this.consultation.taille,
            montantTotal: this.consultation.montantTotal
        };

        this.medicalRecordService.createConsultation(payload).subscribe({
            next: () => {
                this.dialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Consultation sauvegardée !' });
                this.loadData();
                this.cdr.markForCheck();
            },
            error: (err) => {
                let msg = 'Erreur lors de la sauvegarde';
                if (err.error) {
                    if (typeof err.error === 'string') msg = err.error;
                    else if (err.error.message) msg = err.error.message;
                    else if (err.error.errors) msg = Object.values(err.error.errors).join(', ');
                }
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg });
                console.error(err);
                this.cdr.markForCheck();
            }
        });
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            TERMINE: 'Terminée', EN_COURS: 'En cours',
            EN_ATTENTE: 'En attente', ANNULE: 'Annulée'
        };
        return map[statut] ?? statut;
    }

    // ──────────────── IMPORT / EXPORT ────────────────

    exportExcel(): void {
        const data = this.consultations.map((c) => ({
            Patient: c.patient,
            Date: c.date,
            Heure: c.heure,
            Type: c.typeLabel,
            Motif: c.motif,
            Diagnostic: c.diagnostic,
            Montant: c.montant + ' MAD',
            Statut: this.getStatutLabel(c.statut)
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['consultations'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'liste_consultations');
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
        saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    }

    exportPDF(): void {
        const doc = new jsPDF('l', 'mm', 'a4');
        const head = [['Patient', 'Date', 'Type', 'Motif', 'Diagnostic', 'Montant', 'Statut']];
        const body = this.consultations.map(c => [
            c.patient,
            c.date + ' ' + c.heure,
            c.typeLabel,
            c.motif,
            c.diagnostic,
            c.montant + ' MAD',
            this.getStatutLabel(c.statut)
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });

        doc.save(`consultations_${new Date().getTime()}.pdf`);
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

            this.messageService.add({ severity: 'info', summary: 'Importation', detail: `Importation de ${data.length} consultations simulée...` });
            // L'importation réelle dépendrait d'un bulk endpoint backend
        };
        reader.readAsBinaryString(file);
    }
}
