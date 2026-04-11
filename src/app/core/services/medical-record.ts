import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class MedicalRecordService {
    private dossierUrl = environment.services.dossiers;
    private consultUrl = environment.services.consultations;

    private get tenantId(): number {
        const user = this.authService.getCurrentUser();
        return user?.tenantId || 1; 
    }

    constructor(private http: HttpClient, private authService: AuthService) {}

    // ── Dossiers ──────────────────────────
    getAllDossiers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.dossierUrl}?tenantId=${this.tenantId}`);
    }

    getDossierById(id: number): Observable<any> {
        return this.http.get<any>(`${this.dossierUrl}/${id}`);
    }

    getDossierByPatient(patientId: number): Observable<any> {
        return this.http.get<any>(`${this.dossierUrl}/patient/${patientId}`);
    }

    createDossier(dossier: any): Observable<any> {
        return this.http.post<any>(this.dossierUrl, { ...dossier, tenantId: this.tenantId });
    }

    updateDossier(id: number, dossier: any): Observable<any> {
        return this.http.put<any>(`${this.dossierUrl}/${id}`, dossier);
    }

    // ── Consultations ──────────────────────
    getAllConsultations(): Observable<any[]> {
        return this.http.get<any[]>(`${this.consultUrl}?tenantId=${this.tenantId}`);
    }

    getConsultationById(id: number): Observable<any> {
        return this.http.get<any>(`${this.consultUrl}/${id}`);
    }

    getConsultationsByDossier(dossierId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.consultUrl}/dossier/${dossierId}`);
    }

    getConsultationsByMedecin(medecinId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.consultUrl}/medecin/${medecinId}`);
    }

    createConsultation(consultation: any): Observable<any> {
        return this.http.post<any>(this.consultUrl, { ...consultation, tenantId: this.tenantId });
    }

    updateConsultation(id: number, consultation: any): Observable<any> {
        return this.http.put<any>(`${this.consultUrl}/${id}`, consultation);
    }

    countConsultations(): Observable<number> {
        return this.http.get<number>(`${this.consultUrl}/count?tenantId=${this.tenantId}`);
    }

    // ── Documents ──────────────────────────
    getDocumentsByDossier(dossierId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.dossierUrl}/${dossierId}/documents`);
    }

    uploadDocument(dossierId: number, formData: FormData): Observable<any> {
        return this.http.post<any>(`${this.dossierUrl}/${dossierId}/documents`, formData);
    }

    deleteDocument(dossierId: number, documentId: number): Observable<any> {
        return this.http.delete<any>(`${this.dossierUrl}/${dossierId}/documents/${documentId}`);
    }
}
