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
