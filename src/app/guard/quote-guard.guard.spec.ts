import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { quoteGuardGuard } from './quote-guard.guard';

describe('quoteGuardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => quoteGuardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
