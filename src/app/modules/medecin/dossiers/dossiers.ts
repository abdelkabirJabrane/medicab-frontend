import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { MedicalRecordService } from '../../../core/services/medical-record';
import { PatientService } from '../../../core/services/patient';
import { AuthService } from '../../../core/services/auth';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TextareaModule } from 'primeng/textarea';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-dossiers',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ButtonModule, InputTextModule, ToastModule, FileUploadModule, DialogModule, TextareaModule],
    providers: [MessageService],
    templateUrl: './dossiers.html',
    styleUrls: ['./dossiers.scss']
})
export class DossiersComponent implements OnInit {
    dossiers: any[] = [];
    dossiersFiltres: any[] = [];
    dossierActif: any = null;
    searchQuery = '';
    
    // Document management
    documents: any[] = [];
    docDialogVisible = false;
    previewVisible = false;
    currentPreviewUrl: SafeResourceUrl = '';
    currentPreviewType = '';
    selectedDocType = 'BIOLOGIE';
    selectedFile: File | null = null;
    
    docTypeOptions = [
        { label: 'Biologie (Analyse)', value: 'BIOLOGIE' },
        { label: 'Imagerie (Radio, CT, MRI)', value: 'IMAGERIE' },
        { label: 'Compte-rendu (CR)', value: 'COMPTE_RENDU' },
        { label: 'Ordonnance externe', value: 'ORDONNANCE' },
        { label: 'Autre', value: 'AUTRE' }
    ];

    editDialogVisible = false;
    dossierForm: any = {};

    constructor(
        private messageService: MessageService,
        private medicalRecordService: MedicalRecordService,
        private patientService: PatientService,
        private authService: AuthService,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit() {
        this.loadDossiers();
    }

    loadDossiers() {
        forkJoin({
            patients: this.patientService.getAll().pipe(catchError(() => of([]))),
            dossiers: this.medicalRecordService.getAllDossiers().pipe(catchError(() => of([]))),
            consultations: this.medicalRecordService.getAllConsultations().pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                const dossiersMap = new Map<number, any>();
                res.dossiers.forEach(d => dossiersMap.set(d.patientId, d));

                const consultationsByDossier = new Map<number, any[]>();
                res.consultations.forEach(c => {
                    const arr = consultationsByDossier.get(c.dossierId) || [];
                    arr.push({
                        date: c.dateHeure ? new Date(c.dateHeure).toLocaleDateString('fr-FR') : 'N/A',
                        motif: c.motif || '',
                        diagnostic: c.diagnostic || 'En cours',
                        realTimestamp: c.dateHeure ? new Date(c.dateHeure).getTime() : 0
                    });
                    consultationsByDossier.set(c.dossierId, arr);
                });

                this.dossiers = res.patients.map(p => {
                    const d = dossiersMap.get(p.id) || {};
                    const hasDossier = !!d.id;
                    const splitToArray = (str: string) => str ? String(str).split(',').map(s => s.trim()).filter(s => !!s) : [];

                    const consArr = d.id ? (consultationsByDossier.get(d.id) || []) : [];
                    consArr.sort((a, b) => b.realTimestamp - a.realTimestamp);

                    let dernierRdv = 'Aucun';
                    if (consArr.length > 0) {
                        dernierRdv = consArr[0].date;
                    }

                    const getAge = (dateStr: string) => {
                        if (!dateStr) return 0;
                        const diff = Date.now() - new Date(dateStr).getTime();
                        if (isNaN(diff)) return 0;
                        return Math.abs(new Date(diff).getUTCFullYear() - 1970);
                    };

                    const nomComplet = p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim() || `Patient ${p.id}`;
                    let initials = nomComplet.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                    if (!initials) initials = 'P';

                    const poids = p.poids || d.poids || 0;
                    const taille = p.taille || d.taille || 0;
                    let imc = d.imc || p.imc || 0;

                    if (imc === 0 && poids > 0 && taille > 0) {
                        const tM = taille > 3 ? taille / 100 : taille;
                        imc = parseFloat((poids / (tM * tM)).toFixed(1));
                    }

                    return {
                        id: d.id || null, // null si pas encore créé en base
                        patientId: p.id,
                        patient: nomComplet,
                        hasDossier: hasDossier,
                        initiales: initials,
                        age: getAge(p.dateNaissance),
                        cin: p.cin || 'N/A',
                        groupeSanguin: d.groupeSanguin || p.groupeSanguin || 'N/A',
                        typeAssurance: p.typeAssurance || p.mutuelle || p.assurance || 'N/A',
                        ville: p.ville || 'N/A',
                        poids: poids,
                        taille: taille,
                        imc: imc,
                        dernierRdv: dernierRdv,
                        antecedentsMedicaux: splitToArray(d.antecedentsPersonnels).concat(splitToArray(d.antecedentsFamiliaux)),
                        antecedentsChirurgicaux: [], // Assuming part of personnels
                        allergies: splitToArray(d.allergies),
                        traitementEnCours: splitToArray(d.medicamentsEnCours),
                        consultations: consArr,
                        raw: d // Garde l'objet backend original
                    };
                });

                this.dossiersFiltres = [...this.dossiers];
                
                // Si un dossier était ouvert, on le met à jour
                if (this.dossierActif) {
                    const updated = this.dossiers.find(x => x.patientId === this.dossierActif.patientId);
                    if (updated) this.dossierActif = updated;
                }
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les dossiers' });
                console.error(err);
            }
        });
    }

