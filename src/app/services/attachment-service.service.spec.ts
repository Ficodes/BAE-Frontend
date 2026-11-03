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
