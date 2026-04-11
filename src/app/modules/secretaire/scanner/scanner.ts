import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PatientService } from '../../../core/services/patient';
import { MedicalRecordService } from '../../../core/services/medical-record';

@Component({
    selector: 'app-secretaire-scanner',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, CardModule, SelectModule, ToastModule],
    providers: [MessageService],
    templateUrl: './scanner.html',
    styleUrls: ['./scanner.scss']
})
export class ScannerComponent implements OnInit {
    pendingFiles = [
        { id: 1, name: 'SCAN_20260409_1021.pdf', size: '1.2 MB', date: 'Auj. 10:21', thumbnail: 'pi pi-file-pdf' },
        { id: 2, name: 'SCAN_20260409_1105.pdf', size: '0.8 MB', date: 'Auj. 11:05', thumbnail: 'pi pi-file-pdf' },
        { id: 3, name: 'ORD_EXTERNE_BERRADA.pdf', size: '2.1 MB', date: 'Auj. 11:30', thumbnail: 'pi pi-file-pdf' },
        { id: 4, name: 'BIO_SANG_RESULTS.pdf', size: '1.5 MB', date: 'Auj. 12:45', thumbnail: 'pi pi-file-pdf' }
    ];

    selectedFile: any = null;
    searchTerm: string = '';
    searchResults: any[] = [];
    selectedPatient: any = null;
    
    docCategories = [
        { label: 'Ordonnance Externe', value: 'ORDONNANCE' },
        { label: 'Analyse Biologique', value: 'BIOLOGIE' },
        { label: 'Imagerie Médicale', value: 'IMAGERIE' },
        { label: 'Certificat / Autre', value: 'AUTRE' }
    ];
    selectedCategory = 'ORDONNANCE';

    processing = false;

    constructor(
        private patientService: PatientService,
        private medicalRecordService: MedicalRecordService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        if (this.pendingFiles.length > 0) {
            this.selectedFile = this.pendingFiles[0];
        }
    }

    onSearch() {
        if (this.searchTerm.length < 2) {
            this.searchResults = [];
            return;
        }
        this.patientService.search(this.searchTerm).subscribe(res => {
            this.searchResults = res;
        });
    }

    selectPatient(p: any) {
        this.selectedPatient = p;
        this.searchResults = [];
        this.searchTerm = `${p.nom} ${p.prenom}`;
    }

    assignDocument() {
        if (!this.selectedPatient || !this.selectedFile) {
            this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner un patient et un fichier' });
            return;
        }

        this.processing = true;
        
        // Simulation d'upload vers le dossier du patient
        setTimeout(() => {
            this.messageService.add({ 
                severity: 'success', 
                summary: 'Document Lié', 
                detail: `Le fichier ${this.selectedFile.name} a été ajouté au dossier de ${this.selectedPatient.nom}` 
            });
            
            // Retirer de la liste d'attente
            this.pendingFiles = this.pendingFiles.filter(f => f.id !== this.selectedFile.id);
            this.selectedFile = this.pendingFiles.length > 0 ? this.pendingFiles[0] : null;
            this.selectedPatient = null;
            this.searchTerm = '';
            this.processing = false;
        }, 1500);
    }

    previewFile(file: any) {
        this.selectedFile = file;
    }

    onFileScanned(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        this.messageService.add({ severity: 'info', summary: 'Numérisation...', detail: 'Connexion au scanner et capture en cours' });
        
        // Simulation du délai de scan
        setTimeout(() => {
            const newScan = {
                id: Date.now(),
                name: file.name,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                date: 'À l\'instant',
                thumbnail: file.type.includes('pdf') ? 'pi pi-file-pdf' : 'pi pi-image'
            };

            this.pendingFiles.unshift(newScan);
            this.selectedFile = newScan;
            this.messageService.add({ severity: 'success', summary: 'Scan Terminé', detail: 'Le document est prêt à être traité' });
            
            // On vide l'input pour pouvoir scanner le même fichier si besoin
            event.target.value = '';
        }, 2000);
    }
}
