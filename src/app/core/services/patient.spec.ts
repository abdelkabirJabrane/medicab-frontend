import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PatientService } from './patient';
import { AuthService } from './auth';
import { environment } from '../../../environments/environment';

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PatientService,
        { provide: AuthService, useValue: spy }
      ]
    });

    service = TestBed.inject(PatientService);
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    
    authServiceSpy.getCurrentUser.and.returnValue({ tenantId: 42 } as any);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll', () => {
    it('should include tenantId in params', () => {
      service.getAll().subscribe();

      const req = httpMock.expectOne(request => 
        request.url === environment.services.patients &&
        request.params.get('tenantId') === '42'
      );
      
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('create', () => {
    it('should format date and include tenantId', () => {
      const patientData = { nom: 'Doe', dateNaissance: '1990-01-01T12:00:00Z' };
      service.create(patientData).subscribe();

      const req = httpMock.expectOne(environment.services.patients);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.dateNaissance).toBe('1990-01-01'); // Formatted
      expect(req.request.body.tenantId).toBe(42); // Added
      req.flush({});
    });
  });

  describe('error handling', () => {
    it('should extract error message from Spring validation error object', (done) => {
      service.getAll().subscribe({
        error: (err) => {
          expect(err.message).toBe('Invalid name, Invalid CIN');
          done();
        }
      });

      const req = httpMock.expectOne(request => request.url === environment.services.patients);
      req.flush({
        errors: {
          nom: 'Invalid name',
          cin: 'Invalid CIN'
        }
      }, { status: 400, statusText: 'Bad Request' });
    });

    it('should extract simple string error', (done) => {
        service.getById(1).subscribe({
          error: (err) => {
            expect(err.message).toBe('Patient not found');
            done();
          }
        });
  
        const req = httpMock.expectOne(`${environment.services.patients}/1`);
        req.flush('Patient not found', { status: 404, statusText: 'Not Found' });
      });
  });
});
