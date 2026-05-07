import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from './app/core/services/theme.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent {
    constructor(private themeService: ThemeService) {}
}
