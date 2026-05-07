import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SecPatientsComponent } from './patients';
import { CommonModule } from '@angular/common';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../core/services/patient';
import { AuthService } from '../../../core/services/auth';
import { UserAdminService } from '../../../core/services/user-admin';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('SecPatientsComponent', () => {
  let component: SecPatientsComponent;
  let fixture: ComponentFixture<SecPatientsComponent>;
  let patientServiceSpy: jasmine.SpyObj<PatientService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let userAdminServiceSpy: jasmine.SpyObj<UserAdminService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;

  const mockPatients = [
    { id: 1, nom: 'Doe', prenom: 'John', cin: 'AB123', email: 'john@example.com', telephone: '0612345678', actif: true },
    { id: 2, nom: 'Smith', prenom: 'Jane', cin: 'CD456', email: 'jane@example.com', telephone: '0687654321', actif: false }
  ];

  beforeEach(async () => {
    const pSpy = jasmine.createSpyObj('PatientService', ['getAll', 'getById', 'create', 'update', 'delete']);
    const aSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const uSpy = jasmine.createSpyObj('UserAdminService', ['getById']);
    const mSpy = jasmine.createSpyObj('MessageService', ['add']);
    const cSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [
        CommonModule, 
        FormsModule, 
        SecPatientsComponent
      ],
      providers: [
        provideRouter([]),
        { provide: PatientService, useValue: pSpy },
        { provide: AuthService, useValue: aSpy },
        { provide: UserAdminService, useValue: uSpy },
        { provide: MessageService, useValue: mSpy },
        { provide: ConfirmationService, useValue: cSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SecPatientsComponent);
    component = fixture.componentInstance;
    patientServiceSpy = TestBed.inject(PatientService) as jasmine.SpyObj<PatientService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    userAdminServiceSpy = TestBed.inject(UserAdminService) as jasmine.SpyObj<UserAdminService>;
    messageServiceSpy = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    confirmationServiceSpy = TestBed.inject(ConfirmationService) as jasmine.SpyObj<ConfirmationService>;

    authServiceSpy.getCurrentUser.and.returnValue({ medecinId: 10 } as any);
    userAdminServiceSpy.getById.and.returnValue(of({ id: 10, firstName: 'House', lastName: 'Gregory' } as any));
    patientServiceSpy.getAll.and.returnValue(of(mockPatients));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patients on init', () => {
    fixture.detectChanges();
    expect(patientServiceSpy.getAll).toHaveBeenCalled();
    expect(component.patients.length).toBe(2);
  });

  it('should filter by search query', () => {
    fixture.detectChanges();
    component.searchQuery = 'John';
    component.filtrer();
    expect(component.patientsFiltres.length).toBe(1);
  });

    it('should confirm before delete', fakeAsync(() => {
        const patientToDelete = mockPatients[0];
        patientServiceSpy.delete.and.returnValue(of(undefined));
        
        // Mock confirmation accept
        confirmationServiceSpy.confirm.and.callFake((config) => {
            if (config.accept) config.accept();
            return confirmationServiceSpy;
        });

        component.desactiverPatient(patientToDelete);
        tick(); // Ensure async subscription in accept() is called
        
        expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
        expect(patientServiceSpy.delete).toHaveBeenCalledWith(1);
    }));
});
