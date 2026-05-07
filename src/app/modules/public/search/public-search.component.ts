import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { PublicService, PublicDoctor } from '../../../core/services/public.service';
import { AppointmentService } from '../../../core/services/appointment';
import { addDays, format, startOfDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-public-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './public-search.component.html',
  styleUrls: ['./public-search.component.scss']
})
export class PublicSearchComponent implements OnInit {
  searchQuery = '';
  locationQuery = '';
  userCoords: { lat: number, lon: number } | null = null;
  
  doctors = signal<PublicDoctor[]>([]);
  loading = signal<boolean>(false);
  
  // Weekly calendar navigation
  currentDate = new Date();
  startDate = signal<Date>(new Date());
  weekDays = signal<Date[]>([]);

  private API_PUBLIC_APPTS = `${environment.services.appointments}/public`;

  constructor(
    private publicService: PublicService, 
    private http: HttpClient,
    private router: Router
  ) {
    this.generateWeekDays(this.startDate());
  }

  revealedPhones: Record<number, boolean> = {};

  revealPhone(id: number) {
    this.revealedPhones[id] = true;
  }

  quickFilter(term: string) {
    this.searchQuery = term;
    if (term === '') this.locationQuery = '';
    this.searchDoctors();
  }

  ngOnInit() {
    this.searchDoctors();
  }

  generateWeekDays(start: Date) {
    const days = [];
    for (let i = 0; i < 5; i++) {
      days.push(addDays(start, i));
    }
    this.weekDays.set(days);
  }

  nextDays() {
    const nextStart = addDays(this.startDate(), 5);
    this.startDate.set(nextStart);
    this.generateWeekDays(this.startDate());
    this.searchDoctors(); 
  }

  prevDays() {
    if (this.isStartDateToday()) return;
    
    const prevStart = addDays(this.startDate(), -5);
    const today = startOfDay(new Date());
    this.startDate.set(prevStart < today ? today : prevStart);
    this.generateWeekDays(this.startDate());
    this.searchDoctors();
  }

  isStartDateToday(): boolean {
    return isSameDay(this.startDate(), new Date());
  }

  formatDayName(date: Date): string {
    return format(date, 'eee', { locale: fr });
  }

  formatDayNumber(date: Date): string {
    return format(date, 'dd MMM', { locale: fr });
  }

