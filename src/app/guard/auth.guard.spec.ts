import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import * as moment from 'moment';
import { LocalStorageService } from '../services/local-storage.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const routeWithRoles = (roles: string[]): ActivatedRouteSnapshot =>
    ({ data: { roles } } as unknown as ActivatedRouteSnapshot);

  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        AuthGuard,
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should redirect to dashboard when login info is empty', () => {
    localStorageSpy.getObject.and.returnValue({} as object);

    const canActivate = guard.canActivate(routeWithRoles([]), state);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should allow access for a valid individual with a required role', () => {
    localStorageSpy.getObject.and.returnValue({
      expire: moment().unix() + 300,
      id: 'user-1',
      logged_as: 'user-1',
      roles: [{ name: 'Seller' }],
      organizations: [],
    } as object);

    const canActivate = guard.canActivate(routeWithRoles(['seller']), state);

    expect(canActivate).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny access when required roles are missing', () => {
    localStorageSpy.getObject.and.returnValue({
      expire: moment().unix() + 300,
      id: 'user-1',
      logged_as: 'user-1',
      roles: [{ name: 'Buyer' }],
      organizations: [],
    } as object);

    const canActivate = guard.canActivate(routeWithRoles(['seller']), state);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
