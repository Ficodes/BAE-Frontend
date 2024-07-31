import { TestBed } from '@angular/core/testing';

import { CookieRenewalService } from './cookie-renewal.service';

describe('CookieRenewalService', () => {
  let service: CookieRenewalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CookieRenewalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
