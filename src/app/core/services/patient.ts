import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class PatientService {
    private url = environment.services.patients;

    private get tenantId(): number {
        const user = this.authService.getCurrentUser();
        return user?.tenantId || 1; 
    }

    constructor(private http: HttpClient, private authService: AuthService) {}

    // ─────────────────────────────────────────────
    // 🔹 GET ALL
    // GET /api/patients?tenantId=1
    // ─────────────────────────────────────────────
    getAll(): Observable<any[]> {
        const params = new HttpParams().set('tenantId', this.tenantId);
        return this.http.get<any[]>(this.url, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 GET BY ID
    // GET /api/patients/{id}
    // ─────────────────────────────────────────────
    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 GET BY CIN
    // GET /api/patients/cin/{cin}
    // ─────────────────────────────────────────────
    getByCin(cin: string): Observable<any> {
        return this.http.get<any>(`${this.url}/cin/${cin}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 SEARCH
    // GET /api/patients/search?tenantId=1&q=xxx
    // ─────────────────────────────────────────────
    search(query: string): Observable<any[]> {
        const params = new HttpParams().set('tenantId', this.tenantId).set('q', query);

        return this.http.get<any[]>(`${this.url}/search`, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 CREATE (FIX PRINCIPAL ICI)
    // POST /api/patients
    // ─────────────────────────────────────────────
    create(patient: any): Observable<any> {
        const payload = {
            ...patient,
            tenantId: this.tenantId,
            dateNaissance: this.formatDate(patient.dateNaissance),
            noAffiliation: patient.noAffiliation || ''
        };

        console.log('📤 Payload envoyé:', payload);

        return this.http.post<any>(this.url, payload).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 UPDATE
    // PUT /api/patients/{id}
    // ─────────────────────────────────────────────
    update(id: number, patient: any): Observable<any> {
        const payload = {
            ...patient,
            dateNaissance: this.formatDate(patient.dateNaissance),
            noAffiliation: patient.noAffiliation || ''
        };

        return this.http.put<any>(`${this.url}/${id}`, payload).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 DELETE (soft delete)
    // DELETE /api/patients/{id}
    // ─────────────────────────────────────────────
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 COUNT
    // GET /api/patients/count?tenantId=1
    // ─────────────────────────────────────────────
    count(): Observable<number> {
        const params = new HttpParams().set('tenantId', this.tenantId);
        return this.http.get<number>(`${this.url}/count`, { params }).pipe(catchError(this.handleError));
    }

    // ─────────────────────────────────────────────
    // 🔹 FORMAT DATE (IMPORTANT)
    // ─────────────────────────────────────────────
    private formatDate(date: any): string | null {
        if (!date) return null;

        const d = new Date(date);
        return d.toISOString().split('T')[0]; // ✅ yyyy-MM-dd
    }

    // ─────────────────────────────────────────────
    // 🔹 ERROR HANDLER AMÉLIORÉ
    // ─────────────────────────────────────────────
    private handleError(error: any): Observable<never> {
        console.error('❌ PatientService error:', error);

        let message = 'Erreur serveur';

        if (error?.error) {
            if (typeof error.error === 'string') {
                message = error.error;
            } else if (error.error.message) {
                message = error.error.message;
            } else if (error.error.errors) {
                // Cas validation Spring
                message = Object.values(error.error.errors).join(', ');
            }
        } else if (error?.message) {
            message = error.message;
        }

        return throwError(() => new Error(message));
    }
}
