import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientLayoutComponent } from './patient-layout';
import { AuthService } from '../../core/services/auth';
import { UserAdminService } from '../../core/services/user-admin';
import { of } from 'rxjs';

describe('PatientLayoutComponent', () => {
  let component: PatientLayoutComponent;
  let fixture: ComponentFixture<PatientLayoutComponent>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'logout']);
    const userAdminServiceSpy = jasmine.createSpyObj('UserAdminService', ['getById']);
    
    authServiceSpy.getCurrentUser.and.returnValue({ medecinId: 10 } as any);
    userAdminServiceSpy.getById.and.returnValue(of({ id: 10, firstName: 'House', lastName: 'Gregory' } as any));

    await TestBed.configureTestingModule({
      imports: [PatientLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserAdminService, useValue: userAdminServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
