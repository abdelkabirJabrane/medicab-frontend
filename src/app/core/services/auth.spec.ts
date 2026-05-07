import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, AuthResponse, AuthUser } from './auth';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy = { navigate: jasmine.createSpy('navigate') };

  const mockUser: AuthUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['ROLE_MEDECIN'],
    active: true
  };

  const mockAuthResponse: AuthResponse = {
    access_token: 'fake-jwt-token',
    token_type: 'Bearer',
    user: mockUser
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear localStorage before each test
    localStorage.clear();
    routerSpy.navigate.calls.reset();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login and save user info on success', (done) => {
      service.login('testuser', 'password').subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('MedGest-token')).toBe('fake-jwt-token');
        expect(localStorage.getItem('MedGest-user')).toContain('testuser');
        expect(service.getCurrentUser()).toEqual(mockUser);
        done();
      });

      const req = httpMock.expectOne(request => 
        request.url === `${environment.services.auth}/login` &&
        request.params.get('username') === 'testuser' &&
        request.params.get('password') === 'password'
      );
      
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('should handle unauthorized error', (done) => {
      service.login('wrong', 'wrong').subscribe({
        error: (err) => {
          expect(err.message).toBe('Nom d\'utilisateur ou mot de passe incorrect');
          expect(service.isLoggedIn()).toBeFalse();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.services.auth}/login?username=wrong&password=wrong`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('role logic', () => {
    it('should return correct primary role', () => {
      // Mock user with multiple roles
      const userWithRoles: AuthUser = { ...mockUser, roles: ['ROLE_PATIENT', 'ROLE_MEDECIN'] };
      
      // We need to trigger handleAuthSuccess or manually set subject (but it's private)
      // So we use login mock and check
      service['handleAuthSuccess']({ ...mockAuthResponse, user: userWithRoles });
      
      expect(service.getPrimaryRole()).toBe('ROLE_MEDECIN'); // MEDECIN has priority over PATIENT
    });

    it('should return correct redirect route for MEDECIN', () => {
      service['handleAuthSuccess'](mockAuthResponse);
      expect(service.getRedirectRouteByRole()).toBe('/medecin/dashboard');
    });

    it('should return correct redirect route for PATIENT', () => {
      const patientResponse = { ...mockAuthResponse, user: { ...mockUser, roles: ['ROLE_PATIENT'] } };
      service['handleAuthSuccess'](patientResponse);
      expect(service.getRedirectRouteByRole()).toBe('/patient/dashboard');
    });
  });

  describe('logout', () => {
    it('should clear storage and navigate to login', () => {
      // Setup logged in state
      localStorage.setItem('MedGest-token', 'token');
      localStorage.setItem('MedGest-user', JSON.stringify(mockUser));
      
      service.logout();
      
      expect(localStorage.getItem('MedGest-token')).toBeNull();
      expect(localStorage.getItem('MedGest-user')).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('restoreSession', () => {
    it('should restore user from localStorage on init', () => {
      localStorage.setItem('MedGest-token', 'saved-token');
      localStorage.setItem('MedGest-user', JSON.stringify(mockUser));
      
      // We need to re-instantiate or trigger restoreSession
      // Since it's private and called in constructor, let's create a new instance
      const newService = new AuthService(TestBed.inject(HttpClient) as any, TestBed.inject(Router) as any);
      
      expect(newService.isLoggedIn()).toBeTrue();
      expect(newService.getCurrentUser()).toEqual(mockUser);
    });
  });
});
