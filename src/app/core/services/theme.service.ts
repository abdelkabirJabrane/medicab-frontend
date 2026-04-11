import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private _dark = signal<boolean>(false);

    constructor() {
        // Lire la préférence sauvegardée
        const saved = localStorage.getItem('mc-theme');
        if (saved === 'dark') {
            this._dark.set(true);
            this.applyTheme(true);
        } else if (saved === null) {
            // Respecter la préférence système si pas de choix sauvegardé
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this._dark.set(prefersDark);
            this.applyTheme(prefersDark);
        }
    }

    isDark(): boolean {
        return this._dark();
    }

    toggle() {
        const next = !this._dark();
        this._dark.set(next);
        this.applyTheme(next);
        localStorage.setItem('mc-theme', next ? 'dark' : 'light');
    }

    private applyTheme(dark: boolean) {
        const root = document.documentElement;
        if (dark) {
            root.classList.add('mc-dark', 'app-dark', 'medicab-dark');
            root.classList.remove('mc-light', 'app-light', 'medicab-light');
        } else {
            root.classList.add('mc-light', 'app-light', 'medicab-light');
            root.classList.remove('mc-dark', 'app-dark', 'medicab-dark');
        }
    }
}
