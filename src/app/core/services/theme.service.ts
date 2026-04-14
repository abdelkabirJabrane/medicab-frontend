import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private _dark = signal<boolean>(false);

    constructor() {
        this._dark.set(false);
        this.applyTheme();
    }

    isDark(): boolean {
        return false;
    }

    toggle() {
        // Disabled
    }

    private applyTheme() {
        const root = document.documentElement;
        root.classList.add('mc-light', 'app-light', 'medicab-light');
        root.classList.remove('mc-dark', 'app-dark', 'medicab-dark');
    }
}
