import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import moment from 'moment';
import { environment } from 'src/environments/environment';
import { PROVIDER_COUNTRY_LIST_URL } from '../models/search-organizations-filters.model';
import { LocalStorageService } from '../services/local-storage.service';
import { RequestInterceptor } from './requests-interceptor';

describe('RequestInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const loginInfo = {
    id: 'user-1',
    user: 'User One',
    email: 'user@example.org',
    token: 'token-123',
    expire: moment().unix() + 3600,
    partyId: 'party-1',
    username: 'user-one',
    roles: [],
    organizations: [{ id: 'org-1', partyId: 'party-org-1' }],
    logged_as: 'org-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: LocalStorageService,
          useValue: {
            getObject: () => loginInfo,
          },
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: RequestInterceptor,
          multi: true,
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not attach BAE auth headers to the external provider country list', () => {
    http.get(PROVIDER_COUNTRY_LIST_URL).subscribe();

    const req = httpMock.expectOne(PROVIDER_COUNTRY_LIST_URL);

    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.headers.has('X-Organization')).toBeFalse();

    req.flush({});
  });

  it('keeps attaching BAE auth headers to internal API requests', () => {
    const url = `${environment.BASE_URL}/party/organization`;

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);

    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    expect(req.request.headers.get('X-Organization')).toBe('org-1');

    req.flush([]);
  });
});
