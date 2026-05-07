import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService } from '../services/auth';
import { of } from 'rxjs';

describe('Guards', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'hasAnyRole']);
    const rSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: rSpy }
      ]
    });

    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('authGuard', () => {
    it('should return true if user is logged in', () => {
      authServiceSpy.isLoggedIn.and.returnValue(true);
      
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      
      expect(result).toBeTrue();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to login and return false if user is not logged in', () => {
      authServiceSpy.isLoggedIn.and.returnValue(false);
      const mockState = { url: '/admin/dashboard' } as RouterStateSnapshot;
      
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, mockState));
      
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/admin/dashboard' }
      });
    });
  });

  describe('roleGuard', () => {
    it('should return true if user has required role', () => {
      authServiceSpy.isLoggedIn.and.returnValue(true);
      authServiceSpy.hasAnyRole.and.returnValue(true);
      
      const mockRoute = { data: { roles: ['ROLE_MEDECIN'] } } as any;
      
      const result = TestBed.runInInjectionContext(() => roleGuard(mockRoute, {} as any));
      
      expect(result).toBeTrue();
    });

    it('should navigate to access denied if user does not have required role', () => {
      authServiceSpy.isLoggedIn.and.returnValue(true);
      authServiceSpy.hasAnyRole.and.returnValue(false);
      
      const mockRoute = { data: { roles: ['ROLE_SUPER_ADMIN'] } } as any;
      
      const result = TestBed.runInInjectionContext(() => roleGuard(mockRoute, {} as any));
      
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/access']);
    });

    it('should navigate to login if not logged in', () => {
      authServiceSpy.isLoggedIn.and.returnValue(false);
      const mockState = { url: '/protected' } as RouterStateSnapshot;
      
      const result = TestBed.runInInjectionContext(() => roleGuard({} as any, mockState));
      
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/protected' }
      });
    });
  });
});
