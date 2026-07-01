import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppInitService } from './app-init.service';
import { environment } from 'src/environments/environment';

describe('AppInitService runtime config', () => {
  let service: AppInitService;
  let httpMock: HttpTestingController;
  let originalEnvironment: Record<string, any>;

  beforeEach(() => {
    originalEnvironment = { ...environment };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(AppInitService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    Object.assign(environment, originalEnvironment);
  });

  it('keeps the environment document API when runtime config does not provide one', async () => {
    environment.documentApi = 'https://documents.example.test/tmf-api/document';

    const initPromise = service.init();

    const req = httpMock.expectOne(`${environment.BASE_URL}/config`);
    req.flush(buildConfig());

    await initPromise;

    expect(environment.documentApi).toBe('https://documents.example.test/tmf-api/document');
  });

  it('uses the runtime document API when config provides one', async () => {
    environment.documentApi = 'https://documents.example.test/tmf-api/document';

    const initPromise = service.init();

    const req = httpMock.expectOne(`${environment.BASE_URL}/config`);
    req.flush(buildConfig({ documentApi: '/document' }));

    await initPromise;

    expect(environment.documentApi).toBe('/document');
  });

  it('stores the runtime Google Tag Manager container id', async () => {
    const initPromise = service.init();

    const req = httpMock.expectOne(`${environment.BASE_URL}/config`);
    req.flush(buildConfig({ googleTagManagerId: 'GTM-WPKH4HCS' }));

    await initPromise;

    expect(environment.googleTagManagerId).toBe('GTM-WPKH4HCS');
  });

  function buildConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      ai: {},
      siop: {},
      roles: {},
      ...overrides
    };
  }
});
