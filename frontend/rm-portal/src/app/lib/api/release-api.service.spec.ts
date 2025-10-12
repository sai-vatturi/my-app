import { TestBed } from '@angular/core/testing';
import { ReleaseApiService } from './release-api.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { API_CONFIG } from '../../core/config/app.tokens';

describe('ReleaseApiService', () => {
  let service: ReleaseApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ReleaseApiService,
        {
          provide: API_CONFIG,
          useValue: { apiUrl: 'http://localhost:8000/api/v1' }
        }
      ]
    });
    service = TestBed.inject(ReleaseApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all releases', () => {
    const mockReleases = [
      {
        _id: '1',
        name: 'Test Release',
        release_date: '2025-01-01',
        status: 'planned' as const,
        participating_squads: [],
        product_scopes: [],
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      }
    ];

    service.getAll().subscribe(releases => {
      expect(releases.length).toBe(1);
      expect(releases[0].name).toBe('Test Release');
    });

    const req = httpMock.expectOne((request) => request.url.includes('releases'));
    expect(req.request.method).toBe('GET');
    req.flush(mockReleases);
  });

  it('should create a release', () => {
    const newRelease = {
      name: 'New Release',
      release_date: '2025-02-01',
      participating_squads: ['squad1'],
      product_scopes: []
    };

    service.create(newRelease).subscribe(release => {
      expect(release.name).toBe('New Release');
    });

    const req = httpMock.expectOne((request) => request.url.includes('releases'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newRelease);
    req.flush({ ...newRelease, _id: '2', status: 'planned', created_at: '2025-01-01', updated_at: '2025-01-01' });
  });
});
