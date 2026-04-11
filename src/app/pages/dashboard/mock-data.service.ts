import { Injectable } from '@angular/core';

export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  initiales: string;
  telephone: string;
  derniereVisite: Date;
  motif: string;
  priorite: 'haute' | 'normale' | 'faible';
}

export interface RDV {
  id: number;
  heure: string;
  patient: Patient;
  type: 'consultation' | 'teleconsultation' | 'suivi' | 'urgence';
  statut: 'en_attente' | 'confirme' | 'en_cours' | 'termine' | 'annule';
  duree: number;
}

export interface KPI {
  label: string;
  valeur: string | number;
  icone: string;
  couleur: string;
  tendance?: number;
  sousLabel?: string;
}

export interface ActivityItem {
  date: string;
  label: string;
  detail: string;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  getKPIs(): KPI[] {
    return [
      { label: 'Total Patients', valeur: 124, icone: 'pi-users', couleur: '#2563EB', tendance: 8 },
      { label: "RDV Aujourd'hui", valeur: 3, icone: 'pi-calendar', couleur: '#10B981', sousLabel: '1 confirmé / 2 en attente' },
      { label: 'CA Mensuel', valeur: '12 500 MAD', icone: 'pi-wallet', couleur: '#8B5CF6' },
      { label: 'Taux No-Show', valeur: '6%', icone: 'pi-times-circle', couleur: '#F59E0B', tendance: -2 },
      { label: 'Durée moy. consult.', valeur: '18min', icone: 'pi-clock', couleur: '#06B6D4', tendance: -3 },
      { label: "Liste d'attente", valeur: 4, icone: 'pi-hourglass', couleur: '#EF4444', sousLabel: 'attente moy: 12min' },
      { label: 'Patients à rappeler', valeur: 7, icone: 'pi-bell', couleur: '#F59E0B', sousLabel: 'non vus depuis +30j' },
      { label: 'Ordonnances à renouveler', valeur: 3, icone: 'pi-file-edit', couleur: '#EC4899', sousLabel: 'expirent dans 7j' }
    ];
  }

  getRdvDuJour(): RDV[] {
    return [
      {
        id: 1, heure: '09:00', type: 'teleconsultation', statut: 'en_attente', duree: 30,
        patient: { id: 101, nom: 'Jabrane', prenom: 'Abdelkabir', initiales: 'AJ', telephone: '06 12 34 56 78', derniereVisite: new Date(), motif: '', priorite: 'normale' }
      },
      {
        id: 2, heure: '11:30', type: 'consultation', statut: 'confirme', duree: 30,
        patient: { id: 102, nom: 'Ouazzani', prenom: 'Fatima', initiales: 'FO', telephone: '06 11 22 33 44', derniereVisite: new Date(), motif: '', priorite: 'normale' }
      },
      {
        id: 3, heure: '14:30', type: 'suivi', statut: 'en_cours', duree: 30,
        patient: { id: 103, nom: 'El Mansouri', prenom: 'Youssef', initiales: 'YE', telephone: '06 99 88 77 66', derniereVisite: new Date(), motif: '', priorite: 'normale' }
      }
    ];
  }

  getPatientsASuivre(): Patient[] {
    return [
      { id: 201, nom: 'Karimi', prenom: 'Mohammed', initiales: 'MK', telephone: '', derniereVisite: new Date(2026, 0, 15), motif: 'Diabète type 2', priorite: 'haute' },
      { id: 202, nom: 'Benhaddou', prenom: 'Zineb', initiales: 'ZB', telephone: '', derniereVisite: new Date(2026, 1, 28), motif: 'Hypertension', priorite: 'haute' },
      { id: 203, nom: 'Tazi', prenom: 'Omar', initiales: 'OT', telephone: '', derniereVisite: new Date(2026, 2, 10), motif: 'Suivi post-op', priorite: 'normale' },
      { id: 204, nom: 'El Fassi', prenom: 'Khadija', initiales: 'KE', telephone: '', derniereVisite: new Date(2026, 1, 1), motif: 'Asthme chronique', priorite: 'normale' },
      { id: 205, nom: 'Bensouda', prenom: 'Rachid', initiales: 'RB', telephone: '', derniereVisite: new Date(2026, 2, 20), motif: 'Bilan annuel', priorite: 'faible' }
    ];
  }

  getActivites(): ActivityItem[] {
    return [
      { date: 'Hier', label: 'Nouveau patient', detail: 'Abdelkabir Jabrane ajouté', icon: 'pi-user-plus', color: '#2563EB' },
      { date: 'Il y a 2h', label: 'Paiement reçu', detail: '350 MAD — Fatima Ouazzani', icon: 'pi-money-bill', color: '#10B981' },
      { date: 'Il y a 3h', label: 'Paiement reçu', detail: '500 MAD — Omar Tazi', icon: 'pi-money-bill', color: '#10B981' },
      { date: 'Hier', label: 'Ordonnance créée', detail: 'Youssef El Mansouri', icon: 'pi-file-edit', color: '#8B5CF6' },
      { date: 'Il y a 1 jour', label: 'RDV annulé', detail: 'Khadija El Fassi — 10h00', icon: 'pi-calendar', color: '#F59E0B' },
      { date: 'Il y a 2 jours', label: 'Paiement reçu', detail: '200 MAD — Rachid Bensouda', icon: 'pi-money-bill', color: '#10B981' }
    ];
  }

  getChartCA() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#6c757d';
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#dfe7ef';

    return {
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
        datasets: [
          {
            type: 'bar',
            label: 'CA réel',
            backgroundColor: '#2563EB',
            data: [9000, 11000, 12500, 14000, 13000, 15000, 16000, 14500, 17000, 18000, 16500, 17500]
          },
          {
            type: 'line',
            label: 'Objectif',
            borderColor: '#8B5CF6',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            data: [10000, 10000, 10000, 15000, 15000, 15000, 18000, 18000, 18000, 20000, 20000, 20000]
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) { label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(context.parsed.y); }
                return label;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } },
          y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } }
        }
      }
    };
  }

  getChartActes() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';

    return {
      data: {
        labels: ['Consultation générale', 'Téléconsultation', 'Suivi chronique', 'Urgence'],
        datasets: [
          {
            data: [45, 25, 20, 10],
            backgroundColor: ['#2563EB', '#8B5CF6', '#10B981', '#EF4444'],
            hoverBackgroundColor: ['#1d4ed8', '#7c3aed', '#059669', '#dc2626']
          }
        ]
      },
      options: {
        plugins: {
          legend: { labels: { usePointStyle: true, color: textColor } }
        }
      }
    };
  }
}
