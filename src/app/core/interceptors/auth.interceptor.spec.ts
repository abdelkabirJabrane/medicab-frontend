import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: spy },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add an Authorization header when token is present', () => {
    authServiceSpy.getToken.and.returnValue('fake-token');

    httpClient.get('/api/patients').subscribe();

    const req = httpMock.expectOne('/api/patients');
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');
  });

  it('should NOT add an Authorization header for auth requests', () => {
    authServiceSpy.getToken.and.returnValue('fake-token');

    httpClient.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
  });

  it('should call logout on 401 response', () => {
    authServiceSpy.getToken.and.returnValue('fake-token');

    httpClient.get('/api/patients').subscribe({
        error: (err) => expect(err).toBeTruthy()
    });

    const req = httpMock.expectOne('/api/patients');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
