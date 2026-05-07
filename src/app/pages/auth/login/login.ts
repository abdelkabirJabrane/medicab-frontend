import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../core/services/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, InputTextModule],
    templateUrl: './login.html',
    styleUrls: ['./login.scss']
})
export class Login {
    username = '';
    password = '';
    loading = false;
    errorMessage = '';
    showPassword = false;
    private returnUrl = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {
        // Si déjà connecté, rediriger vers le dashboard
        if (this.authService.isLoggedIn()) {
            this.authService.redirectByRole();
        }

        // Récupérer l'URL de retour si elle existe
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
    }

    /**
     * Login réel via le backend
     */
    onLogin() {
        if (!this.username || !this.password) {
            this.errorMessage = 'Veuillez remplir tous les champs';
            this.cdr.detectChanges();
            return;
        }

        this.loading = true;
        this.errorMessage = '';
        this.cdr.detectChanges();

        this.authService.login(this.username, this.password).subscribe({
            next: () => {
                this.loading = false;
                // Rediriger vers l'URL de retour ou le dashboard par rôle
                if (this.returnUrl) {
                    this.router.navigateByUrl(this.returnUrl);
                } else {
                    this.authService.redirectByRole();
                }
                this.cdr.detectChanges();
            },
            error: (err: Error) => {
                this.loading = false;
                this.errorMessage = err.message;
                this.cdr.detectChanges();
            }
        });
    }

    /**
     * Accès rapide (démonstration) - garde les boutons pour le développement
     * Ces boutons logent l'utilisateur via le backend aussi
     */
    loginAs(role: string) {
        const credentials: Record<string, { username: string; password: string }> = {
            medecin: { username: 't.maghroub', password: 'Abdo2002@' },
            secretaire: { username: 'Said.ej', password: 'Abdo2002@' },
            admin: { username: 'admin', password: 'Admin2025@' },
            patient: { username: 'patient', password: 'patient123' }
        };

        const cred = credentials[role];
        if (cred) {
            this.username = cred.username;
            this.password = cred.password;
            this.onLogin();
        }
    }
}
