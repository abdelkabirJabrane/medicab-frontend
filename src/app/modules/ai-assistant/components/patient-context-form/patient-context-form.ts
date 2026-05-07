import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientContext } from '../../../../core/models/ai.model';
import { AuthService } from '../../../../core/services/auth';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PatientService } from '../../../../core/services/patient';
import { MedicalRecordService } from '../../../../core/services/medical-record';

@Component({
  selector: 'app-patient-context-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  templateUrl: './patient-context-form.html',
  styleUrls: ['./patient-context-form.scss']
})
export class PatientContextFormComponent {
  @Output() contextReady = new EventEmitter<PatientContext>();

  context: PatientContext = {
    nom_medecin: '',
    specialite: '',
    nom_patient: '',
    age: '',
    sexe: '',
    antecedents: '',
    allergies: '',
    medicaments_actuels: '',
    derniere_visite: ''
  };

  filteredPatients: any[] = [];
  selectedPatient: any = null;
  loadingDossier = false;
  doctorInitials = '';

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private medicalRecordService: MedicalRecordService
  ) {
    const user = this.authService.getCurrentUser();
    if (user) {
        this.context.nom_medecin = `Dr. ${user.firstName || ''} ${user.lastName || ''}`.trim();
        this.context.specialite = user.roles?.includes('ROLE_MEDECIN') ? 'Médecin Généraliste' : 'Médecin';
        const f = (user.firstName || ' ')[0] || '';
        const l = (user.lastName || ' ')[0] || '';
        this.doctorInitials = (f + l).toUpperCase();
    }
  }

  searchPatients(event: any) {
    const query = event.query;
    this.patientService.search(query).subscribe({
        next: (data) => {
            this.filteredPatients = data.map(p => ({
                ...p,
                displayName: `${p.prenom || ''} ${p.nom || ''}`.trim() || p.cin || 'Patient',
                initiales: ((p.prenom?.[0] || '') + (p.nom?.[0] || '')).toUpperCase(),
                age: p.dateNaissance ? this.calculateAge(p.dateNaissance) : ''
            }));
        }
    });
  }

  onPatientSelect(event: any) {
    const patient = event.value;
    this.context.patient_id = patient.id;
    this.selectedPatient = patient;

    // Infos de base depuis le patient
    this.context.nom_patient = `${patient.prenom || ''} ${patient.nom || ''}`.trim();
    this.context.sexe = (patient.sexe === 'F' || patient.sexe === 'FEMININ') ? 'F' : 'M';
    if (patient.dateNaissance) {
        this.context.age = this.calculateAge(patient.dateNaissance).toString();
    }

    // Réinitialiser le dossier
    this.context.antecedents = '';
    this.context.allergies = '';
    this.context.medicaments_actuels = '';

    // Charger le dossier médical automatiquement
    this.loadingDossier = true;
    this.medicalRecordService.getDossierByPatient(patient.id).subscribe({
        next: (dossier: any) => {
            this.loadingDossier = false;
            if (dossier) {
                const parts = [
                    dossier.antecedentsPersonnels,
                    dossier.antecedentsFamiliaux
                ].filter(Boolean);
                this.context.antecedents = parts.join(' | ') || '';
                this.context.allergies = dossier.allergies || '';
                this.context.medicaments_actuels = dossier.medicamentsEnCours || '';
                if (dossier.groupeSanguin) {
                    // Ajouter groupe sanguin au contexte via nom_patient pour l'IA
                }
            }
        },
        error: () => {
            this.loadingDossier = false;
            // Silencieux — dossier peut ne pas exister encore
        }
    });
  }

  private calculateAge(dateNaissance: any): number {
    const birthDate = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }

  onSubmit() {
    if (!this.selectedPatient) return;
    if (typeof this.selectedPatient === 'string') {
        this.context.nom_patient = this.selectedPatient;
    }
    this.contextReady.emit(this.context);
  }
}
