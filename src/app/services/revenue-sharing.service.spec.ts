import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RevenueSharingService } from './revenue-sharing.service';

describe('RevenueSharingService', () => {
  let service: RevenueSharingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(RevenueSharingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
