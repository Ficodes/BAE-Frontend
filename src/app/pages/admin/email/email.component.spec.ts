import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EmailComponent } from './email.component';
import { environment } from 'src/environments/environment';

describe('EmailComponent', () => {
  let component: EmailComponent;
  let fixture: ComponentFixture<EmailComponent>;
  let httpMock: HttpTestingController;

  const configUrl = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
  const configResponse = {
    hasPassword: true,
    smtpServer: 'smtp.example.org',
    smtpPort: '587',
    email: 'source@example.org',
    emailUser: 'smtp-user',
    contactUsDestinations: {
      general: 'general@example.org',
      technical: 'technical@example.org',
      onboarding: 'onboarding@example.org',
      legal: 'legal@example.org'
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [CommonModule, ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [EmailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = httpMock.expectOne(configUrl);
    req.flush(configResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load source email and contact-us destinations separately', () => {
    expect(component.emailForm.value.email).toBe('source@example.org');
    expect(component.emailForm.value.contactUsGeneralEmail).toBe('general@example.org');
    expect(component.emailForm.value.contactUsTechnicalEmail).toBe('technical@example.org');
    expect(component.emailForm.value.contactUsOnboardingEmail).toBe('onboarding@example.org');
    expect(component.emailForm.value.contactUsLegalEmail).toBe('legal@example.org');
  });

  it('should leave contact-us destinations empty when loading legacy config', () => {
    component.fillData({
      smtpServer: 'legacy-smtp.example.org',
      smtpPort: '25',
      email: 'source@example.org',
      emailUser: 'legacy-user'
    });

    expect(component.emailForm.value.email).toBe('source@example.org');
    expect(component.emailForm.value.contactUsGeneralEmail).toBe('');
    expect(component.emailForm.value.contactUsTechnicalEmail).toBe('');
    expect(component.emailForm.value.contactUsOnboardingEmail).toBe('');
    expect(component.emailForm.value.contactUsLegalEmail).toBe('');
  });

  it('should post source email and contact-us destinations as separate config fields', () => {
    component.emailForm.setValue({
      smtpServer: 'smtp.example.org',
      smtpPort: '587',
      email: 'source@example.org',
      emailUser: 'smtp-user',
      emailPassword: 'secret',
      contactUsGeneralEmail: 'general@example.org',
      contactUsTechnicalEmail: 'technical@example.org',
      contactUsOnboardingEmail: 'onboarding@example.org',
      contactUsLegalEmail: 'legal@example.org'
    });

    component.addConfig();

    const req = httpMock.expectOne(configUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      smtpServer: 'smtp.example.org',
      smtpPort: '587',
      email: 'source@example.org',
      emailUser: 'smtp-user',
      emailPassword: 'secret',
      contactUsDestinations: {
        general: 'general@example.org',
        technical: 'technical@example.org',
        onboarding: 'onboarding@example.org',
        legal: 'legal@example.org'
      }
    });
    req.flush({});

    expect(component.emailForm.value.smtpServer).toBe('smtp.example.org');
    expect(component.emailForm.value.smtpPort).toBe('587');
    expect(component.emailForm.value.email).toBe('source@example.org');
    expect(component.emailForm.value.emailUser).toBe('smtp-user');
    expect(component.emailForm.value.emailPassword).toBe('');
    expect(component.emailForm.value.contactUsGeneralEmail).toBe('general@example.org');
    expect(component.emailForm.value.contactUsTechnicalEmail).toBe('technical@example.org');
    expect(component.emailForm.value.contactUsOnboardingEmail).toBe('onboarding@example.org');
    expect(component.emailForm.value.contactUsLegalEmail).toBe('legal@example.org');
    expect(component.showSuccess).toBeTrue();
    expect(component.successMessage).toBe('ADMIN._emailConfigUpdated');
  });

  it('should show an error and keep form values when update fails', () => {
    component.emailForm.setValue({
      smtpServer: 'smtp.example.org',
      smtpPort: '587',
      email: 'source@example.org',
      emailUser: 'smtp-user',
      emailPassword: 'secret',
      contactUsGeneralEmail: 'general@example.org',
      contactUsTechnicalEmail: 'technical@example.org',
      contactUsOnboardingEmail: 'onboarding@example.org',
      contactUsLegalEmail: 'legal@example.org'
    });

    component.addConfig();

    const req = httpMock.expectOne(configUrl);
    req.flush({ error: 'Invalid config' }, { status: 400, statusText: 'Bad Request' });

    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: Invalid config');
    expect(component.showSuccess).toBeFalse();
    expect(component.emailForm.value.emailPassword).toBe('secret');
    expect(component.emailForm.value.contactUsGeneralEmail).toBe('general@example.org');
  });

  it('should validate contact-us destination email format', () => {
    component.emailForm.controls.contactUsTechnicalEmail.setValue('not-an-email');
    component.emailForm.controls.contactUsTechnicalEmail.updateValueAndValidity();

    expect(component.emailForm.controls.contactUsTechnicalEmail.invalid).toBeTrue();
    expect(component.emailForm.controls.contactUsTechnicalEmail.hasError('email')).toBeTrue();
  });
  it('should allow an existing or environment password to remain unchanged', () => {
    expect(component.hasPassword).toBeTrue();
    expect(component.emailForm.controls.emailPassword.value).toBe('');
    expect(component.emailForm.valid).toBeTrue();
    component.emailForm.controls.smtpServer.setValue('new-smtp.example.org');
    component.addConfig();

    const req = httpMock.expectOne(configUrl);
    expect(req.request.body.smtpServer).toBe('new-smtp.example.org');
    expect(req.request.body.emailPassword).toBeUndefined();
    req.flush({});
    expect(component.emailForm.valid).toBeTrue();
  });

  it('should require a password for the first configuration and allow optional destinations', () => {
    component.fillData({ ...configResponse, hasPassword: false, contactUsDestinations: {} });
    expect(component.emailForm.controls.contactUsGeneralEmail.valid).toBeTrue();
    expect(component.emailForm.invalid).toBeTrue();
    component.addConfig();
    httpMock.expectNone(configUrl);
    expect(component.emailForm.controls.emailPassword.touched).toBeTrue();

    component.emailForm.controls.emailPassword.setValue('new-secret');
    component.addConfig();
    const req = httpMock.expectOne(configUrl);
    expect(req.request.body.emailPassword).toBe('new-secret');
    req.flush({});
    expect(component.hasPassword).toBeTrue();
    expect(component.emailForm.controls.emailPassword.value).toBe('');
    expect(component.emailForm.valid).toBeTrue();
  });

  it('should explicitly clear an optional destination', () => {
    component.emailForm.controls.contactUsGeneralEmail.setValue('');
    component.addConfig();
    const req = httpMock.expectOne(configUrl);
    expect(req.request.body.contactUsDestinations.general).toBe('');
    expect(req.request.body.contactUsDestinations.technical).toBe('technical@example.org');
    req.flush({});
  });

  it('should prevent invalid settings from being submitted', () => {
    component.emailForm.controls.email.setValue('invalid');
    component.addConfig();
    httpMock.expectNone(configUrl);
    expect(component.showError).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="adminAddCredential"]').disabled).toBeTrue();
  });

  it('should show an empty form without an error for a first-visit 404', () => {
    component.getConfig();
    httpMock.expectOne(configUrl).flush({}, { status: 404, statusText: 'Not Found' });
    expect(component.showError).toBeFalse();
    expect(component.configLoaded).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.hasPassword).toBeFalse();
    expect(component.emailForm.controls.smtpServer.value).toBe('');
    expect(component.emailForm.controls.emailPassword.hasError('required')).toBeTrue();
  });

  it('should display environment defaults returned by the API', () => {
    component.getConfig();
    httpMock.expectOne(configUrl).flush({ ...configResponse, smtpServer: 'env-smtp.example.org', contactUsDestinations: {} });
    expect(component.emailForm.controls.smtpServer.value).toBe('env-smtp.example.org');
    expect(component.hasPassword).toBeTrue();
    expect(component.emailForm.valid).toBeTrue();
  });

  it('should report other load failures and prevent overwriting an unloaded config', () => {
    component.getConfig();
    component.addConfig();
    component.testConfig();
    httpMock.expectOne(configUrl).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(component.showError).toBeTrue();
    expect(component.configLoaded).toBeFalse();
    expect(component.loading).toBeFalse();
    component.addConfig();
    component.testConfig();
    httpMock.expectNone(configUrl);
    httpMock.expectNone(`${configUrl}/test`);
  });

  it('should test saved settings with no body even when unsaved form values are invalid', () => {
    component.emailForm.controls.email.setValue('invalid-unsaved-value');
    component.testConfig();
    expect(component.testing).toBeTrue();
    component.testConfig();
    component.addConfig();
    const req = httpMock.expectOne(`${configUrl}/test`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    httpMock.expectNone(configUrl);
    req.flush({});
    expect(component.testing).toBeFalse();
    expect(component.successMessage).toBe('ADMIN._emailTestSuccess');
    expect(component.emailForm.controls.email.value).toBe('invalid-unsaved-value');
  });

  [
    [400, 'ADMIN._emailTestInvalid'],
    [502, 'ADMIN._emailTestConnectionError'],
    [504, 'ADMIN._emailTestTimeout'],
    [403, 'ADMIN._emailTestError']
  ].forEach(([status, message]) => {
    it(`should explain a ${status} test failure and allow retrying`, () => {
      component.testConfig();
      httpMock.expectOne(`${configUrl}/test`).flush({}, { status: Number(status), statusText: 'Test failure' });
      expect(component.testing).toBeFalse();
      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toBe(String(message));
    });
  });

  it('should prevent duplicate saves and testing while saving', () => {
    component.addConfig();
    expect(component.saving).toBeTrue();
    component.addConfig();
    component.testConfig();
    const req = httpMock.expectOne(configUrl);
    httpMock.expectNone(`${configUrl}/test`);
    req.flush({});
    expect(component.saving).toBeFalse();
  });

});
