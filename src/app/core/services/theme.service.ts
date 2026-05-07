import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private _dark = signal<boolean>(false);

    constructor() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            this._dark.set(saved === 'dark');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this._dark.set(prefersDark);
        }
        this.applyTheme();
    }

    isDark(): boolean {
        return this._dark();
    }

    toggle() {
        this._dark.set(!this._dark());
        localStorage.setItem('theme', this._dark() ? 'dark' : 'light');
        this.applyTheme();
    }

    private applyTheme() {
        const root = document.documentElement;
        if (this._dark()) {
            root.setAttribute('data-theme', 'dark');
            // Support legacy classes as well
            root.classList.add('mc-dark', 'app-dark');
            root.classList.remove('mc-light', 'app-light');
        } else {
            root.setAttribute('data-theme', 'light');
            root.classList.add('mc-light', 'app-light');
            root.classList.remove('mc-dark', 'app-dark');
        }
    }
}