  formatDateIso(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  searchDoctors() {
    this.loading.set(true);
    const startIso = this.formatDateIso(this.startDate());
    const endIso = this.formatDateIso(addDays(this.startDate(), 4));
    const defaultGrid = ['08:00', '08:30', '09:00', '10:00']; 

    // Si on utilise la géolocalisation, on élargit la recherche pour ne pas être bloqué par les noms de ville
    const searchLoc = this.userCoords ? '' : this.locationQuery;

    this.publicService.searchDoctors(this.searchQuery, searchLoc, startIso, endIso).subscribe({
      next: (res: PublicDoctor[]) => {
        console.log(' Doctors found:', res); // Debugging
        
        const mapped = res.map((doc: any) => {
          const initialSlots: Record<string, any[]> = {};
          this.weekDays().forEach(d => {
             initialSlots[this.formatDateIso(d)] = defaultGrid.map(t => t);
          });
          
          // Smart Fallback: Détection par prénom si le sexe est manquant dans l'API
          let gender = doc.gender;
          if (!gender || gender === '') {
             const nameStr = ((doc.firstName || '') + ' ' + (doc.lastName || '')).toLowerCase();
             const feminineNames = ['zhor', 'meriem', 'sanaa', 'fatima', 'hind', 'salma', 'malika', 'khadija', 'leila', 'nora', 'kenza', 'meriam', 'amina', 'latifa'];
             const isFeminine = feminineNames.some(name => nameStr.includes(name));
             gender = isFeminine ? 'FEMALE' : 'MALE';
          }

          const imgFem = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=250&h=250&auto=format&fit=crop';
          const imgMale = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=250&h=250&auto=format&fit=crop';

          // Simulation de coordonnées si absentes (pour Dr. Jabrane Abdelkabir à Sala Aljadida)
          let lat = doc.latitude;
          let lon = doc.longitude;
          if (doc.lastName?.includes('Jabrane') || (doc.address && (doc.address.includes('SALA ALJADIDA') || doc.address.includes('Hssaine')))) {
             lat = 33.985;
             lon = -6.745;
          }

          let distance = null;
          if (this.userCoords && lat && lon) {
             distance = this.calculateDistance(this.userCoords.lat, this.userCoords.lon, lat, lon);
          }

          // Forcer le changement si c'est une image par défaut d'Unsplash
          let finalImg = doc.profileImageUrl || (gender === 'FEMALE' ? imgFem : imgMale);
          if (finalImg.includes('unsplash.com')) {
             finalImg = (gender === 'FEMALE' ? imgFem : imgMale);
          }

          return {
            ...doc,
            id: doc.id,
            slug: doc.slug || `doctor-${doc.id}`,
            firstName: doc.firstName || '',
            lastName: doc.lastName || doc.username || 'Médecin',
            gender: gender,
            specialite: doc.specialite || 'Praticien',
            address: doc.address || 'Adresse à confirmer',
            profileImageUrl: finalImg,
            availabilities: initialSlots,
            distance: distance
          };
        });

        // Trier par distance si disponible
        const sorted = mapped.sort((a, b) => {
           if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
           if (a.distance !== null) return -1;
           if (b.distance !== null) return 1;
           return 0;
        });

        this.doctors.set(sorted);
        this.loading.set(false);
        this.doctors().forEach(doc => this.loadRealAvailability(doc.id));
      },
      error: (err: any) => {
        console.error('API Error:', err);
        this.loading.set(false);
        this.doctors.set([]); 
      }
    });
  }

  loadRealAvailability(doctorId: number) {
    const rdvs$ = this.http.get<any[]>(`${this.API_PUBLIC_APPTS}/medecin/${doctorId}`);
    const closed$ = this.http.get<string[]>(`${this.API_PUBLIC_APPTS}/closed-days?medecinId=${doctorId}`);

    rdvs$.subscribe({
      next: (appointments) => {
        closed$.subscribe({
          next: (closedDays) => this.computeAndAssignSlots(doctorId, appointments, closedDays),
          error: () => this.computeAndAssignSlots(doctorId, appointments, [])
        });
      },
      error: (err) => console.error('Failed to load public appointments', doctorId, err)
    });
  }

  computeAndAssignSlots(doctorId: number, appointments: any[], closedDays: string[]) {
    const availabilities: Record<string, any[]> = {};
    const defaultGrid = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

    this.weekDays().forEach(d => {
      const dateIso = this.formatDateIso(d);
      const dayOfWeek = d.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6 || closedDays.includes(dateIso)) { 
        availabilities[dateIso] = [];
        return;
      }
      
      const dayAppointments = appointments.filter(a => {
         if (a.statut === 'ANNULE') return false; 
         return a.dateHeureDebut && a.dateHeureDebut.startsWith(dateIso);
      });
      
      const bookedTimes = dayAppointments.map(a => {
         const timePart = a.dateHeureDebut.split('T')[1]; 
         return timePart ? timePart.substring(0, 5) : '';
      });
      
      availabilities[dateIso] = defaultGrid.map(time => {
        const isBusy = bookedTimes.includes(time);
        return isBusy ? `BUSY:${time}` : time;
      });
    });

    console.log(`Updating doctor ${doctorId} gender:`, this.doctors().find(d => d.id === doctorId)?.gender);
    
    const updatedDoctors = this.doctors().map((d: any) => {
       if (d.id === doctorId) {
          let gender = d.gender;
          if (!gender || gender === '') {
             const nameStr = ((d.firstName || '') + ' ' + (d.lastName || '')).toLowerCase();
             const feminineNames = ['zhor', 'meriem', 'sanaa', 'fatima', 'hind', 'salma', 'malika', 'khadija', 'leila', 'nora', 'kenza', 'meriam', 'amina', 'latifa'];
             const isFeminine = feminineNames.some(name => nameStr.includes(name));
             gender = isFeminine ? 'FEMALE' : 'MALE';
          }

          const imgFem = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=250&h=250&auto=format&fit=crop';
          const imgMale = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=250&h=250&auto=format&fit=crop';
          
          let finalImg = d.profileImageUrl || (gender === 'FEMALE' ? imgFem : imgMale);
          if (finalImg.includes('unsplash.com')) {
             finalImg = (gender === 'FEMALE' ? imgFem : imgMale);
          }

          return { 
            ...d, 
            availabilities: availabilities,
            gender: gender,
            profileImageUrl: finalImg,
            lastName: d.lastName.replace(' (SYNC OK)', '').trim()
          };
       }
       return d;
    });
    this.doctors.set(updatedDoctors);
  }

  getDoctorFullName(doc: PublicDoctor): string {
    const fName = (doc.firstName || '').trim();
    const lName = (doc.lastName || '').trim();
    
    // Éviter Dr. DR.
    const full = `${fName} ${lName}`.trim();
    if (full.toUpperCase().startsWith('DR.') || full.toUpperCase().startsWith('DR ')) {
       return full;
    }
    
    return `Dr. ${full}`.trim();
  }

  takeAppointment(doctorSlug: string, date: string, time: string) {
    this.router.navigate(['/rdv', doctorSlug], { queryParams: { d: date, t: time } }); 
  }

  openGoogleMaps(address: string, city: string = '') {
    const fullAddress = `${address}${city ? ', ' + city : ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    window.open(url, '_blank');
  }

  useGeolocation() {
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }

    this.loading.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.userCoords = { lat, lon };
        
        // Utilisation de Nominatim (gratuit) pour obtenir le nom de la ville
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
          .then(res => res.json())
          .then(data => {
            const addr = data.address;
            let city = addr.suburb || addr.quarter || addr.neighbourhood || addr.city_district || addr.city || addr.town || addr.village || '';
            
            if (city.toLowerCase().includes('hssaine')) city = 'Sala Aljadida';
            
            this.locationQuery = city;
            this.searchDoctors();
          })
          .catch(() => {
            this.loading.set(false);
            alert('Erreur lors de la récupération de votre position.');
          });
      },
      (error) => {
        this.loading.set(false);
        console.error('Geolocation error:', error);
        alert('Veuillez autoriser l’accès à votre position pour utiliser ce filtre.');
      },
      { timeout: 10000 }
    );
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
