import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';

@Component({
    selector: 'app-sec-comptes',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        InputTextModule, ButtonModule, PasswordModule, ToastModule, TagModule, CardModule
    ],
    providers: [MessageService],
    templateUrl: './comptes.html',
    styleUrls: ['./comptes.scss']
})
export class SecComptesComponent implements OnInit {

    loading = false;

    profil = {
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        newPassword: ''
    };

    medecinInfo = {
        nom: '',
        email: '',
        specialite: 'Médecin Généraliste'
    };

    constructor(
        private messageService: MessageService,
        private authService: AuthService,
        private userAdminService: UserAdminService
    ) {}

    ngOnInit() {
        this.loadProfil();
    }

    loadProfil() {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.loading = true;
            this.userAdminService.getById(user.id).subscribe({
                next: (fullUser) => {
                    this.profil.prenom    = fullUser.firstName || '';
                    this.profil.nom       = fullUser.lastName  || '';
                    this.profil.email     = fullUser.email     || '';
                    this.profil.telephone = fullUser.phoneNumber || '';
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                    this.profil.prenom    = user.firstName || '';
                    this.profil.nom       = user.lastName  || '';
                    this.profil.email     = user.email     || '';
                    this.profil.telephone = (user as any).phoneNumber || '';
                }
            });

            // Charger les infos du médecin lié
            if (user.medecinId) {
                this.userAdminService.getById(user.medecinId).subscribe({
                    next: (m) => {
                        this.medecinInfo.nom   = `Dr. ${m.firstName} ${m.lastName}`;
                        this.medecinInfo.email = m.email;
                    },
                    error: () => this.medecinInfo.nom = 'Médecin associé'
                });
            }
        }
    }

    get userInitials(): string {
        const p = this.profil.prenom ? this.profil.prenom[0] : '';
        const n = this.profil.nom    ? this.profil.nom[0]    : '';
        return (p + n).toUpperCase() || 'SE';
    }

    sauvegarder() {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        this.loading = true;
        const payload = {
            firstName:   this.profil.prenom,
            lastName:    this.profil.nom,
            email:       this.profil.email,
            phoneNumber: this.profil.telephone
        };

        this.userAdminService.update(user.id, payload).subscribe({
            next: (updated) => {
                // Mettre à jour localStorage
                const current = this.authService.getCurrentUser()!;
                const merged = {
                    ...current,
                    firstName:   updated.firstName,
                    lastName:    updated.lastName,
                    email:       updated.email,
                    phoneNumber: updated.phoneNumber
                };
                localStorage.setItem('medicab-user', JSON.stringify(merged));
                window.dispatchEvent(new Event('storage'));
                this.loading = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Profil mis à jour !' });
            },
            error: (err) => {
                this.loading = false;
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message || 'Impossible de sauvegarder' });
            }
        });

        // Changer mot de passe si fourni
        if (this.profil.newPassword && this.profil.newPassword.length >= 6) {
            this.userAdminService.resetPassword(user.id, this.profil.newPassword).subscribe({
                next: () => {
                    this.profil.newPassword = '';
                    this.messageService.add({ severity: 'info', summary: 'Sécurité', detail: 'Mot de passe modifié' });
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur MDP', detail: err.message })
            });
        }
    }
}
