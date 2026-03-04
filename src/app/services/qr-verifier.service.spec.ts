import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { QrVerifierService } from './qr-verifier.service';

describe('QrVerifierService', () => {
  let service: QrVerifierService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(QrVerifierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
