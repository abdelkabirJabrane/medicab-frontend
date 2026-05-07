import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
    selector: 'app-patient-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './patient-layout.html',
    styleUrls: ['./patient-layout.scss']
})
export class PatientLayoutComponent {
    
    currentUser: any;

    constructor(private authService: AuthService) {
        this.currentUser = this.authService.getCurrentUser();
    }

    logout() {
        this.authService.logout();
    }
}
