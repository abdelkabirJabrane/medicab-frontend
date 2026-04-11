import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';

// PrimeNG Imports
import { SplitButtonModule } from 'primeng/splitbutton';
import { CardModule } from 'primeng/card';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TimelineModule } from 'primeng/timeline';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';

import { MenuItem } from 'primeng/api';
import { MockDataService, KPI, RDV, Patient, ActivityItem } from './mock-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, TitleCasePipe, DatePipe,
    SplitButtonModule, CardModule, MessagesModule, TableModule,
    AvatarModule, ChipModule, TagModule, ButtonModule, ChartModule,
    ProgressBarModule, TimelineModule, SkeletonModule, ToastModule, InputTextModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class Dashboard implements OnInit {
  private dataService = inject(MockDataService);
  private messageService = inject(MessageService);

  loading: boolean = true;
  newRdvItems: MenuItem[] = [];
  
  kpis: KPI[] = [];
  rdvDuJour: RDV[] = [];
  patientsASuivre: Patient[] = [];
  activites: ActivityItem[] = [];
  messages: any[] = [];
  
  chartCA: any;
  chartActes: any;

  ngOnInit() {
    this.newRdvItems = [
      { label: 'Consultation', icon: 'pi pi-user', command: () => this.showActionToast('success', 'Nouv. consultation') },
      { label: 'Téléconsultation', icon: 'pi pi-video', command: () => this.showActionToast('success', 'Nouv. téléconsultation') },
      { label: 'Urgence', icon: 'pi pi-exclamation-circle', command: () => this.showActionToast('error', 'Nouv. urgence') }
    ];

    this.messages = [
      { severity: 'error', summary: 'Erreur', detail: '5 factures impayées ce mois — 3 250 MAD en attente' },
      { severity: 'warn', summary: 'Attention', detail: '3 ordonnances expirent dans moins de 7 jours' },
      { severity: 'info', summary: 'Information', detail: '7 patients non vus depuis plus de 30 jours' },
      { severity: 'success', summary: 'Succès', detail: 'Objectif CA atteint à 62% ce mois' }
    ];

    setTimeout(() => {
      this.kpis = this.dataService.getKPIs();
      this.rdvDuJour = this.dataService.getRdvDuJour();
      this.patientsASuivre = this.dataService.getPatientsASuivre();
      this.activites = this.dataService.getActivites();
      this.chartCA = this.dataService.getChartCA();
      this.chartActes = this.dataService.getChartActes();
      this.loading = false;
    }, 1500);
  }

  getTypeColor(type: string): string {
    switch(type) {
      case 'consultation': return '#2563EB';
      case 'teleconsultation': return '#8B5CF6';
      case 'suivi': return '#10B981';
      case 'urgence': return '#EF4444';
      default: return '#6b7280';
    }
  }

  getStatutSeverity(statut: string): 'success' | 'warning' | 'info' | 'danger' | 'secondary' {
    switch(statut) {
      case 'en_attente': return 'warning';
      case 'confirme': return 'success';
      case 'en_cours': return 'info';
      case 'annule': return 'danger';
      case 'termine': return 'secondary';
      default: return 'info';
    }
  }

  formatStatut(statut: string): string {
    const s = statut.replace('_', ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  getPrioriteSeverity(priorite: string): 'danger' | 'info' | 'secondary' {
    switch(priorite) {
      case 'haute': return 'danger';
      case 'normale': return 'info';
      case 'faible': return 'secondary';
      default: return 'secondary';
    }
  }

  getMessageIcon(severity: string): string {
    switch(severity) {
      case 'error': return 'times-circle text-red-500';
      case 'warn': return 'exclamation-triangle text-orange-500';
      case 'info': return 'info-circle text-blue-500';
      case 'success': return 'check-circle text-green-500';
      default: return 'bell';
    }
  }

  viewAlert(message: any) {
    this.messageService.add({
      severity: message.severity,
      summary: message.summary,
      detail: message.detail,
    });
  }

  showActionToast(severity: string, detail: string) {
    this.messageService.add({
      severity: severity,
      summary: 'Action',
      detail: detail
    });
  }
}
