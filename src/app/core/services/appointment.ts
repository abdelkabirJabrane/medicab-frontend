import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {
    private url = environment.services.appointments;

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

    getByMedecin(medecinId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/medecin/${medecinId}`);
    }

    getByJour(medecinId: number, date: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/jour`, {
            params: {
                medecinId: medecinId,
                date: date
            }
        });
    }

    create(rdv: any): Observable<any> {
        return this.http.post<any>(this.url, { ...rdv, tenantId: this.tenantId });
    }

    update(id: number, payload: any): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}`, { ...payload, tenantId: this.tenantId });
    }

    confirmer(id: number): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}/confirmer`, {});
    }

    annuler(id: number, motif: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}/annuler`, {}, { params: { motif } });
    }

    terminer(id: number): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}/terminer`, {});
    }

    count(): Observable<number> {
        return this.http.get<number>(`${this.url}/count?tenantId=${this.tenantId}`);
    }
}
