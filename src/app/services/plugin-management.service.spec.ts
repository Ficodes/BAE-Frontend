import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { RequestInterceptor } from '../interceptors/requests-interceptor';
import { LocalStorageService } from './local-storage.service';
import { PluginManagementService } from './plugin-management.service';

describe('PluginManagementService', () => {
  let service: PluginManagementService;
  let http: HttpTestingController;
  const url = `${environment.BASE_URL}${environment.CHARGING}/api/assetManagement/assetTypes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: RequestInterceptor, multi: true },
        { provide: LocalStorageService, useValue: { getObject: () => ({
          id: 'admin', logged_as: 'organization', token: 'admin-token',
          expire: Math.floor(Date.now() / 1000) + 3600
        }) } }
      ]
    });
    service = TestBed.inject(PluginManagementService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists both plugin types through the authenticated proxy', () => {
    service.listPlugins().subscribe(result => expect(result.length).toBe(2));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer admin-token');
    req.flush([{ id: 'service', type: 'service' }, { id: 'resource', type: 'resource' }]);
  });

  it('deletes an encoded plugin ID with authentication and no request body', () => {
    let completed = false;
    service.deletePlugin('plugin/id with spaces').subscribe(() => completed = true);
    const req = http.expectOne(url + '/plugin%2Fid%20with%20spaces');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('Authorization')).toBe('Bearer admin-token');
    expect(req.request.headers.get('X-Organization')).toBe('organization');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
  });

  it('sends exactly one ZIP field, lets the browser set Content-Type, and observes the synchronous response', () => {
    const file = new File(['zip'], 'plugin.zip', { type: 'application/zip' });
    service.installPlugin(file).subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.body?.id).toBe('plugin');
      expect(response.headers.get('Location')).toBe('/plugins/plugin');
    });
    const req = http.expectOne(url + '/installJob');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Content-Type')).toBeFalse();
    expect(req.request.headers.get('Accept')).toBe('application/json');
    expect(req.request.headers.get('Authorization')).toBe('Bearer admin-token');
    expect(req.request.headers.get('X-Organization')).toBe('organization');
    const body = req.request.body as FormData;
    const keys: string[] = [];
    body.forEach((_, key) => keys.push(key));
    expect(keys).toEqual(['file']);
    expect(body.get('file')).toEqual(file);
    req.flush({ id: 'plugin' }, { headers: { Location: '/plugins/plugin' } });
  });
});