    rechercher() {
        if (!this.searchQuery.trim()) {
            this.dossiersFiltres = [...this.dossiers];
            return;
        }
        const q = this.searchQuery.toLowerCase();
        this.dossiersFiltres = this.dossiers.filter((d) => d.patient.toLowerCase().includes(q) || d.cin.toLowerCase().includes(q));
    }

    ouvrirDossier(dossier: any) {
        this.dossierActif = dossier;
        this.loadDocuments(dossier.id);
    }

    loadDocuments(dossierId: number) {
        this.medicalRecordService.getDocumentsByDossier(dossierId).subscribe({
            next: (docs) => {
                this.documents = docs.map(d => ({
                    ...d,
                    icon: this.getDocIcon(d.type),
                    color: this.getDocColor(d.type)
                }));
            },
            error: () => console.error('Erreur chargement documents')
        });
    }

    getDocIcon(type: string): string {
        switch(type) {
            case 'BIOLOGIE': return 'pi pi-filter';
            case 'IMAGERIE': return 'pi pi-image';
            case 'COMPTE_RENDU': return 'pi pi-file-pdf';
            default: return 'pi pi-file';
        }
    }

    getDocColor(type: string): string {
        switch(type) {
            case 'BIOLOGIE': return 'blue';
            case 'IMAGERIE': return 'purple';
            case 'COMPTE_RENDU': return 'orange';
            default: return 'muted';
        }
    }

    ouvrirUpload() {
        this.selectedFile = null;
        this.docDialogVisible = true;
    }

    onFileSelect(event: any) {
        if (event.target.files && event.target.files.length > 0) {
            this.selectedFile = event.target.files[0];
        }
    }

