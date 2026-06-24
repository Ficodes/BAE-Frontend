import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProviderService } from './provider.service';
import { environment } from '../../environments/environment';

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

    const req = httpMock.expectOne(environment.providerCountriesUrl);
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

    const req = httpMock.expectOne(environment.providerCountriesUrl);
    req.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(result).toEqual([]);
  });

  it('searches tender providers through the configured backend base URL', () => {
    const filters = {
      categories: ['Cloud services'],
      countries: ['IT'],
      complianceLevels: ['PP'],
    };
    let result: any[] | undefined;

    service.getProvidersForTenderNew(filters).subscribe(providers => {
      result = providers;
    });

    const baseUrl = `${environment.BASE_URL}${environment.searchOrganizationsEndpoint}`;
    const req = httpMock.expectOne(`${baseUrl}?page=0&size=100`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(filters);

    // Fewer than a full page → stops after the first page
    req.flush([{ id: 'provider-1', tradingName: 'Provider One' }]);

    expect(result).toEqual([{ id: 'provider-1', tradingName: 'Provider One' }]);
  });

  it('fetches all pages when provider count equals the page size', () => {
    const filters = { categories: [], countries: [], complianceLevels: [] };
    let result: any[] | undefined;

    service.getProvidersForTenderNew(filters).subscribe(providers => {
      result = providers;
    });

    const baseUrl = `${environment.BASE_URL}${environment.searchOrganizationsEndpoint}`;
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `provider-${i}` }));
    const page2 = [{ id: 'provider-100' }, { id: 'provider-101' }];

    const req1 = httpMock.expectOne(`${baseUrl}?page=0&size=100`);
    expect(req1.request.method).toBe('POST');
    req1.flush(page1);

    // First page was full → service fetches the next page (page index + 1)
    const req2 = httpMock.expectOne(`${baseUrl}?page=1&size=100`);
    expect(req2.request.method).toBe('POST');
    req2.flush(page2);

    // Second page was partial → stops; all results combined
    expect(result).toEqual([...page1, ...page2]);
  });
});
