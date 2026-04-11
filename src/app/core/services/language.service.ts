import { Injectable, signal } from '@angular/core';

export type SupportedLang = 'fr' | 'ar';

@Injectable({ providedIn: 'root' })
export class LanguageService {
    private currentLang = signal<SupportedLang>('fr');

    private translations = {
        fr: {
            'layout.clair': 'Clair',
            'layout.sombre': 'Sombre',
            'layout.langue': 'عربي',
            'menu.principal': 'PRINCIPAL',
            'menu.dashboard': 'Dashboard',
            'menu.medical': 'MÉDICAL',
            'menu.mon_agenda': 'Mon Agenda',
            'menu.mes_patients': 'Mes Patients',
            'menu.consultations': 'Consultations',
            'menu.dossiers': 'Dossiers',
            'menu.ordonnances': 'Ordonnances',
            'menu.ia_analyses': 'IA & ANALYSES',
            'menu.analyse_symptomes': 'Analyse Symptômes',
            'menu.finance': 'FINANCE',
            'menu.mes_factures': 'Mes Factures',
            'header.espace_medecin': 'Espace Médecin',
            'header.medecin_gen': 'Médecin Généraliste',
            'sidebar.en_ligne': 'En ligne',
            'sidebar.deconnexion': 'Déconnexion'
        },
        ar: {
            'layout.clair': 'مضيء',
            'layout.sombre': 'داكن',
            'layout.langue': 'Français',
            'menu.principal': 'الرئيسية',
            'menu.dashboard': 'لوحة القيادة',
            'menu.medical': 'الطبي',
            'menu.mon_agenda': 'مفكرتي',
            'menu.mes_patients': 'مرضاي',
            'menu.consultations': 'الاستشارات',
            'menu.dossiers': 'الملفات الطبية',
            'menu.ordonnances': 'الوصفات الطبية',
            'menu.ia_analyses': 'الذكاء الاصطناعي',
            'menu.analyse_symptomes': 'تحليل الأعراض',
            'menu.finance': 'المالية',
            'menu.mes_factures': 'فواتيري',
            'header.espace_medecin': 'مساحة الطبيب',
            'header.medecin_gen': 'طبيب عام',
            'sidebar.en_ligne': 'متصل',
            'sidebar.deconnexion': 'تسجيل الخروج'
        }
    };

    constructor() {
        const saved = localStorage.getItem('mc-lang') as SupportedLang;
        if (saved === 'ar' || saved === 'fr') {
            this.setLang(saved);
        } else {
            this.setLang('fr');
        }
    }

    public get current() {
        return this.currentLang();
    }

    public isArabic(): boolean {
        return this.currentLang() === 'ar';
    }

    public toggleLang() {
        this.setLang(this.currentLang() === 'fr' ? 'ar' : 'fr');
    }

    public setLang(lang: SupportedLang) {
        this.currentLang.set(lang);
        localStorage.setItem('mc-lang', lang);
        
        const root = document.documentElement;
        root.setAttribute('lang', lang);
        
        if (lang === 'ar') {
            root.setAttribute('dir', 'rtl');
            root.classList.add('rtl-layout');
        } else {
            root.setAttribute('dir', 'ltr');
            root.classList.remove('rtl-layout');
        }
    }

    public translate(key: string): string {
        // En lisant un signal ici, cette fonction devient réactive dans les computed et les templates !
        const langDict = this.translations[this.currentLang()];
        return (langDict as any)[key] || key;
    }
}
