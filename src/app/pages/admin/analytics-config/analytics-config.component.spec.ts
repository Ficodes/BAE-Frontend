import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AnalyticsConfigComponent } from './analytics-config.component';
import { environment } from 'src/environments/environment';

describe('AnalyticsConfigComponent', () => {
  let component: AnalyticsConfigComponent;
  let httpMock: HttpTestingController;

  const analyticsConfig = {
    analytics: 'https://superset.example.com',
    analyticsEnabled: true,
    analyticsDashboards: {
      businessInsightsNonLear: 'business-non-lear-dashboard',
      businessInsightsLear: 'business-lear-dashboard',
      usageMonitor: 'usage-monitor-dashboard'
    },
    analyticsSuperset: {
      guestTokenPath: '/api/v1/dome/guest_token/'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    component = new AnalyticsConfigComponent(TestBed.inject(HttpClient));
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders GET /config/analytics using the new guest token config shape', async () => {
    const promise = component.loadConfig();

    const req = httpMock.expectOne(`${environment.BASE_URL}/config/analytics`);
    expect(req.request.method).toBe('GET');
    req.flush(analyticsConfig);

    await promise;

    expect(component.analyticsForm.value).toEqual(analyticsConfig);
    expect(JSON.parse(component.providedJson)).toEqual(analyticsConfig);
  });

  it('sends exactly the new analytics config shape when saving the form', async () => {
    component.analyticsForm.setValue(analyticsConfig);

    const promise = component.saveConfig();

    const patchReq = httpMock.expectOne(`${environment.BASE_URL}/config/analytics`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual(analyticsConfig);
    expect(patchReq.request.body.analyticsSuperset).toEqual({
      guestTokenPath: '/api/v1/dome/guest_token/'
    });
    patchReq.flush(analyticsConfig);
    await waitForPendingRequests();

    const getReq = httpMock.expectOne(`${environment.BASE_URL}/config/analytics`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush(analyticsConfig);

    await promise;
  });

  it('drops obsolete Superset auth and RLS fields when saving provided JSON', async () => {
    component.providedJson = JSON.stringify({
      ...analyticsConfig,
      analyticsSuperset: {
        ...analyticsConfig.analyticsSuperset,
        username: 'admin',
        password: 'secret',
        provider: 'db',
        passwordConfigured: true,
        rls: {
          businessInsightsNonLear: [
            {
              datasets: [1],
              clauseTemplate: 'party_id = {{ partyId }}'
            }
          ]
        }
      }
    });

    const promise = component.saveProvidedJson();

    const patchReq = httpMock.expectOne(`${environment.BASE_URL}/config/analytics`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual(analyticsConfig);
    patchReq.flush(analyticsConfig);
    await waitForPendingRequests();

    const getReq = httpMock.expectOne(`${environment.BASE_URL}/config/analytics`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush(analyticsConfig);

    await promise;
  });
});

function waitForPendingRequests(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve));
}
