import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
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
  emailPassword?: string;
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
    contactUsGeneralEmail: new FormControl('', [Validators.required, Validators.email]),
    contactUsTechnicalEmail: new FormControl('', [Validators.required, Validators.email]),
    contactUsOnboardingEmail: new FormControl('', [Validators.required, Validators.email]),
    contactUsLegalEmail: new FormControl('', [Validators.required, Validators.email])
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

  fillData(data: EmailConfig) {
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
    const url = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
    return this.http.get<any>(url).subscribe({
      next: data => {
        this.fillData(data);
      },
      error: error => {
        console.error('There was an error while getting config!', error);
        this.showErrorMessage(this.getErrorMessage(error, 'There was an error while getting the config'));
      }
    })
  }

  addConfig() {
    const url = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
    const body = {
      "smtpServer": this.emailForm.value.smtpServer,
      "smtpPort": this.emailForm.value.smtpPort,
      "email": this.emailForm.value.email,
      "emailUser": this.emailForm.value.emailUser,
      "emailPassword": this.emailForm.value.emailPassword,
      "contactUsDestinations": {
        "general": this.emailForm.value.contactUsGeneralEmail,
        "technical": this.emailForm.value.contactUsTechnicalEmail,
        "onboarding": this.emailForm.value.contactUsOnboardingEmail,
        "legal": this.emailForm.value.contactUsLegalEmail
      }
    }

    return this.http.post<any>(url, body).subscribe({
      next: () => {
        this.emailForm.patchValue({ emailPassword: '' });
        this.showSuccessMessage('ADMIN._emailConfigUpdated');
      },
      error: error => {
        console.error('There was an error while updating!', error);
        this.showErrorMessage(this.getErrorMessage(error, 'There was an error while updating the config'));
      }
    })
  }
}
