import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';

@Component({
    selector: 'app-admin-profil',
    standalone: true,
    imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, PasswordModule, ToastModule],
    providers: [MessageService],
    templateUrl: './profil.html',
    styleUrls: ['./profil.scss']
})
export class AdminProfilComponent implements OnInit {
    loading = false;
    user: any = {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        username: '',
        newPassword: ''
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
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
            this.loading = true;
            this.userAdminService.getById(currentUser.id).subscribe({
                next: (fullUser) => {
                    this.user.nom = fullUser.lastName || '';
                    this.user.prenom = fullUser.firstName || '';
                    this.user.email = fullUser.email || '';
                    this.user.telephone = fullUser.phoneNumber || '';
                    this.user.username = fullUser.username || '';
                    this.loading = false;
                },
                error: (err) => {
                    this.loading = false;
                    // Fallback
                    this.user.nom = currentUser.lastName || '';
                    this.user.prenom = currentUser.firstName || '';
                    this.user.email = currentUser.email || '';
                    this.user.username = currentUser.username || '';
                }
            });
        }
    }

    sauvegarderProfil() {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) return;

        this.loading = true;
        const updatePayload = {
            firstName: this.user.prenom,
            lastName: this.user.nom,
            email: this.user.email,
            phoneNumber: this.user.telephone
        };

        this.userAdminService.update(currentUser.id, updatePayload).subscribe({
            next: (updated) => {
                // Update local storage
                const user = this.authService.getCurrentUser()!;
                const merged = { 
                    ...user, 
                    firstName: updated.firstName, 
                    lastName: updated.lastName, 
                    email: updated.email,
                    phoneNumber: updated.phoneNumber
                };
                localStorage.setItem('MedGest-user', JSON.stringify(merged));
                window.dispatchEvent(new Event('storage'));
                
                this.loading = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Profil mis à jour' });
            },
            error: (err) => {
                this.loading = false;
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la mise à jour' });
            }
        });

        if (this.user.newPassword && this.user.newPassword.length >= 6) {
            this.userAdminService.resetPassword(currentUser.id, this.user.newPassword).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'info', summary: 'Sécurité', detail: 'Mot de passe modifié' });
                    this.user.newPassword = '';
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur MDP', detail: err.message })
            });
        }
    }
}
