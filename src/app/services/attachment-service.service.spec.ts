import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { RequestInterceptor } from '../interceptors/requests-interceptor';
import { LocalStorageService } from './local-storage.service';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';

import { AttachmentServiceService } from './attachment-service.service';

describe('AttachmentServiceService', () => {
  let service: AttachmentServiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: RequestInterceptor, multi: true },
        { provide: LocalStorageService, useValue: { getObject: () => ({
          id: 'user', logged_as: 'organization', token: 'session-token',
          expire: Math.floor(Date.now() / 1000) + 3600
        }) } }
      ],
    });
    service = TestBed.inject(AttachmentServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  for (const isPublic of [false, true]) {
    it('uploads binary multipart data with isPublic=' + isPublic, () => {
      const file = new File(['{}'], 'service.json', { type: 'application/json' });
      const metadata = { contentType: file.type, isPublic };
      const response = { id: 'resource-id', href: '/assets/resource-id', content: '/media/file.json', contentType: file.type };
      service.uploadManagedFile(file, metadata).subscribe(result => expect(result).toEqual(response));
      const req = httpMock.expectOne(`${environment.BASE_URL}/charging/api/assetManagement/assets/uploadJob`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.has('Content-Type')).toBeFalse(); // Browser supplies the multipart boundary.
      const body = req.request.body as FormData;
      expect(body.get('file')).toEqual(file);
      expect(JSON.parse(body.get('json') as string)).toEqual(metadata);
      const keys: string[] = [];
      body.forEach((value, key) => keys.push(key));
      expect(keys).toEqual(['file', 'json']);
      req.flush(response);
    });
  }

  it('loads metadata with the authenticated session and an encoded file ID', () => {
    const file = { id: 'file/id', contentType: 'application/pdf', location: '/charging/media/assets/document.pdf' };
    service.getFileInfo(file.id).subscribe(result => expect(result).toEqual(file));
    const req = httpMock.expectOne(`${environment.BASE_URL}/charging/api/assetManagement/assets/file%2Fid`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer session-token');
    expect(req.request.headers.get('X-Organization')).toBe('organization');
    req.flush(file);
  });

  it('downloads private media through the authenticated API even with an internal location hostname', () => {
    const file = { id: 'file', contentType: 'application/pdf', location: 'http://proxy.docker:8004/charging/media/assets/provider/document.pdf' };
    const blob = new Blob(['pdf'], { type: file.contentType });
    service.downloadManagedFile(file).subscribe(result => expect(result).toEqual(blob));
    const req = httpMock.expectOne(`${environment.BASE_URL}/charging/media/assets/provider/document.pdf`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Authorization')).toBe('Bearer session-token');
    expect(req.request.headers.get('X-Organization')).toBe('organization');
    req.flush(blob);
  });

  it('rejects locations outside the managed media path', () => {
    expect(() => service.downloadManagedFile({ id: 'file', contentType: '', location: 'https://example.org/private' })).toThrow();
    httpMock.expectNone('https://example.org/private');
  });

  it('uploadFile should POST to the uploadJob endpoint with the provided payload', () => {
    const payload = { fileName: 'test.pdf', fileContent: 'abc' };
    const responseBody = { id: 'job-1' };

    service.uploadFile(payload).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}/charging/api/assetManagement/assets/uploadJob`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(responseBody);
  });
});
