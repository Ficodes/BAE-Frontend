import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UsageServiceService } from './usage-service.service';

describe('UsageServiceService', () => {
  let service: UsageServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(UsageServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
