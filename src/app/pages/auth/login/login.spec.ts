import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Login } from './login';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../core/services/auth';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let activatedRouteStub = {
    snapshot: {
      queryParams: {}
    }
  };

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'login', 'redirectByRole']);

    await TestBed.configureTestingModule({
      imports: [
        CommonModule, 
        FormsModule, 
        InputTextModule,
        Login // Standalone component
      ],
      providers: [
        provideRouter([]), // Méthode moderne v15+ pour le routing en test
        { provide: AuthService, useValue: authSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Évite les erreurs sur les composants tiers complexes
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture.detectChanges(); // Trigger initial rendering
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error if credentials are empty', () => {
    component.username = '';
    component.password = '';
    component.onLogin();
    expect(component.errorMessage).toBe('Veuillez remplir tous les champs');
  });

  it('should call authService.login and redirect on success', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(of({ access_token: 'token', user: {} as any, token_type: 'Bearer' }));
    
    component.username = 'test';
    component.password = 'password';
    component.onLogin();
    
    tick(); // Process observable
    
    expect(authServiceSpy.login).toHaveBeenCalledWith('test', 'password');
    expect(authServiceSpy.redirectByRole).toHaveBeenCalled();
  }));

  it('should handle login error', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(throwError(() => new Error('Login failed')));
    
    component.username = 'test';
    component.password = 'password';
    component.onLogin();
    
    tick();
    
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('Login failed');
  }));
});
