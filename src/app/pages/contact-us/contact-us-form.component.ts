import {Component, HostListener, OnInit, ChangeDetectorRef, OnDestroy} from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import {faHandsHoldingHeart} from "@fortawesome/pro-solid-svg-icons";
import { environment } from 'src/environments/environment';
import {ThemeService} from "../../services/theme.service";
import {ThemeConfig} from "../../themes";
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-contact-us-form',
  templateUrl: './contact-us-form.component.html',
  styleUrl: './contact-us-form.component.css'
})

export class ContactUsFormComponent implements OnInit, OnDestroy {
  contactForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'), Validators.maxLength(320)]),
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    lastname: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    organization: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    role: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    message: new FormControl('', [Validators.required]),
  });

  constructor(
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService
  ) { }

  protected readonly faHandsHoldingHeart = faHandsHoldingHeart;

  dataControllerDome:any='https://dome-project.eu/about/#partners';
  DPA:any='https://dome-marketplace-sbx.org/assets/documents/privacy.pdf';
  showThanksMessage:boolean=false;
  currentTheme: ThemeConfig | null = null;
  private themeSubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.themeSubscription = this.themeService.currentTheme$
    .pipe(takeUntil(this.destroy$))
    .subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  sendMail() {
    let message = 'First name: '+this.contactForm.value.name+ '%0A' +
    'Last name: '+this.contactForm.value.lastname+ '%0A' +
    'Email: '+this.contactForm.value.email+ '%0A' +
    'Organization: '+this.contactForm.value.organization+ '%0A' +
    'Role: '+this.contactForm.value.role+ '%0A'+
    this.contactForm.value.message;

    const mailtoLink = `mailto:info@dome-marketplace.eu?body=${message}`;
    
    this.showThanksMessage=true;
    // Open the mailto link
    window.location.href = mailtoLink;
    this.resetContactForm();
  }

  hide(){
    this.showThanksMessage=false;
  }
  resetContactForm(): void {
    this.contactForm.reset();
  
    Object.values(this.contactForm.controls).forEach(control => {
      control.setErrors(null); // clear errors
      control.markAsPristine();
      control.markAsUntouched();
      control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
  }
  
}
