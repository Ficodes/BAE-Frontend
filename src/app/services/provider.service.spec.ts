import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProviderService } from './provider.service';
import { PROVIDER_COUNTRY_LIST_URL } from '../models/search-organizations-filters.model';

describe('ProviderService', () => {
  let service: ProviderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProviderService],
    });

    service = TestBed.inject(ProviderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads provider country options from the shared DOME country list', () => {
    let result: any[] | undefined;

    service.getProviderCountryOptions().subscribe(options => {
      result = options;
    });

    const req = httpMock.expectOne(PROVIDER_COUNTRY_LIST_URL);
    expect(req.request.method).toBe('GET');

    req.flush({
      IT: { en: 'Italy' },
      ES: { en: 'Spain' },
    });

    expect(result).toEqual([
      { code: 'IT', label: 'Italy' },
      { code: 'ES', label: 'Spain' },
    ]);
  });

  it('returns an empty country list when the shared DOME country list fails', () => {
    let result: any[] | undefined;

    service.getProviderCountryOptions().subscribe(options => {
      result = options;
    });

    const req = httpMock.expectOne(PROVIDER_COUNTRY_LIST_URL);
    req.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(result).toEqual([]);
  });
});
