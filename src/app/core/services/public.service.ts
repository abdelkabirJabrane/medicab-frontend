import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicDoctor {
  id: number;
  slug: string;
  firstName: string;
  lastName: string;
  specialite: string;
  address: string;
  ville?: string;
  gender?: string;
  phoneNumber?: string;
  profileImageUrl: string;
  biographie?: string;
  tenantId?: number;
  slots: Record<string, string[]>;
  availabilities?: Record<string, string[]>;
  distance?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class PublicService {
  private apiUrl = environment.services.users + '/public';

  constructor(private http: HttpClient) {}

  /**
   * Rechercher des médecins publiquement
   */
  searchDoctors(query: string, location: string, startDate: string, endDate: string): Observable<PublicDoctor[]> {
    let params = new HttpParams()
      .set('q', query || '')
      .set('loc', location || '');

    return this.http.get<PublicDoctor[]>(`${this.apiUrl}/doctors`, { params }).pipe(
      catchError(error => {
        console.error('Public search error:', error);
        return throwError(() => new Error('Erreur lors de la recherche des médecins.'));
      })
    );
  }

  /**
   * Récupérer le profil public d'un médecin
   */
  getDoctorBySlug(slug: string): Observable<PublicDoctor> {
    return this.http.get<PublicDoctor>(`${this.apiUrl}/doctors/${slug}`).pipe(
      catchError(error => {
        return throwError(() => new Error('Médecin non trouvé.'));
      })
    );
  }
}
