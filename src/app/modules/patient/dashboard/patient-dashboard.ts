import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth';
import { PublicService, PublicDoctor } from '../../../core/services/public.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TagModule, ButtonModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './patient-dashboard.html',
  styleUrls: ['./patient-dashboard.scss']
})
export class PatientDashboardComponent implements OnInit {

  appointments: any[] = [];
  doctors: PublicDoctor[] = [];
  loading = true;
  currentUser: any = null;

  private apptUrl = environment.services.appointments;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private publicService: PublicService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadData();
  }

  loadData() {
    this.loading = true;
    
    // 1. Charger les médecins (pour avoir noms et photos)
    // 2. Charger les RDV du patient
    forkJoin({
      docs: this.publicService.searchDoctors('', '', '', '').pipe(catchError(() => of([]))),
      rdvs: this.http.get<any[]>(`${this.apptUrl}/patient/${this.currentUser?.id}`).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.doctors = res.docs as PublicDoctor[];
        
        // Enrichir les RDV avec les infos du médecin
        this.appointments = (res.rdvs || []).map(rdv => {
          const doc = this.doctors.find(d => d.id === rdv.medecinId);
          let docImg = doc?.profileImageUrl;
          if (!docImg || docImg.includes('placeholder.png')) {
             docImg = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=300&h=300&auto=format&fit=crop';
          }

          return {
            ...rdv,
            doctorName: doc ? `Dr. ${doc.firstName} ${doc.lastName}` : 'Médecin',
            doctorSpecialite: doc ? doc.specialite : 'Praticien',
            doctorImage: docImg,
            date: new Date(rdv.dateHeureDebut)
          };
        }).sort((a, b) => b.date.getTime() - a.date.getTime());

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger vos rendez-vous.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusInfo(status: string) {
    switch (status) {
      case 'CONFIRME': return { label: 'Confirmé', severity: 'success' as const, icon: 'pi pi-check' };
      case 'EN_ATTENTE': return { label: 'En attente', severity: 'warn' as const, icon: 'pi pi-clock' };
      case 'ANNULE': return { label: 'Annulé', severity: 'danger' as const, icon: 'pi pi-times' };
      case 'TERMINE': return { label: 'Terminé', severity: 'secondary' as const, icon: 'pi pi-check-circle' };
      case 'EN_COURS': return { label: 'En consultation', severity: 'info' as const, icon: 'pi pi-spin pi-spinner' };
      default: return { label: status, severity: 'secondary' as const, icon: 'pi pi-question' };
    }
  }

  annulerRdv(id: number) {
    // Appel au backend pour annuler
    this.http.put(`${this.apptUrl}/${id}/annuler?motif=Annulé par le patient`, {}).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Rendez-vous annulé.' });
        this.loadData();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible.' });
      }
    });
  }
}
