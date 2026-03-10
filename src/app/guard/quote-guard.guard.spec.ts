import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

import { quoteGuardGuard } from './quote-guard.guard';

describe('quoteGuardGuard', () => {
  let guard: quoteGuardGuard;
  let routerSpy: jasmine.SpyObj<Router>;
  let originalQuotesEnabled: boolean;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    originalQuotesEnabled = environment.QUOTES_ENABLED;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        quoteGuardGuard,
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(quoteGuardGuard);
  });

  afterEach(() => {
    environment.QUOTES_ENABLED = originalQuotesEnabled;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true when quotes are enabled', () => {
    environment.QUOTES_ENABLED = true;

    const canActivate = guard.canActivate();

    expect(canActivate).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to dashboard and return false when quotes are disabled', () => {
    environment.QUOTES_ENABLED = false;

    const canActivate = guard.canActivate();

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
