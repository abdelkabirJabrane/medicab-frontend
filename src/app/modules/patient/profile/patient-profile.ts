import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService, AuthUser } from '../../../core/services/auth';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, InputTextModule, ButtonModule],
  providers: [MessageService],
  templateUrl: './patient-profile.html',
  styleUrls: ['./patient-profile.scss']
})
export class PatientProfileComponent implements OnInit {

  profile: any = {};
  loading = false;
  saving = false;
  private usersUrl = environment.services.users;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      // On fait une copie pour ne pas modifier l'original avant sauvegarde
      this.profile = { ...user };
    }
  }

  saveProfile() {
    this.saving = true;
    
    // Appel au backend pour mettre à jour l'utilisateur
    // L'URL correcte est /api/users/{id} sur le port 8088
    this.http.put(`${this.usersUrl}/${this.profile.id}`, this.profile).subscribe({
      next: (updatedUser: any) => {
        this.messageService.add({ 
            severity: 'success', 
            summary: 'Profil mis à jour', 
            detail: 'Vos modifications ont été enregistrées avec succès.' 
        });
        
        // Mettre à jour la session locale
        this.authService.updateCurrentUserInStorage(updatedUser);
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ 
            severity: 'error', 
            summary: 'Erreur', 
            detail: 'Impossible de mettre à jour le profil.' 
        });
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
