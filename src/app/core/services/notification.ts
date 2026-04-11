import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface NotificationRequest {
    tenantId: number;
    destinataireId?: number;
    destinataireContact: string;
    type: string;
    canal: string;
    sujet: string;
    contenu: string;
    dateProgrammee?: string; // LocalDateTime as string
    referenceObjet?: string;
}

export interface NotificationResponse {
    id: number;
    tenantId: number;
    destinataireId?: number;
    destinataireContact: string;
    type: string;
    canal: string;
    sujet: string;
    contenu: string;
    statut: string;
    dateProgrammee?: string;
    dateEnvoi?: string;
    tentatives: number;
    erreurMessage?: string;
    referenceObjet?: string;
    dateCreation?: string;
}

import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private url = environment.services.notifications;

    private get tenantId(): number {
        const user = this.authService.getCurrentUser();
        return user?.tenantId || 1; 
    }

    constructor(private http: HttpClient, private authService: AuthService) {}

    getAll(): Observable<NotificationResponse[]> {
        const params = new HttpParams().set('tenantId', this.tenantId);
        return this.http.get<NotificationResponse[]>(this.url, { params }).pipe(catchError(this.handleError));
    }

    getById(id: number): Observable<NotificationResponse> {
        return this.http.get<NotificationResponse>(`${this.url}/${id}`).pipe(catchError(this.handleError));
    }

    getByStatut(statut: string): Observable<NotificationResponse[]> {
        const params = new HttpParams().set('tenantId', this.tenantId).set('statut', statut);
        return this.http.get<NotificationResponse[]>(`${this.url}/statut`, { params }).pipe(catchError(this.handleError));
    }

    envoyer(notif: NotificationRequest): Observable<NotificationResponse> {
        const payload = { ...notif, tenantId: this.tenantId };
        return this.http.post<NotificationResponse>(`${this.url}/envoyer`, payload).pipe(catchError(this.handleError));
    }

    programmer(notif: NotificationRequest): Observable<NotificationResponse> {
        const payload = { ...notif, tenantId: this.tenantId };
        return this.http.post<NotificationResponse>(`${this.url}/programmer`, payload).pipe(catchError(this.handleError));
    }

    annuler(id: number): Observable<NotificationResponse> {
        return this.http.put<NotificationResponse>(`${this.url}/${id}/annuler`, {}).pipe(catchError(this.handleError));
    }

    count(): Observable<number> {
        const params = new HttpParams().set('tenantId', this.tenantId);
        return this.http.get<number>(`${this.url}/count`, { params }).pipe(catchError(this.handleError));
    }

    envoyerRappelRdv(patientId: number, contact: string, canal: string, dateRdv: string, medecinNom: string): Observable<NotificationResponse> {
        const params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('patientId', patientId)
            .set('contact', contact)
            .set('canal', canal)
            .set('dateRDV', dateRdv)
            .set('medecinNom', medecinNom);

        return this.http.post<NotificationResponse>(`${this.url}/rappel-rdv`, null, { params }).pipe(catchError(this.handleError));
    }

    envoyerConfirmationRDV(patientId: number, contact: string, canal: string, dateRdv: string): Observable<NotificationResponse> {
        const params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('patientId', patientId)
            .set('contact', contact)
            .set('canal', canal)
            .set('dateRDV', dateRdv);

        return this.http.post<NotificationResponse>(`${this.url}/confirmation-rdv`, null, { params }).pipe(catchError(this.handleError));
    }

    envoyerFactureDisponible(patientId: number, contact: string, numeroFacture: string, montant: number): Observable<NotificationResponse> {
        const params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('patientId', patientId)
            .set('contact', contact)
            .set('numeroFacture', numeroFacture)
            .set('montant', montant);

        return this.http.post<NotificationResponse>(`${this.url}/facture`, null, { params }).pipe(catchError(this.handleError));
    }

    private handleError(error: any): Observable<never> {
        let message = 'Erreur serveur';
        if (error?.error) {
            if (typeof error.error === 'string') message = error.error;
            else if (error.error.message) message = error.error.message;
        } else if (error?.message) {
            message = error.message;
        }
        return throwError(() => new Error(message));
    }
}
