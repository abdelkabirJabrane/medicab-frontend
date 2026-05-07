import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../core/services/auth';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, InputTextModule],
    templateUrl: './register.html',
    styleUrls: ['./register.scss']
})
export class RegisterComponent {
    
    userData = {
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'ROLE_PATIENT' // Inscription patient par défaut
    };

    loading = false;
    errorMessage = '';

    constructor(
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    onRegister() {
        if (!this.userData.username || !this.userData.password || !this.userData.email || !this.userData.firstName || !this.userData.lastName) {
            this.errorMessage = 'Veuillez remplir tous les champs obligatoires (Nom, Prénom, Email, etc.)';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        this.authService.register(this.userData).subscribe({
            next: () => {
                this.loading = false;
                // Rediriger vers le dashboard patient
                this.router.navigate(['/patient/dashboard']);
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.loading = false;
                this.errorMessage = err.message || 'Erreur lors de l\'inscription';
                this.cdr.detectChanges();
            }
        });
    }
}
