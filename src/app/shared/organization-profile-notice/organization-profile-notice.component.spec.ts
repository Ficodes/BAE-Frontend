import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RequestInterceptor } from '../../interceptors/requests-interceptor';
import { LoginInfo } from '../../models/interfaces';
import { AccountServiceService } from '../../services/account-service.service';
import { EventMessageService } from '../../services/event-message.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { environment } from '../../../environments/environment';
import { OrganizationProfileNoticeComponent } from './organization-profile-notice.component';

describe('OrganizationProfileNoticeComponent', () => {
  let fixture: ComponentFixture<OrganizationProfileNoticeComponent>;
  let component: OrganizationProfileNoticeComponent;
  let organizationCheck: jasmine.Spy;
  let http: HttpTestingController;
  let events: EventMessageService;
  let session: LoginInfo;
  const organizationUrl = `${AccountServiceService.BASE_URL}/party/organization/party-second`;
  const firstOrganizationUrl = `${AccountServiceService.BASE_URL}/party/organization/party-first`;
  const paymentInfoUrl = `${environment.BASE_URL}/paymentInfo`;
  const completeProfile = {
    partyCharacteristic: [{ name: 'country', value: 'ES' }],
    contactMedium: [{ mediumType: 'Email', characteristic: { emailAddress: 'contact@example.com' } }]
  };

  beforeEach(async () => {
    session = {
      id: 'person', user: 'Person', username: 'Person', email: 'person@example.com',
      token: 'test-token', expire: Math.floor(Date.now() / 1000) + 3600,
      partyId: 'party-person', roles: [{ name: 'admin' }], logged_as: 'second',
      organizations: [
        { id: 'first', name: 'First organization', partyId: 'party-first', roles: [{ name: environment.ORG_ADMIN_ROLE }] },
        { id: 'second', name: 'Second organization', partyId: 'party-second', roles: [{ name: environment.ORG_ADMIN_ROLE }] }
      ]
    };
    await TestBed.configureTestingModule({
      imports: [OrganizationProfileNoticeComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useValue: { getObject: () => session } },
        { provide: HTTP_INTERCEPTORS, useClass: RequestInterceptor, multi: true }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(OrganizationProfileNoticeComponent);
    component = fixture.componentInstance;
    organizationCheck = spyOn(component, 'checkOrganization').and.callThrough();
    http = TestBed.inject(HttpTestingController);
    events = TestBed.inject(EventMessageService);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  async function open(profile: object = {}, gatewaysCount: number | string = 1): Promise<void> {
    fixture.detectChanges();
    const request = http.expectOne(organizationUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('X-Organization')).toBe('second');
    request.flush(profile);
    const payment = http.expectOne(paymentInfoUrl);
    expect(payment.request.method).toBe('GET');
    expect(payment.request.headers.get('X-Organization')).toBe('second');
    payment.flush({ gatewaysCount });
    await organizationCheck.calls.first().returnValue;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('checks the selected organization by partyId rather than the first organization or the person', async () => {
    await open();
    expect(component.organizationName).toBe('Second organization');
    expect(component.canEdit).toBeTrue();
    expect(component.isOpen).toBeTrue();
    expect(component.missingCountry).toBeTrue();
    expect(component.missingEmail).toBeTrue();
    expect(component.missingPaymentInfo).toBeFalse();
    expect(component.missingDetails).not.toContain('_required_payment_info');
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticePaymentDashboard"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeCountry"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeEmail"]')).toBeTruthy();
  });

  it('only offers EU countries so the saved country can be selected in Profile', async () => {
    await open();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('[data-cy="organizationNoticeCountry"]');
    const options = Array.from(select.options, option => option.value);
    expect(options.length).toBe(28); // Placeholder and the 27 EU countries.
    expect(options).toContain('ES');
    expect(options).toContain('FR');
    expect(options).toContain('DE');
    for (const code of ['AF', 'GB', 'CH', 'US']) {
      expect(options).not.toContain(code);
    }
  });

  for (const mediumType of ['Email', 'email', 'EMAIL']) {
    it(`does not open the notice for a complete profile with mediumType ${mediumType}`, async () => {
      await open({ ...completeProfile, contactMedium: [{ mediumType, characteristic: { emailAddress: 'contact@example.com' } }] });
      expect(component.isOpen).toBeFalse();
    });
  }

  for (const gatewaysCount of [0, '0']) {
    it(`opens for missing payment info alone when gatewaysCount is ${JSON.stringify(gatewaysCount)}`, async () => {
      await open(completeProfile, gatewaysCount);
      expect(component.isOpen).toBeTrue();
      expect(component.missingCountry).toBeFalse();
      expect(component.missingEmail).toBeFalse();
      expect(component.missingPaymentInfo).toBeTrue();
      expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeCountry"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeEmail"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticePaymentDashboard"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-cy="saveOrganizationProfileNotice"]')).toBeNull();
      await component.save();
      http.expectNone(organizationUrl);
      expect(component.isOpen).toBeTrue();
    });
  }

  it('shows a reminder without a form or write permission to a member, even when the person is a global admin', async () => {
    session.organizations[1].roles = [{ name: environment.SELLER_ROLE }];
    await open();
    expect(component.canEdit).toBeFalse();
    expect(component.isOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ORGANIZATION_PROFILE_NOTICE._member_message');
    await component.save();
    http.expectNone(request => request.method === 'PATCH');
  });

  it('does not warn members whose organization already has both attributes', async () => {
    session.organizations[1].roles = [{ name: environment.SELLER_ROLE }];
    await open(completeProfile);
    expect(component.isOpen).toBeFalse();
  });

  it('warns a member when only payment info is missing without showing the admin dashboard button', async () => {
    session.organizations[1].roles = [{ name: environment.SELLER_ROLE }];
    await open(completeProfile, 0);
    expect(component.isOpen).toBeTrue();
    expect(component.canEdit).toBeFalse();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('li').textContent).toContain('ORGANIZATION_PROFILE_NOTICE._payment_info');
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticePaymentDashboard"]')).toBeNull();
  });

  it('does not query an organization in an individual session', () => {
    session.logged_as = session.id;
    fixture.detectChanges();
    http.expectNone(organizationUrl);
    expect(component.isOpen).toBeFalse();
  });

  it('does not query an organization with an expired or missing session', async () => {
    session.expire = 0;
    fixture.detectChanges();
    http.expectNone(organizationUrl);
    session = {} as LoginInfo;
    events.emitLogin(session);
    await fixture.whenStable();
    expect(component.isOpen).toBeFalse();
  });

  it('only asks for email when the country already exists', async () => {
    await open({ partyCharacteristic: completeProfile.partyCharacteristic });
    expect(component.form.controls.country.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeCountry"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeEmail"]')).toBeTruthy();
  });

  it('only asks for country when an email medium already exists', async () => {
    await open({ contactMedium: completeProfile.contactMedium });
    expect(component.form.controls.email.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeEmail"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeCountry"]')).toBeTruthy();
  });

  for (const emailAddress of [undefined, '', 'not-an-email']) {
    it(`only checks that an email medium exists, regardless of its address (${emailAddress})`, async () => {
      await open({
        partyCharacteristic: [{ name: 'country', value: 'any country value' }],
        contactMedium: [{ mediumType: 'email', characteristic: { emailAddress } }]
      });
      expect(component.isOpen).toBeFalse();
    });
  }

  it('accepts an empty country value because only null and undefined count as missing', async () => {
    await open({ ...completeProfile, partyCharacteristic: [{ name: 'country', value: '' }] });
    expect(component.isOpen).toBeFalse();
  });

  for (const value of [null, undefined]) {
    it(`asks for country when its value is ${value}`, async () => {
      await open({ ...completeProfile, partyCharacteristic: [{ name: 'country', value }] });
      expect(component.missingCountry).toBeTrue();
      expect(component.isOpen).toBeTrue();
    });
  }

  it('requires values for missing fields without sending an empty submission', async () => {
    await open({ partyCharacteristic: [{ name: 'country', value: null }] });
    component.form.setValue({ country: 'ES', email: '' });
    await component.save();
    expect(component.form.controls.email.invalid).toBeTrue();
    http.expectNone(request => request.method === 'PATCH');
  });

  for (const email of ['not-an-email', 'person@', 'person@example']) {
    it(`rejects an invalid email entered in the form (${email})`, async () => {
      await open();
      component.form.setValue({ country: 'ES', email });
      fixture.detectChanges();
      expect(component.form.controls.email.invalid).toBeTrue();
      expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticeEmail"]').getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('#organization-notice-email-error').textContent).toContain('ORGANIZATION_PROFILE_NOTICE._email_invalid');
      expect(fixture.nativeElement.querySelector('[data-cy="saveOrganizationProfileNotice"]').disabled).toBeTrue();
      await component.save();
      http.expectNone(organizationUrl);
    });
  }

  it('preserves existing and recently added data while saving both missing attributes', async () => {
    await open();
    const phone = { mediumType: 'TelephoneNumber', characteristic: { phoneNumber: '+34600123456' } };
    const description = { name: 'description', value: 'Keep this description' };
    component.form.setValue({ country: 'ES', email: 'contact@example.com' });
    const updated = spyOn(events, 'emitOrganizationProfileUpdated');
    const saving = component.save();
    http.expectOne(organizationUrl).flush({ partyCharacteristic: [description], contactMedium: [phone] });
    await Promise.resolve();
    const patch = http.expectOne(organizationUrl);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.headers.get('X-Organization')).toBe('second');
    expect(patch.request.body.partyCharacteristic).toEqual([description, { name: 'country', value: 'ES' }]);
    expect(patch.request.body.contactMedium).toEqual([phone, {
      mediumType: 'Email', preferred: true,
      characteristic: { contactType: 'Email', emailAddress: 'contact@example.com' }
    }]);
    patch.flush({});
    await saving;
    expect(component.isOpen).toBeFalse();
    expect(updated).toHaveBeenCalledOnceWith('party-second');
  });

  it('keeps the payment reminder open after saving the missing country and email', async () => {
    await open({}, 0);
    component.form.setValue({ country: 'ES', email: 'contact@example.com' });
    const saving = component.save();
    http.expectOne(organizationUrl).flush({});
    await Promise.resolve();
    http.expectOne(organizationUrl).flush({});
    await saving;
    fixture.detectChanges();
    expect(component.isOpen).toBeTrue();
    expect(component.missingCountry).toBeFalse();
    expect(component.missingEmail).toBeFalse();
    expect(component.missingPaymentInfo).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-cy="saveOrganizationProfileNotice"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="organizationNoticePaymentDashboard"]')).toBeTruthy();
  });

  it('keeps attributes added elsewhere, including an email medium with an empty address', async () => {
    await open();
    component.form.setValue({ country: 'ES', email: 'contact@example.com' });
    const saving = component.save();
    http.expectOne(organizationUrl).flush({
      partyCharacteristic: [{ name: 'country', value: 'FR' }],
      contactMedium: [{ mediumType: 'email', preferred: false, characteristic: { contactType: 'Support', emailAddress: '', faxNumber: 'keep' } }]
    });
    await saving;
    http.expectNone(request => request.method === 'PATCH');
    expect(component.isOpen).toBeFalse();
  });

  it('skips the PATCH when another editor has already completed the profile', async () => {
    await open();
    component.form.setValue({ country: 'ES', email: 'contact@example.com' });
    const saving = component.save();
    http.expectOne(organizationUrl).flush(completeProfile);
    await saving;
    http.expectNone(request => request.method === 'PATCH');
    expect(component.isOpen).toBeFalse();
  });

  it('allows closing with X and does not reopen on ordinary navigation checks', async () => {
    await open();
    fixture.nativeElement.querySelector('[data-cy="closeOrganizationProfileNotice"]').click();
    fixture.detectChanges();
    expect(component.isOpen).toBeFalse();
    await component.checkOrganization();
    http.expectNone(organizationUrl);
    expect(component.isOpen).toBeFalse();
  });

  it('stays open when clicking outside or pressing Escape without saving', async () => {
    await open();
    fixture.nativeElement.querySelector('[role="dialog"]').parentElement.click();
    expect(component.isOpen).toBeTrue();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isOpen).toBeTrue();
    http.expectNone(request => request.method === 'PATCH');
  });

  it('ignores responses from an earlier selection, including switching away and back to the same organization', async () => {
    fixture.detectChanges();
    const oldSecond = http.expectOne(organizationUrl);
    const oldPayment = http.expectOne(paymentInfoUrl);
    session.logged_as = 'first';
    events.emitChangedSession(session);
    const first = http.expectOne(firstOrganizationUrl);
    const firstPayment = http.expectOne(paymentInfoUrl);
    session.logged_as = 'second';
    events.emitChangedSession(session);
    http.expectOne(organizationUrl).flush(completeProfile);
    http.expectOne(paymentInfoUrl).flush({ gatewaysCount: 1 });
    await organizationCheck.calls.mostRecent().returnValue;
    oldSecond.flush({});
    first.flush({});
    await fixture.whenStable();
    expect(component.organizationName).toBe('Second organization');
    expect(component.isOpen).toBeFalse();
    expect(component.checking).toBeFalse();
    expect(oldPayment.cancelled).toBeTrue();
    expect(firstPayment.cancelled).toBeTrue();
  });

  it('does not save to the old organization if the selection changes during the fresh read', async () => {
    await open();
    component.form.setValue({ country: 'ES', email: 'contact@example.com' });
    const saving = component.save();
    const freshRead = http.expectOne(organizationUrl);
    session.logged_as = 'first';
    events.emitChangedSession(session);
    freshRead.flush({});
    http.expectOne(firstOrganizationUrl).flush(completeProfile);
    http.expectOne(paymentInfoUrl).flush({ gatewaysCount: 1 });
    await saving;
    await organizationCheck.calls.mostRecent().returnValue;
    await fixture.whenStable();
    http.expectNone(request => request.method === 'PATCH');
    expect(component.isOpen).toBeFalse();
  });

  it('shows a dismissible retry message if the initial read fails', async () => {
    fixture.detectChanges();
    http.expectOne(organizationUrl).flush({}, { status: 500, statusText: 'Server error' });
    http.expectOne(paymentInfoUrl).flush({ gatewaysCount: 1 });
    await organizationCheck.calls.first().returnValue;
    expect(component.loadFailed).toBeTrue();
    expect(component.isOpen).toBeTrue();
    component.dismiss();
    expect(component.isOpen).toBeFalse();
  });

  it('offers a retry after a payment lookup fails without treating the failure as a zero count', async () => {
    fixture.detectChanges();
    http.expectOne(organizationUrl).flush(completeProfile);
    http.expectOne(paymentInfoUrl).flush({}, { status: 500, statusText: 'Server error' });
    await organizationCheck.calls.first().returnValue;
    expect(component.loadFailed).toBeTrue();
    expect(component.isOpen).toBeTrue();
    expect(component.missingPaymentInfo).toBeFalse();
    const retry = component.checkOrganization(true);
    http.expectOne(organizationUrl).flush(completeProfile);
    http.expectOne(paymentInfoUrl).flush({ gatewaysCount: 0 });
    await retry;
    expect(component.loadFailed).toBeFalse();
    expect(component.isOpen).toBeTrue();
    expect(component.missingPaymentInfo).toBeTrue();
  });

  it('displays proxy validation errors without blocking dismissal', async () => {
    await open();
    component.form.setValue({ country: 'any country value', email: 'contact@example.com' });
    expect(component.form.valid).toBeTrue();
    const saving = component.save();
    http.expectOne(organizationUrl).flush({});
    await Promise.resolve();
    const patch = http.expectOne(organizationUrl);
    expect(patch.request.body.partyCharacteristic[0].value).toBe('any country value');
    expect(patch.request.body.contactMedium[0].characteristic.emailAddress).toBe('contact@example.com');
    patch.flush({ message: 'Invalid country code' }, { status: 422, statusText: 'Unprocessable Entity' });
    await saving;
    expect(component.saveFailed).toBeTrue();
    expect(component.saveErrorMessage).toBe('Invalid country code');
    expect(component.saving).toBeFalse();
    expect(component.isOpen).toBeTrue();
    component.dismiss();
    expect(component.isOpen).toBeFalse();
  });
});
