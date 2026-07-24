import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
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
});
