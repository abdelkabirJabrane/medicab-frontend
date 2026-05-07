import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        InputTextModule,
        PasswordModule,
        RippleModule,
        DividerModule
    ],
    template: `
        <div class="surface-ground flex align-items-center
                justify-content-center
                min-h-screen min-w-screen overflow-hidden">

            <div class="flex flex-column align-items-center
                    justify-content-center">

                <div style="border-radius:56px;
                        padding:0.3rem;
                        background:linear-gradient(
                        180deg,
                        var(--primary-color) 10%,
                        rgba(33,150,243,0) 30%)">

                    <div class="surface-card py-6 px-5
                            sm:px-8"
                         style="border-radius:53px;
                            min-width:320px;
                            max-width:450px">

                        <!-- Logo -->
                        <div class="text-center mb-5">
                            <div style="font-size:3rem"
                                 class="mb-3">🏥</div>
                            <div class="text-900 text-3xl
                                    font-bold mb-2">
                                MedGest
                            </div>
                            <span class="text-500 text-sm">
                            Plateforme SaaS Médicale
                        </span>
                        </div>

                        <!-- Formulaire -->
                        <div>
                            <label class="block text-900
                                      font-medium mb-2">
                                Email
                            </label>
                            <input
                                pInputText
                                [(ngModel)]="email"
                                type="email"
                                placeholder="email@MedGest.ma"
                                class="w-full mb-3"/>

                            <label class="block text-900
                                      font-medium mb-2">
                                Mot de passe
                            </label>
                            <p-password
                                [(ngModel)]="password"
                                placeholder="••••••••"
                                [toggleMask]="true"
                                [feedback]="false"
                                styleClass="w-full mb-3">
                            </p-password>

                            <!-- Erreur -->
                            <div *ngIf="errorMessage"
                                 class="p-3 mb-3 border-round
                                    text-sm"
                                 style="background:#fef2f2;
                                    border-left:3px solid #ef4444;
                                    color:#b91c1c">
                                <i class="pi pi-exclamation-circle mr-2"></i>
                                {{ errorMessage }}
                            </div>

                            <p-button
                                label="Se connecter"
                                icon="pi pi-sign-in"
                                styleClass="w-full"
                                [loading]="loading"
                                (onClick)="onLogin()">
                            </p-button>
                        </div>

                        <p-divider align="center"
                                   styleClass="my-4">
                        <span class="text-500 text-sm">
                            Accès rapide
                        </span>
                        </p-divider>

                        <!-- Boutons rôles -->
                        <div class="grid">

                            <!-- Médecin -->
                            <div class="col-6 pr-1">
                                <div pRipple
                                     (click)="loginAs('medecin')"
                                     class="p-3 border-round-xl
                                        border-1 cursor-pointer"
                                     style="background:#eff6ff;
                                        border-color:#bfdbfe">
                                    <div class="flex align-items-center gap-2">
                                        <i class="pi pi-user text-xl"
                                           style="color:#1d4ed8"></i>
                                        <div>
                                            <div class="font-semibold text-sm"
                                                 style="color:#1e3a8a">
                                                Médecin
                                            </div>
                                            <div class="text-xs"
                                                 style="color:#93c5fd">
                                                medecin&#64;MedGest.ma
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Secrétaire -->
                            <div class="col-6 pl-1">
                                <div pRipple
                                     (click)="loginAs('secretaire')"
                                     class="p-3 border-round-xl
                                        border-1 cursor-pointer"
                                     style="background:#f0fdf4;
                                        border-color:#bbf7d0">
                                    <div class="flex align-items-center gap-2">
                                        <i class="pi pi-briefcase text-xl"
                                           style="color:#16a34a"></i>
                                        <div>
                                            <div class="font-semibold text-sm"
                                                 style="color:#14532d">
                                                Secrétaire
                                            </div>
                                            <div class="text-xs"
                                                 style="color:#86efac">
                                                secretaire&#64;MedGest.ma
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Admin -->
                            <div class="col-6 pr-1 mt-2">
                                <div pRipple
                                     (click)="loginAs('admin')"
                                     class="p-3 border-round-xl
                                        border-1 cursor-pointer"
                                     style="background:#fff7ed;
                                        border-color:#fed7aa">
                                    <div class="flex align-items-center gap-2">
                                        <i class="pi pi-cog text-xl"
                                           style="color:#ea580c"></i>
                                        <div>
                                            <div class="font-semibold text-sm"
                                                 style="color:#7c2d12">
                                                Super Admin
                                            </div>
                                            <div class="text-xs"
                                                 style="color:#fdba74">
                                                admin&#64;MedGest.ma
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Patient -->
                            <div class="col-6 pl-1 mt-2">
                                <div pRipple
                                     (click)="loginAs('patient')"
                                     class="p-3 border-round-xl
                                        border-1 cursor-pointer"
                                     style="background:#faf5ff;
                                        border-color:#e9d5ff">
                                    <div class="flex align-items-center gap-2">
                                        <i class="pi pi-heart text-xl"
                                           style="color:#9333ea"></i>
                                        <div>
                                            <div class="font-semibold text-sm"
                                                 style="color:#581c87">
                                                Patient
                                            </div>
                                            <div class="text-xs"
                                                 style="color:#d8b4fe">
                                                patient&#64;MedGest.ma
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {

    email = '';
    password = '';
    loading = false;
    errorMessage = '';

    constructor(private router: Router) {}

    onLogin() {
        this.loading = true;
        this.errorMessage = '';

        setTimeout(() => {
            if (this.email.includes('medecin')) {
                this.router.navigate(
                    ['/medecin/dashboard']);
            } else if (
                this.email.includes('secretaire')) {
                this.router.navigate(
                    ['/secretaire/dashboard']);
            } else if (
                this.email.includes('admin')) {
                this.router.navigate(
                    ['/admin/dashboard']);
            } else if (
                this.email.includes('patient')) {
                this.router.navigate(
                    ['/patient/dashboard']);
            } else {
                this.errorMessage =
                    'Email ou mot de passe incorrect !';
            }
            this.loading = false;
        }, 1000);
    }

    loginAs(role: string) {
        const routes: any = {
            medecin:    '/medecin/dashboard',
            secretaire: '/secretaire/dashboard',
            admin:      '/admin/dashboard',
            patient:    '/patient/dashboard'
        };
        this.router.navigate([routes[role]]);
    }
}
