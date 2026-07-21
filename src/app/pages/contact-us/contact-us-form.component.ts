import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from "@angular/forms";
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faThumbsUp } from '@fortawesome/pro-regular-svg-icons';
import { TranslateModule } from "@ngx-translate/core";
import { Subject, takeUntil } from 'rxjs';
import { ContactUsService } from '../../services/contactUs.service';

export interface IContactUs {
  supportType: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  roleInOrganization: string;
  message: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

export type IContactUsForm = {
  [K in keyof IContactUs]: FormControl<IContactUs[K]>;
};

@Component({
  selector: "app-contact-us",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FontAwesomeModule
  ],
  templateUrl: "./contact-us-form.component.html",
  styleUrl: "./contact-us-form.component.css"
})
export class ContactUsFormComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly contactUsService = inject(ContactUsService)

  faThumbsUp = faThumbsUp;

  unsub = new Subject<void>();

  submitted = false;
  submittedSuccessfully = false;

  readonly supportOptions: string[] = ["general", "technical", "onboarding", "legal"];

  form: FormGroup<IContactUsForm> = this.fb.nonNullable.group({
    supportType: ["", [Validators.required]],
    firstName: ["", [Validators.required]],
    lastName: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    organization: ["", [Validators.required]],
    roleInOrganization: ["", [Validators.required]],
    message: ["", [Validators.required]],
    privacyAccepted: [false, [Validators.requiredTrue]],
    marketingAccepted: [false]
  });

  get f() {
    return this.form.controls;
  }

  hasError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }


    const rawValue = this.form.getRawValue();

    this.contactUsService.sendEmail(rawValue).pipe(takeUntil(this.unsub)).subscribe({
      next: () => {
        this.submittedSuccessfully = true;
      },
    });
  }

  onContinueBrowsing(): void {
    this.submittedSuccessfully = false;
    this.submitted = false;
    this.form.reset({
      supportType: "",
      firstName: "",
      lastName: "",
      email: "",
      organization: "",
      roleInOrganization: "",
      message: "",
      privacyAccepted: false,
      marketingAccepted: false
    });

    this.router.navigate(['/dashboard'])
  }

  ngOnDestroy(): void {
    this.unsub.next();
    this.unsub.complete();
  }
}
