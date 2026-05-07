import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecretaireLayoutComponent } from './secretaire-layout';
import { AuthService } from '../../core/services/auth';
import { PatientService } from '../../core/services/patient';
import { AppointmentService } from '../../core/services/appointment';
import { MessageService } from 'primeng/api';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('SecretaireLayoutComponent', () => {
  let component: SecretaireLayoutComponent;
  let fixture: ComponentFixture<SecretaireLayoutComponent>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'logout']);
    const patientSpy = jasmine.createSpyObj('PatientService', ['search', 'create']);
    const appointSpy = jasmine.createSpyObj('AppointmentService', ['create']);

    authSpy.getCurrentUser.and.returnValue({ firstName: 'Test', lastName: 'Sec' });

    await TestBed.configureTestingModule({
      imports: [SecretaireLayoutComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: PatientService, useValue: patientSpy },
        { provide: AppointmentService, useValue: appointSpy },
        MessageService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecretaireLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
