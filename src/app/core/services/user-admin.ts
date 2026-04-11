import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
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
    accountLocked: boolean;
    lastLogin?: string;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserAdminService {
    private url = environment.services.users;

    constructor(private http: HttpClient) {}

    /**
     * ✅ Récupérer tous les utilisateurs
     * GET /api/users
     */
    getAll(): Observable<User[]> {
        return this.http.get<User[]>(this.url).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Récupérer un utilisateur par ID
     * GET /api/users/{id}
     */
    getById(id: number): Observable<User> {
        return this.http.get<User>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Créer un utilisateur (passe souvent par Auth / Register)
     * POST /api/users
     */
    create(user: any): Observable<User> {
        return this.http.post<User>(this.url, user).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Mettre à jour un utilisateur
     * PUT /api/users/{id}
     */
    update(id: number, user: any): Observable<User> {
        return this.http.put<User>(`${this.url}/${id}`, user).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Activer/Désactiver
     */
    activate(id: number): Observable<User> {
        return this.http.put<User>(`${this.url}/${id}/activate`, {}).pipe(catchError(this.handleError));
    }

    deactivate(id: number): Observable<User> {
        return this.http.put<User>(`${this.url}/${id}/deactivate`, {}).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Supprimer (Attention, souvent irréversible)
     * DELETE /api/users/{id}
     */
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Récupérer les secrétaires d'un médecin
     * GET /api/users/secretaires/by-medecin/{medecinId}
     */
    getSecretairesByMedecin(medecinId: number): Observable<User[]> {
        return this.http.get<User[]>(`${this.url}/secretaires/by-medecin/${medecinId}`).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Créer un compte secrétaire lié à un médecin
     * POST /api/users
     */
    createSecretaire(payload: {
        username: string;
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        password: string;
        roles: string[];
        medecinId: number;
    }): Observable<User> {
        return this.http.post<User>(this.url, payload).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Réinitialiser le mot de passe d'un utilisateur
     * PUT /api/users/{id}/reset-password
     */
    resetPassword(id: number, newPassword: string): Observable<User> {
        return this.http.put<User>(`${this.url}/${id}/reset-password`, null, {
            params: { newPassword }
        }).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Error Handler
     */
    private handleError(error: any) {
        console.error('❌ UserAdminService error:', error);
        const msg = error?.error?.message || error?.message || 'Erreur lors de l\'appel au User Service';
        return throwError(() => new Error(msg));
    }
}