    uploadSelected(dossierId: number) {
        if (!this.selectedFile) return;

        const formData = new FormData();
        formData.append('file', this.selectedFile);
        formData.append('type', this.selectedDocType);
        formData.append('nom', this.selectedFile.name);

        this.medicalRecordService.uploadDocument(dossierId, formData).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Document ajouté' });
                this.selectedFile = null;
                this.docDialogVisible = false;
                this.loadDocuments(dossierId);
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de l\'upload' })
        });
    }

    onUpload(event: any, dossierId: number) {
        const file = event.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', this.selectedDocType);
        formData.append('nom', file.name);

        this.medicalRecordService.uploadDocument(dossierId, formData).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Document ajouté' });
                this.docDialogVisible = false;
                this.loadDocuments(dossierId);
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de l\'upload' })
        });
    }

    previewDoc(doc: any) {
        const fullUrl = `http://localhost:8084${doc.url}`;
        this.currentPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
        this.currentPreviewType = doc.mimeType || 'application/pdf';
        this.previewVisible = true;
    }

    downloadDoc(doc: any) {
        const fullUrl = `http://localhost:8084${doc.url}`;
        window.open(fullUrl, '_blank');
    }

    supprimerDoc(doc: any) {
        if (confirm('Supprimer ce document ?')) {
            this.medicalRecordService.deleteDocument(this.dossierActif.id, doc.id).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'info', summary: 'Supprimé', detail: 'Document retiré' });
                    this.loadDocuments(this.dossierActif.id);
                }
            });
        }
    }
    fermerDossier() {
        this.dossierActif = null;
    }

    // ── Edition Dossier ───────────────────────
    ouvrirEdit() {
        if (!this.dossierActif) return;
        this.dossierForm = {
            id: this.dossierActif.id,
            patientId: this.dossierActif.patientId,
            groupeSanguin: this.dossierActif.groupeSanguin !== 'N/A' ? this.dossierActif.groupeSanguin : '',
            poids: this.dossierActif.poids || null,
            taille: this.dossierActif.taille || null,
            antecedentsPersonnels: this.dossierActif.raw?.antecedentsPersonnels || this.dossierActif.antecedentsMedicaux.join(', '),
            allergies: this.dossierActif.raw?.allergies || this.dossierActif.allergies.join(', '),
            medicamentsEnCours: this.dossierActif.raw?.medicamentsEnCours || this.dossierActif.traitementEnCours.join(', ')
        };
        this.editDialogVisible = true;
    }

    sauvegarderDossier() {
        // Validation simple
        this.dossierForm.poids = this.dossierForm.poids ? parseFloat(this.dossierForm.poids) : null;
        this.dossierForm.taille = this.dossierForm.taille ? parseFloat(this.dossierForm.taille) : null;

        const payload = { ...this.dossierForm, historiqueMedical: '' };

        const request$ = this.dossierForm.id
            ? this.medicalRecordService.updateDossier(this.dossierForm.id, payload)
            : this.medicalRecordService.createDossier(payload);

        request$.subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Dossier mis à jour avec succès' });
                this.editDialogVisible = false;
                this.loadDossiers(); // Recharger pour voir les modifs
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la sauvegarde.' });
                console.error(err);
            }
        });
    }

    getImcClass(imc: number): string {
        if (imc < 18.5) return 'insuffisance';
        if (imc < 25) return 'normal';
        if (imc < 30) return 'surpoids';
        return 'obesite';
    }

    getImcLabel(imc: number): string {
        if (imc < 18.5) return 'Insuffisance';
        if (imc < 25) return 'Normal';
        if (imc < 30) return 'Surpoids';
        return 'Obésité';
    }

    // ── Impression Professionnelle PDF ────────────────────────
    imprimerDossier() {
        if (!this.dossierActif) return;

        const u = this.authService.getCurrentUser();
        const drName = u ? `Dr. ${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Docteur';
        const d = this.dossierActif;

        let content = `
            <html>
                <head>
                    <title>Dossier Médical - ${d.patient}</title>
                    <style>
                        @media print {
                            @page { size: A4; margin: 1.5cm; }
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; }
                            .header { border-bottom: 2px solid #2563EB; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
                            .doc-name { font-size: 16pt; font-weight: bold; color: #1D4ED8; margin:0; }
                            .doc-title { font-size: 10pt; color: #4A5878; margin-top:2px; }
                            .title { font-size: 18pt; text-align: center; margin: 20px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #111; }
                            .section { margin-bottom: 25px; }
                            .sec-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; color: #2563EB; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
                            
                            .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                            .info-row { display: flex; margin-bottom: 5px; }
                            .info-label { font-weight: bold; width: 140px; color: #475569; }
                            .info-val { flex: 1; }
                            
                            .vitals-banner { display: flex; justify-content: space-between; background: #eff6ff; padding: 10px 20px; border-radius: 6px; margin-top: 15px; border: 1px dashed #bfdbfe; }
                            .vital { text-align: center; }
                            .vital-val { font-weight: bold; font-size: 12pt; color: #1D4ED8; }
                            .vital-lbl { font-size: 9pt; color: #64748b; text-transform: uppercase; }
                            
                            .tag-list { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px; }
                            .tag { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 10pt; }
                            .tag-red { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
                            
                            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            .table th { background: #f8fafc; text-align: left; padding: 8px; font-size: 10pt; color: #334155; border-bottom: 1px solid #cbd5e1; }
                            .table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
                            
                            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                            
                            .empty-msg { font-style: italic; color: #94a3b8; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <p class="doc-name">${drName}</p>
                        <p class="doc-title">Médecin Généraliste</p>
                        <p style="font-size:9pt; margin-top:5px;">Mémo généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                    </div>

                    <div class="title">Dossier Médical Complet</div>

                    <div class="section">
                        <div class="patient-grid">
                            <div>
                                <div class="info-row"><div class="info-label">Patient :</div><div class="info-val">${d.patient}</div></div>
                                <div class="info-row"><div class="info-label">Âge :</div><div class="info-val">${d.age} ans</div></div>
                                <div class="info-row"><div class="info-label">Sexe :</div><div class="info-val">Non spécifié</div></div>
                            </div>
                            <div>
                                <div class="info-row"><div class="info-label">Identifiant / CIN :</div><div class="info-val">${d.cin}</div></div>
                                <div class="info-row"><div class="info-label">Assurance :</div><div class="info-val">${d.typeAssurance}</div></div>
                                <div class="info-row"><div class="info-label">Dernière visite :</div><div class="info-val">${d.dernierRdv}</div></div>
                            </div>
                        </div>

                        <div class="vitals-banner">
                            <div class="vital"><div class="vital-lbl">Groupe Sanguin</div><div class="vital-val">${d.groupeSanguin}</div></div>
                            <div class="vital"><div class="vital-lbl">Poids</div><div class="vital-val">${d.poids ? d.poids + ' kg' : 'N/A'}</div></div>
                            <div class="vital"><div class="vital-lbl">Taille</div><div class="vital-val">${d.taille ? d.taille + ' cm' : 'N/A'}</div></div>
                            <div class="vital"><div class="vital-lbl">IMC</div><div class="vital-val">${d.imc || 'N/A'}</div></div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="sec-title">Antécédents & Allergies</div>
                        <div style="margin-bottom:10px;">
                            <strong>Antécédents Médicaux :</strong>
                            <div class="tag-list">
                                ${d.antecedentsMedicaux.length > 0 ? d.antecedentsMedicaux.map((a: string) => '<span class="tag">' + a + '</span>').join('') : '<span class="empty-msg">Aucun</span>'}
                            </div>
                        </div>
                        <div style="margin-bottom:10px;">
                            <strong>Allergies signalées :</strong>
                            <div class="tag-list">
                                ${d.allergies.length > 0 ? d.allergies.map((a: string) => '<span class="tag tag-red">' + a + '</span>').join('') : '<span class="empty-msg">Aucune allergie</span>'}
                            </div>
                        </div>
                        <div>
                            <strong>Traitements en cours :</strong>
                            <div class="tag-list">
                                ${d.traitementEnCours.length > 0 ? d.traitementEnCours.map((a: string) => '<span class="tag">' + a + '</span>').join('') : '<span class="empty-msg">Aucun traitement</span>'}
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="sec-title">Historique des Consultations</div>
                        ${d.consultations.length > 0 ? `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th style="width: 15%">Date</th>
                                    <th style="width: 35%">Motif</th>
                                    <th style="width: 50%">Diagnostic & Conclusion</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${d.consultations.map((c: any) => `
                                <tr>
                                    <td><strong>${c.date}</strong></td>
                                    <td>${c.motif}</td>
                                    <td>${c.diagnostic || 'Non spécifié'}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ` : '<p class="empty-msg">Aucune consultation enregistrée pour le moment.</p>'}
                    </div>

                    <div class="footer">
                        Document confidentiel - Soumis au secret médical.<br>
                        Généré par MediCab Pro SaaS - 100% sécurisé (Certifié RGPD)
                    </div>
                </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        doc?.open();
        doc?.write(content);
        doc?.close();

        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    }
}
