import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class BillingService {
    private url = environment.services.factures;

    private get tenantId(): number {
        const user = this.authService.getCurrentUser();
        return user?.tenantId || 1; 
    }

    constructor(private http: HttpClient, private authService: AuthService) {}

    getAll(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}?tenantId=${this.tenantId}`);
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.url}/${id}`);
    }

    getByPatient(patientId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/patient/${patientId}`);
    }

    getByStatut(statut: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/statut`, {
            params: {
                tenantId: this.tenantId,
                statut
            }
        });
    }

    create(facture: any): Observable<any> {
        return this.http.post<any>(this.url, { ...facture, tenantId: this.tenantId });
    }

    payer(paiement: any): Observable<any> {
        return this.http.post<any>(`${this.url}/payer`, paiement);
    }

    annuler(id: number): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}/annuler`, {});
    }

    count(): Observable<number> {
        return this.http.get<number>(`${this.url}/count?tenantId=${this.tenantId}`);
    }

    getTotalEncaisse(): Observable<number> {
        return this.http.get<number>(`${this.url}/stats/encaisse?tenantId=${this.tenantId}`);
    }

    getTotalImpaye(): Observable<number> {
        return this.http.get<number>(`${this.url}/stats/impaye?tenantId=${this.tenantId}`);
    }
}
