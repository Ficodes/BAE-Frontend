import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RefreshLoginServiceService } from './refresh-login-service.service';

describe('RefreshLoginServiceService', () => {
  let service: RefreshLoginServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(RefreshLoginServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
