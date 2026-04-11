import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Plan {
    id?: number;
    planId: string;    // Identifiant unique ex: "Starter"
    label: string;     // Nom affiché ex: "Professionnel"
    prix?: number | null;
    color?: string;
    features?: string; // Features séparées par \n
}

@Injectable({ providedIn: 'root' })
export class PlanService {
    private url = (environment.services as any).plans;

    constructor(private http: HttpClient) {}

    getAll(): Observable<Plan[]> {
        return this.http.get<Plan[]>(this.url).pipe(catchError(this.handleError));
    }

    create(plan: Plan): Observable<Plan> {
        return this.http.post<Plan>(this.url, plan).pipe(catchError(this.handleError));
    }

    update(id: number, plan: Plan): Observable<Plan> {
        return this.http.put<Plan>(`${this.url}/${id}`, plan).pipe(catchError(this.handleError));
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    private handleError(error: any) {
        console.error('❌ PlanService error:', error);
        return throwError(() => new Error(error.error?.message || 'Erreur service Plan'));
    }
}
