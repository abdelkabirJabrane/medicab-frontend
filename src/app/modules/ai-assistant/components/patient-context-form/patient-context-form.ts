import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientContext } from '../../../../core/models/ai.model';
import { AuthService } from '../../../../core/services/auth';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PatientService } from '../../../../core/services/patient';

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

  constructor(
    private authService: AuthService,
    private patientService: PatientService
  ) {
    const user = this.authService.getCurrentUser();
    if (user) {
        this.context.nom_medecin = `Dr. ${user.firstName || ''} ${user.lastName || ''}`.trim();
        this.context.specialite = user.roles.includes('ROLE_MEDECIN') ? 'Médecin Généraliste' : '';
    }
  }

  searchPatients(event: any) {
    const query = event.query;
    this.patientService.search(query).subscribe({
        next: (data) => {
            this.filteredPatients = data.map(p => ({
                ...p,
                displayName: `${p.nom || ''} ${p.prenom || ''}`.trim() || p.cin || 'Patient sans nom'
            }));
        }
    });
  }

  onPatientSelect(event: any) {
    const patient = event.value;
    this.context.nom_patient = `${patient.nom} ${patient.prenom}`;
    this.context.sexe = patient.sexe === 'F' || patient.sexe === 'FEMININ' ? 'F' : 'M';
    
    if (patient.dateNaissance) {
        this.context.age = this.calculateAge(patient.dateNaissance).toString();
    }
    
    // Check if there are medical history / allergies in the patient record
    // Depending on the patient model, these might be in different fields
    this.context.antecedents = patient.antecedents || '';
    this.context.allergies = patient.allergies || '';
    this.context.medicaments_actuels = patient.traitementEnCours || '';
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
    if (typeof this.selectedPatient === 'string') {
        this.context.nom_patient = this.selectedPatient;
    } else if (this.selectedPatient && this.selectedPatient.displayName) {
        this.context.nom_patient = this.selectedPatient.displayName;
    }
    this.contextReady.emit(this.context);
  }
}
