import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Cabinet {
    id: number;
    nom: string;
    responsable: string;
    email: string;
    telephone: string;
    ville: string;
    nbMedecins: number;
    plan: string;
    dateExpiration?: string;
    statut: string;
    tenantId: number;
}

@Injectable({
    providedIn: 'root'
})
export class CabinetService {
    private url = environment.services.cabinets; 

    constructor(private http: HttpClient) {}

    /**
     * ✅ Récupérer tous les cabinets (Admin global)
     */
    getAll(): Observable<Cabinet[]> {
        return this.http.get<Cabinet[]>(this.url).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Créer un cabinet
     */
    create(cabinet: any): Observable<Cabinet> {
        return this.http.post<Cabinet>(this.url, cabinet).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Modifier un cabinet
     */
    update(id: number, cabinet: any): Observable<Cabinet> {
        return this.http.put<Cabinet>(`${this.url}/${id}`, cabinet).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Supprimer un cabinet
     */
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    /**
     * ✅ Activer/Suspendre
     */
    toggleStatus(id: number, status: string): Observable<Cabinet> {
        return this.http.put<Cabinet>(`${this.url}/${id}/status`, { status }).pipe(catchError(this.handleError));
    }

    updatePlan(id: number, plan: string, dateExpiration?: string): Observable<Cabinet> {
        return this.http.put<Cabinet>(`${this.url}/${id}/plan`, { plan, dateExpiration }).pipe(catchError(this.handleError));
    }

    private handleError(error: any) {
        console.error('❌ CabinetService error:', error);
        return throwError(() => new Error(error.error?.message || 'Erreur service Cabinet'));
    }
}
