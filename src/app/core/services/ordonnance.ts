import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface LigneOrdonnanceRequest {
    medicament: string;
    dci?: string;
    dosage?: string;
    forme?: string;
    posologie?: string;
    dureeTraitement?: number;   // ✅ entier (ex: 7)
    unite?: string;             // ✅ unité (ex: 'jours', 'semaines')
    instructions?: string;
    substituable?: boolean;
}

export interface LigneOrdonnanceResponse {
    id: number;
    medicament: string;
    dci?: string;
    dosage?: string;
    forme?: string;
    posologie?: string;
    dureeTraitement?: number;   // ✅ entier
    unite?: string;
    instructions?: string;
    substituable: boolean;
}

export interface OrdonnanceRequest {
    tenantId: number;
    consultationId: number;
    patientId: number;
    medecinId: number;
    dateEmission?: string;        // yyyy-MM-dd
    dateValidite?: string;        // yyyy-MM-dd
    instructions?: string;
    renouvellement?: boolean;
    statut?: string;              // ACTIVE | EXPIREE | ANNULEE
    lignes: LigneOrdonnanceRequest[];
}

export interface OrdonnanceResponse {
    id: number;
    tenantId: number;
    consultationId: number;
    patientId: number;
    medecinId: number;
    dateEmission?: string;
    dateValidite?: string;
    instructions?: string;
    renouvellement: boolean;
    statut?: string;
    valide: boolean;
    lignes: LigneOrdonnanceResponse[];
    dateCreation?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class OrdonnanceService {
    private url = environment.services.ordonnances;

    private get tenantId(): number {
        const user = this.authService.getCurrentUser();
        return user?.tenantId || 1; 
    }

    constructor(private http: HttpClient, private authService: AuthService) {}

    // ─────────────────────────────────────────────────────────────
    // 🔹 GET ALL (by tenant)
    // GET /api/ordonnances?tenantId=1
    // ─────────────────────────────────────────────────────────────
    getAll(): Observable<OrdonnanceResponse[]> {
        const params = new HttpParams().set('tenantId', this.tenantId);
        return this.http.get<OrdonnanceResponse[]>(this.url, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 GET BY ID
    // GET /api/ordonnances/{id}
    // ─────────────────────────────────────────────────────────────
    getById(id: number): Observable<OrdonnanceResponse> {
        return this.http.get<OrdonnanceResponse>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 GET BY PATIENT
    // GET /api/ordonnances/patient/{patientId}
    // ─────────────────────────────────────────────────────────────
    getByPatient(patientId: number): Observable<OrdonnanceResponse[]> {
        return this.http.get<OrdonnanceResponse[]>(`${this.url}/patient/${patientId}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 GET BY MÉDECIN
    // GET /api/ordonnances/medecin/{medecinId}
    // ─────────────────────────────────────────────────────────────
    getByMedecin(medecinId: number): Observable<OrdonnanceResponse[]> {
        return this.http.get<OrdonnanceResponse[]>(`${this.url}/medecin/${medecinId}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 GET BY CONSULTATION
    // GET /api/ordonnances/consultation/{consultationId}
    // ─────────────────────────────────────────────────────────────
    getByConsultation(consultationId: number): Observable<OrdonnanceResponse> {
        return this.http.get<OrdonnanceResponse>(`${this.url}/consultation/${consultationId}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 GET BY STATUT
    // GET /api/ordonnances/statut?tenantId=1&statut=ACTIVE
    // ─────────────────────────────────────────────────────────────
    getByStatut(statut: string): Observable<OrdonnanceResponse[]> {
        const params = new HttpParams().set('tenantId', this.tenantId).set('statut', statut);
        return this.http.get<OrdonnanceResponse[]>(`${this.url}/statut`, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 COUNT
    // GET /api/ordonnances/count?tenantId=1
    // ─────────────────────────────────────────────────────────────
    count(): Observable<number> {
        const params = new HttpParams().set('tenantId', this.tenantId);
        return this.http.get<number>(`${this.url}/count`, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 CREATE
    // POST /api/ordonnances
    // ─────────────────────────────────────────────────────────────
    create(dto: OrdonnanceRequest): Observable<OrdonnanceResponse> {
        const payload = {
            ...dto,
            tenantId: this.tenantId,
            renouvellement: dto.renouvellement ?? false,
            statut: dto.statut ?? 'ACTIVE'
        };
        console.log('📤 Ordonnance payload:', payload);
        return this.http.post<OrdonnanceResponse>(this.url, payload).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 UPDATE
    // PUT /api/ordonnances/{id}
    // ─────────────────────────────────────────────────────────────
    update(id: number, dto: OrdonnanceRequest): Observable<OrdonnanceResponse> {
        return this.http.put<OrdonnanceResponse>(`${this.url}/${id}`, dto).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 CHANGER STATUT
    // PATCH /api/ordonnances/{id}/statut?statut=EXPIREE
    // ─────────────────────────────────────────────────────────────
    changerStatut(id: number, statut: string): Observable<OrdonnanceResponse> {
        const params = new HttpParams().set('statut', statut);
        return this.http.patch<OrdonnanceResponse>(`${this.url}/${id}/statut`, null, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 DELETE
    // DELETE /api/ordonnances/{id}
    // ─────────────────────────────────────────────────────────────
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────────────────────
    // 🔹 ERROR HANDLER
    // ─────────────────────────────────────────────────────────────
    private handleError(error: any): Observable<never> {
        console.error('❌ OrdonnanceService error:', error);

        let message = 'Erreur serveur';

        if (error?.error) {
            if (typeof error.error === 'string') {
                message = error.error;
            } else if (error.error.message) {
                message = error.error.message;
            } else if (error.error.errors) {
                message = Object.values(error.error.errors).join(', ');
            }
        } else if (error?.message) {
            message = error.message;
        }

        return throwError(() => new Error(message));
    }
}
