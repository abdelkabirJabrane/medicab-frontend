import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TabsModule } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';

@Component({
  selector: 'app-comptes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, InputTextModule, ButtonModule, TableModule, PasswordModule,
    ToastModule, DialogModule, TagModule, RippleModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './comptes.html',
  styleUrl: './comptes.scss'
})
export class ComptesComponent implements OnInit {

  // ── Profil Médecin ─────────────────────────────
  loadingProfil = false;
  medecin = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    newPassword: ''
  };

  // ── Abonnement (lié au cabinet) ─────────────────
  abonnement = {
    plan: 'Starter - Essai gratuit',
    statut: 'Actif',
    joursRestants: 0
  };

  // ── Secrétaires ─────────────────────────────────
  secretaires: any[] = [];
  loadingSecretaires = false;
  secretaireDialog = false;
  isEditMode = false;
  secretaire: any = {};

  // Max 2 secrétaires
  readonly MAX_SECRETAIRES = 2;

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private userAdminService: UserAdminService
  ) {}

  ngOnInit() {
    this.loadProfil();
    this.loadSecretaires();
  }

  // ──────────── PROFIL ────────────
  loadProfil() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.loadingProfil = true;
      this.userAdminService.getById(user.id).subscribe({
        next: (fullUser) => {
          this.medecin.nom = fullUser.lastName || '';
          this.medecin.prenom = fullUser.firstName || '';
          this.medecin.email = fullUser.email || '';
          this.medecin.telephone = fullUser.phoneNumber || '';
          this.loadingProfil = false;
        },
        error: () => {
          this.loadingProfil = false;
          // Fallback on cached user
          this.medecin.nom = user.lastName || '';
          this.medecin.prenom = user.firstName || '';
          this.medecin.email = user.email || '';
          this.medecin.telephone = user.phoneNumber || '';
        }
      });
    }
  }

  sauvegarderProfil() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.loadingProfil = true;
    const updatePayload = {
      firstName: this.medecin.prenom,
      lastName: this.medecin.nom,
      email: this.medecin.email,
      phoneNumber: this.medecin.telephone
    };

    this.userAdminService.update(user.id, updatePayload).subscribe({
      next: (updatedUser) => {
        // Mettre à jour le localStorage et le BehaviorSubject
        const current = this.authService.getCurrentUser()!;
        const merged = { 
          ...current, 
          firstName: updatedUser.firstName, 
          lastName: updatedUser.lastName, 
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber
        };
        localStorage.setItem('medicab-user', JSON.stringify(merged));
        window.dispatchEvent(new Event('storage'));
        this.loadingProfil = false;
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Profil mis à jour avec succès' });
      },
      error: (err) => {
        this.loadingProfil = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message || 'Impossible de mettre à jour le profil' });
      }
    });

    // Changer le mot de passe si saisi
    if (this.medecin.newPassword && this.medecin.newPassword.length >= 6) {
      this.userAdminService.resetPassword(user.id, this.medecin.newPassword).subscribe({
        next: () => this.messageService.add({ severity: 'info', summary: 'Mot de passe', detail: 'Mot de passe modifié' }),
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur MDP', detail: err.message })
      });
      this.medecin.newPassword = '';
    }
  }

  // ──────────── SECRÉTAIRES ────────────
  loadSecretaires() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.loadingSecretaires = true;
    this.userAdminService.getSecretairesByMedecin(user.id).subscribe({
      next: (data) => {
        this.secretaires = data.map(s => ({
          id: s.id,
          nom: s.lastName,
          prenom: s.firstName,
          email: s.email,
          telephone: s.phoneNumber || '',
          username: s.username,
          statut: s.active ? 'Actif' : 'Inactif'
        }));
        this.loadingSecretaires = false;
      },
      error: (err) => {
        this.loadingSecretaires = false;
        console.warn('Erreur chargement secrétaires:', err);
      }
    });
  }

  get canAddSecretaire(): boolean {
    return this.secretaires.length < this.MAX_SECRETAIRES;
  }

  openNew() {
    if (!this.canAddSecretaire) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Limite atteinte',
        detail: `Vous ne pouvez pas créer plus de ${this.MAX_SECRETAIRES} secrétaires`
      });
      return;
    }
    this.secretaire = {};
    this.isEditMode = false;
    this.secretaireDialog = true;
  }

  editSecretaire(sec: any) {
    this.secretaire = { ...sec };
    this.isEditMode = true;
    this.secretaireDialog = true;
  }

  hideDialog() {
    this.secretaireDialog = false;
    this.secretaire = {};
  }

  saveSecretaire() {
    if (!this.secretaire.username?.trim() || !this.secretaire.nom?.trim() || !this.secretaire.prenom?.trim() || !this.secretaire.email?.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Nom d\'utilisateur, nom, prénom et email sont obligatoires' });
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (this.isEditMode && this.secretaire.id) {
      // Modification
      const updatePayload = {
        firstName: this.secretaire.prenom,
        lastName: this.secretaire.nom,
        email: this.secretaire.email,
        phoneNumber: this.secretaire.telephone || ''
      };
      this.userAdminService.update(this.secretaire.id, updatePayload).subscribe({
        next: () => {
          this.loadSecretaires();
          this.hideDialog();
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Secrétaire mise à jour' });
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
      });
    } else {
      // Création
      if (!this.secretaire.password || this.secretaire.password.length < 6) {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Le mot de passe doit faire au moins 6 caractères' });
        return;
      }
      
      const payload = {
        username: this.secretaire.username.trim(),
        email: this.secretaire.email,
        firstName: this.secretaire.prenom,
        lastName: this.secretaire.nom,
        phoneNumber: this.secretaire.telephone || '',
        password: this.secretaire.password,
        roles: ['ROLE_SECRETAIRE'],
        medecinId: user.id
      };
      this.userAdminService.createSecretaire(payload).subscribe({
        next: () => {
          this.loadSecretaires();
          this.hideDialog();
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Compte secrétaire créé avec succès' });
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
      });
    }
  }

  toggleStatut(sec: any) {
    const action = sec.statut === 'Actif'
      ? this.userAdminService.deactivate(sec.id)
      : this.userAdminService.activate(sec.id);

    action.subscribe({
      next: () => {
        sec.statut = sec.statut === 'Actif' ? 'Inactif' : 'Actif';
        this.messageService.add({ severity: 'info', summary: 'Statut mis à jour', detail: `Compte ${sec.statut}` });
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
    });
  }

  deleteSecretaire(sec: any) {
    this.userAdminService.delete(sec.id).subscribe({
      next: () => {
        this.secretaires = this.secretaires.filter(s => s.id !== sec.id);
        this.messageService.add({ severity: 'info', summary: 'Supprimé', detail: 'Compte secrétaire supprimé' });
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message })
    });
  }

  getSeverity(statut: string): 'success' | 'danger' {
    return statut === 'Actif' ? 'success' : 'danger';
  }
}
