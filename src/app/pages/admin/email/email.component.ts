import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { finalize } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import {
  CONTACT_US_SUPPORT_TYPES,
  ContactUsDestinations,
  ContactUsSupportType
} from 'src/app/models/contact-us.constants';
import { EventMessageService } from 'src/app/services/event-message.service';
import { environment } from 'src/environments/environment';

interface EmailConfig {
  smtpServer?: string;
  smtpPort?: string;
  email?: string;
  emailUser?: string;
  hasPassword?: boolean;
  contactUsDestinations?: Partial<ContactUsDestinations>;
}

type ContactUsDestinationControlName =
  | 'contactUsGeneralEmail'
  | 'contactUsTechnicalEmail'
  | 'contactUsOnboardingEmail'
  | 'contactUsLegalEmail';

@Component({
  selector: 'email',
  templateUrl: './email.component.html',
  styleUrl: './email.component.css'
})
export class EmailComponent {

  hasPassword = false;
  loading = true;
  configLoaded = false;
  saving = false;
  testing = false;

  private readonly configUrl = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;

  showError: boolean = false;
  errorMessage: string = '';
  showSuccess: boolean = false;
  successMessage: string = '';

  private readonly contactUsDestinationControlNames: Record<ContactUsSupportType, ContactUsDestinationControlName> = {
    general: 'contactUsGeneralEmail',
    technical: 'contactUsTechnicalEmail',
    onboarding: 'contactUsOnboardingEmail',
    legal: 'contactUsLegalEmail'
  };

  private readonly contactUsDestinationLabels: Record<ContactUsSupportType, string> = {
    general: 'ADMIN._contactUsGeneralEmail',
    technical: 'ADMIN._contactUsTechnicalEmail',
    onboarding: 'ADMIN._contactUsOnboardingEmail',
    legal: 'ADMIN._contactUsLegalEmail'
  };

  readonly contactUsDestinationFields = CONTACT_US_SUPPORT_TYPES.map((supportType) => ({
    supportType,
    controlName: this.contactUsDestinationControlNames[supportType],
    labelKey: this.contactUsDestinationLabels[supportType]
  }));

  emailForm = new FormGroup({
    smtpServer: new FormControl('', [Validators.required]),
    smtpPort: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    emailUser: new FormControl('', [Validators.required]),
    emailPassword: new FormControl('', [Validators.required]),
    contactUsGeneralEmail: new FormControl('', [Validators.email]),
    contactUsTechnicalEmail: new FormControl('', [Validators.email]),
    contactUsOnboardingEmail: new FormControl('', [Validators.email]),
    contactUsLegalEmail: new FormControl('', [Validators.email])
  });

  constructor(
    private eventMessage: EventMessageService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.getConfig();
  }

  goBack() {
    this.eventMessage.emitAdminCategories(true);
  }

  showSuccessMessage(message: string) {
    this.showError = false;
    this.showSuccess = true;
    this.successMessage = message;
    setTimeout(() => {
      this.showSuccess = false;
    }, 3000);
  }

  showErrorMessage(message: string) {
    this.showSuccess = false;
    this.showError = true;
    this.errorMessage = message;
    setTimeout(() => {
      this.showError = false;
    }, 3000);
  }

  getErrorMessage(error: any, defaultMessage: string): string {
    return error?.error?.error ? 'Error: ' + error.error.error : defaultMessage;
  }

  private setHasPassword(hasPassword: boolean) {
    this.hasPassword = hasPassword;
    const password = this.emailForm.controls.emailPassword;
    password.setValidators(hasPassword ? [] : [Validators.required]);
    password.updateValueAndValidity();
  }

  fillData(data: EmailConfig) {
    this.setHasPassword(data.hasPassword === true);
    const contactUsDestinations = data.contactUsDestinations ?? {};

    this.emailForm.setValue({
      smtpServer: data.smtpServer ?? '',
      smtpPort: data.smtpPort ?? '',
      email: data.email ?? '',
      emailUser: data.emailUser ?? '',
      emailPassword: '',
      contactUsGeneralEmail: contactUsDestinations.general ?? '',
      contactUsTechnicalEmail: contactUsDestinations.technical ?? '',
      contactUsOnboardingEmail: contactUsDestinations.onboarding ?? '',
      contactUsLegalEmail: contactUsDestinations.legal ?? ''
    });
  }

  getConfig() {
    this.loading = true;
    this.configLoaded = false;
    return this.http.get<EmailConfig>(this.configUrl).pipe(
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: data => {
        this.fillData(data);
        this.configLoaded = true;
      },
      error: error => {
        // Older deployments may still return 404 before the first configuration.
        if (error.status === 404) {
          this.fillData({});
          this.configLoaded = true;
          return;
        }
        this.showErrorMessage(this.getErrorMessage(error, 'ADMIN._emailConfigLoadError'));
      }
    });
  }

  addConfig() {
    if (this.loading || !this.configLoaded || this.saving || this.testing) return;
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      this.showErrorMessage('ADMIN._emailConfigInvalid');
      return;
    }

    const values = this.emailForm.getRawValue();
    const body = {
      smtpServer: values.smtpServer,
      smtpPort: values.smtpPort,
      email: values.email,
      emailUser: values.emailUser,
      ...(values.emailPassword ? { emailPassword: values.emailPassword } : {}),
      contactUsDestinations: {
        general: values.contactUsGeneralEmail,
        technical: values.contactUsTechnicalEmail,
        onboarding: values.contactUsOnboardingEmail,
        legal: values.contactUsLegalEmail
      }
    };

    this.saving = true;
    return this.http.post(this.configUrl, body).pipe(
      finalize(() => { this.saving = false; })
    ).subscribe({
      next: () => {
        this.setHasPassword(this.hasPassword || !!values.emailPassword);
        this.emailForm.patchValue({ emailPassword: '' });
        this.emailForm.markAsPristine();
        this.showSuccessMessage('ADMIN._emailConfigUpdated');
      },
      error: error => {
        this.showErrorMessage(this.getErrorMessage(error, 'ADMIN._emailConfigSaveError'));
      }
    });
  }

  testConfig() {
    if (this.loading || !this.configLoaded || this.saving || this.testing) return;

    this.testing = true;
    // The backend tests the saved settings, including environment defaults.
    return this.http.post(`${this.configUrl}/test`, null).pipe(
      finalize(() => { this.testing = false; })
    ).subscribe({
      next: () => this.showSuccessMessage('ADMIN._emailTestSuccess'),
      error: error => {
        const messages: Record<number, string> = {
          400: 'ADMIN._emailTestInvalid',
          502: 'ADMIN._emailTestConnectionError',
          504: 'ADMIN._emailTestTimeout'
        };
        this.showErrorMessage(messages[error.status] ?? 'ADMIN._emailTestError');
      }
    });
  }
}
