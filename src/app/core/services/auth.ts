import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthUser {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    gender?: string;
    roles: string[];
    medecinId?: number;
    tenantId?: number;
    active: boolean;
    profileImageUrl?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: AuthUser;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.services.auth;
    private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
    private tokenKey = 'MedGest-token';
    private userKey = 'MedGest-user';

    currentUser$ = this.currentUserSubject.asObservable();

    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        this.restoreSession();
    }

    /**
     * Restaurer la session depuis localStorage
     */
    private restoreSession(): void {
        const savedUser = localStorage.getItem(this.userKey);
        const savedToken = localStorage.getItem(this.tokenKey);
        if (savedUser && savedToken) {
            try {
                const user: AuthUser = JSON.parse(savedUser);
                this.currentUserSubject.next(user);
            } catch {
                this.clearStorage();
            }
        }
    }

    /**
     * Login réel vers le backend
     * Le backend utilise @RequestParam → on envoie en form-urlencoded
     */
    login(username: string, password: string): Observable<AuthResponse> {
        const params = new HttpParams()
            .set('username', username)
            .set('password', password);

        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, null, { params }).pipe(
            tap(response => {
                this.handleAuthSuccess(response);
            }),
            catchError(error => {
                let message = 'Erreur de connexion';
                if (error.status === 401 || error.status === 403) {
                    message = 'Nom d\'utilisateur ou mot de passe incorrect';
                } else if (error.status === 0) {
                    message = 'Impossible de joindre le serveur. Vérifiez que le backend est démarré.';
                } else if (error.error?.message) {
                    message = error.error.message;
                }
                return throwError(() => new Error(message));
            })
        );
    }

    /**
     * Register - inscription d'un nouvel utilisateur
     */
    register(registerData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/register`, registerData).pipe(
            tap(response => {
                if (response.access_token) {
                    const authResponse: AuthResponse = {
                        access_token: response.access_token,
                        token_type: response.token_type || 'Bearer',
                        user: response.user
                    };
                    this.handleAuthSuccess(authResponse);
                }
            }),
            catchError(error => {
                let message = 'Erreur lors de l\'inscription';
                if (error.error?.error) {
                    message = error.error.error;
                } else if (error.error?.errors) {
                    // Handle Spring validation errors
                    message = Object.values(error.error.errors).join(', ');
                } else if (error.error?.message) {
                    message = error.error.message;
                }
                return throwError(() => new Error(message));
            })
        );
    }

    /**
     * Traitement après login/register réussi
     */
    private handleAuthSuccess(response: AuthResponse): void {
        // Normaliser les rôles (le backend renvoie un Set, Angular le reçoit comme array)
        const user = response.user;
        if (user.roles && !Array.isArray(user.roles)) {
            user.roles = Object.values(user.roles);
        }

        localStorage.setItem(this.tokenKey, response.access_token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.currentUserSubject.next(user);
    }

    /**
     * Récupérer le token JWT stocké
     */
    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Récupérer l'utilisateur courant
     */
    getCurrentUser(): AuthUser | null {
        return this.currentUserSubject.value;
    }

    /**
     * Mettre à jour l'utilisateur dans le stockage local et le sujet
     */
    updateCurrentUserInStorage(user: AuthUser): void {
        const currentUser = this.getCurrentUser();
        const newUser = { ...currentUser, ...user };
        localStorage.setItem(this.userKey, JSON.stringify(newUser));
        this.currentUserSubject.next(newUser);
    }

    /**
     * Vérifier si l'utilisateur est connecté
     */
    isLoggedIn(): boolean {
        return !!this.getToken() && !!this.getCurrentUser();
    }

    /**
     * Récupérer les rôles de l'utilisateur
     */
    getRoles(): string[] {
        return this.getCurrentUser()?.roles || [];
    }

    /**
     * Récupérer le rôle principal (premier rôle)
     */
    getPrimaryRole(): string {
        const roles = this.getRoles();
        // Priorité : SUPER_ADMIN > MEDECIN > SECRETAIRE > PATIENT
        const priority = ['ROLE_SUPER_ADMIN', 'ROLE_MEDECIN', 'ROLE_SECRETAIRE', 'ROLE_PATIENT'];
        for (const role of priority) {
            if (roles.includes(role)) {
                return role;
            }
        }
        return roles[0] || '';
    }

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     */
    hasRole(role: string): boolean {
        return this.getRoles().includes(role);
    }

    /**
     * Vérifier si l'utilisateur a au moins un des rôles
     */
    hasAnyRole(roles: string[]): boolean {
        return roles.some(role => this.hasRole(role));
    }

    /**
     * Obtenir la route de redirection selon le rôle
     */
    getRedirectRouteByRole(): string {
        const role = this.getPrimaryRole();
        switch (role) {
            case 'ROLE_SUPER_ADMIN':
                return '/admin/dashboard';
            case 'ROLE_MEDECIN':
                return '/medecin/dashboard';
            case 'ROLE_SECRETAIRE':
                return '/secretaire/dashboard';
            case 'ROLE_PATIENT':
                return '/patient/dashboard';
            default:
                return '/auth/login';
        }
    }

    /**
     * Naviguer vers le dashboard approprié selon le rôle
     */
    redirectByRole(): void {
        const route = this.getRedirectRouteByRole();
        this.router.navigate([route]);
    }

    /**
     * Déconnexion
     */
    logout(): void {
        this.clearStorage();
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
    }

    private clearStorage(): void {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }
}
