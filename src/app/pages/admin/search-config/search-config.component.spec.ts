import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SearchConfigComponent } from './search-config.component';
import { environment } from 'src/environments/environment';

describe('SearchConfigComponent', () => {
  let component: SearchConfigComponent;
  let httpMock: HttpTestingController;

  const searchConfig = {
    searchUrl: 'https://search.example.com/rag/',
    useQueryKeyword: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    component = new SearchConfigComponent(TestBed.inject(HttpClient));
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads search configuration from /config/search', async () => {
    const promise = component.loadConfig();

    const req = httpMock.expectOne(`${environment.BASE_URL}/config/search`);
    expect(req.request.method).toBe('GET');
    req.flush(searchConfig);

    await promise;

    expect(component.searchForm.value).toEqual(searchConfig);
  });

  it('defaults useQueryKeyword to false when missing', async () => {
    const promise = component.loadConfig();

    const req = httpMock.expectOne(`${environment.BASE_URL}/config/search`);
    req.flush({ searchUrl: searchConfig.searchUrl });

    await promise;

    expect(component.searchForm.value).toEqual({
      searchUrl: searchConfig.searchUrl,
      useQueryKeyword: false
    });
  });

  it('saves search configuration through /config/search', async () => {
    component.searchForm.setValue(searchConfig);

    const promise = component.saveConfig();

    const patchReq = httpMock.expectOne(`${environment.BASE_URL}/config/search`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual(searchConfig);
    patchReq.flush(searchConfig);
    await waitForPendingRequests();

    const getReq = httpMock.expectOne(`${environment.BASE_URL}/config/search`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush(searchConfig);

    await promise;
  });

  it('allows saving an empty search URL', async () => {
    component.searchForm.setValue({
      searchUrl: '',
      useQueryKeyword: false
    });

    const promise = component.saveConfig();

    const patchReq = httpMock.expectOne(`${environment.BASE_URL}/config/search`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({
      searchUrl: '',
      useQueryKeyword: false
    });
    patchReq.flush({
      searchUrl: '',
      useQueryKeyword: false
    });
    await waitForPendingRequests();

    const getReq = httpMock.expectOne(`${environment.BASE_URL}/config/search`);
    getReq.flush({
      searchUrl: '',
      useQueryKeyword: false
    });

    await promise;
  });
});

function waitForPendingRequests(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve));
}
