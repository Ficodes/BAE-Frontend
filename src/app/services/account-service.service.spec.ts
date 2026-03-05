import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';

import { AccountServiceService } from './account-service.service';

describe('AccountServiceService', () => {
  let service: AccountServiceService;
  let httpMock: HttpTestingController;

  const localStorageStub = {
    getItem: jasmine.createSpy('getItem'),
    setItem: jasmine.createSpy('setItem'),
    removeItem: jasmine.createSpy('removeItem'),
    clear: jasmine.createSpy('clear'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [{ provide: LocalStorageService, useValue: localStorageStub }],
    });

    service = TestBed.inject(AccountServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getBillingAccount should perform GET on billingAccount collection', async () => {
    const responseBody = [{ id: 'ba-1' }];

    const promise = service.getBillingAccount();
    const req = httpMock.expectOne(`${environment.BASE_URL}${environment.ACCOUNT}/billingAccount/`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('getBillingAccountById should perform GET on billingAccount by id', async () => {
    const id = 'ba-123';
    const responseBody = { id };

    const promise = service.getBillingAccountById(id);
    const req = httpMock.expectOne(`${environment.BASE_URL}${environment.ACCOUNT}/billingAccount/${id}`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('postBillingAccount should perform POST with payload', () => {
    const payload = { name: 'Billing A' };
    const responseBody = { id: 'new-id' };

    service.postBillingAccount(payload).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}${environment.ACCOUNT}/billingAccount/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(responseBody);
  });

  it('updateBillingAccount should perform PATCH with payload', () => {
    const id = 'ba-123';
    const payload = { name: 'Updated billing' };
    const responseBody = { id, ...payload };

    service.updateBillingAccount(id, payload).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}${environment.ACCOUNT}/billingAccount/${id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush(responseBody);
  });

  it('deleteBillingAccount should perform DELETE by id', () => {
    const id = 'ba-123';
    const responseBody = { deleted: true };

    service.deleteBillingAccount(id).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}${environment.ACCOUNT}/billingAccount/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(responseBody);
  });

  it('getUserInfo should perform GET on party individual endpoint', async () => {
    const partyId = 'individual-1';
    const responseBody = { id: partyId };

    const promise = service.getUserInfo(partyId);
    const req = httpMock.expectOne(`${environment.BASE_URL}/party/individual/${partyId}`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('getOrgInfo should perform GET on party organization endpoint', async () => {
    const partyId = 'org-1';
    const responseBody = { id: partyId };

    const promise = service.getOrgInfo(partyId);
    const req = httpMock.expectOne(`${environment.BASE_URL}/party/organization/${partyId}`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('getOrgList should perform GET on organization collection endpoint', async () => {
    const responseBody = [{ id: 'org-1' }];

    const promise = service.getOrgList();
    const req = httpMock.expectOne(`${environment.BASE_URL}/party/organization`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('updateUserInfo should perform PATCH on party individual endpoint', () => {
    const partyId = 'individual-1';
    const profile = { givenName: 'Jane' };
    const responseBody = { id: partyId, ...profile };

    service.updateUserInfo(partyId, profile).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}/party/individual/${partyId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(profile);
    req.flush(responseBody);
  });

  it('updateOrgInfo should perform PATCH on party organization endpoint', () => {
    const partyId = 'org-1';
    const profile = { name: 'Org Name' };
    const responseBody = { id: partyId, ...profile };

    service.updateOrgInfo(partyId, profile).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}/party/organization/${partyId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(profile);
    req.flush(responseBody);
  });
});
