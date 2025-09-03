import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  Input
} from '@angular/core';
import {FormGroup, FormControl, Validators, ReactiveFormsModule} from '@angular/forms';
import {AccountServiceService} from 'src/app/services/account-service.service';
import {LocalStorageService} from "../../services/local-storage.service";
import {Router} from '@angular/router';
import {components} from "../../models/product-catalog";

type ProductOffering = components["schemas"]["ProductOffering"];
import {phoneNumbers, countries} from '../../models/country.const'
import {initFlowbite} from 'flowbite';
import * as moment from 'moment';
import {LoginInfo, billingAccountCart} from 'src/app/models/interfaces';
import {EventMessageService} from "../../services/event-message.service";
import {getCountries, getCountryCallingCode, CountryCode} from 'libphonenumber-js'
import {parsePhoneNumber} from 'libphonenumber-js/max'
import {TranslateModule} from "@ngx-translate/core";
import { getLocaleId } from '@angular/common';


@Component({
  selector: 'app-billing-account-form',
  templateUrl: './billing-account-form.component.html',
  styleUrl: './billing-account-form.component.css'
})
export class BillingAccountFormComponent implements OnInit {

  @Input() billAcc: billingAccountCart | undefined;
  @Input() preferred: boolean | undefined;

  billingForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    email: new FormControl('', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'), Validators.maxLength(320)]),
    country: new FormControl('AT', [Validators.required, Validators.maxLength(250)]),
    city: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    stateOrProvince: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    postCode: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    street: new FormControl('', [Validators.required, Validators.maxLength(1000)]),
    telephoneNumber: new FormControl('', [Validators.required, Validators.min(0)]),
    telephoneType: new FormControl('Mobile')
  });
  prefixes: any[] = phoneNumbers;
  countries: any[] = countries;
  phonePrefix: any = phoneNumbers[0];
  prefixCheck: boolean = false;
  toastVisibility: boolean = false;

  partyId: any;
  partyInfo:any = {
    id: '',
    name: '',
    href: ''
  }
  loading: boolean = false;
  is_create: boolean = false;

  errorMessage:any='';
  showError:boolean=false;

  selectedCountry: string = ''; // Stores the selected country code

  euCountries = [
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },
    { code: 'EE', name: 'Estonia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'GR', name: 'Greece' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MT', name: 'Malta' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'RO', name: 'Romania' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'ES', name: 'Spain' },
    { code: 'SE', name: 'Sweden' }
  ];

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private accountService: AccountServiceService,
    private eventMessage: EventMessageService
  ) {
    getLocaleId;
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initUserData();
      }
    })
  }


  ngOnInit() {
    if (this.billAcc != undefined) {
      this.is_create = false;
    } else {
      this.is_create = true;
    }
    this.initUserData();
    if (this.is_create == false) {
      this.setDefaultValues();
    } else {
      this.detectCountry();
    }

  }

  initUserData(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        console.log('init party info')
        console.log(aux)
        this.partyInfo = {
          id: this.partyId,
          name: aux.user,
          href : this.partyId,
          role: "Owner"
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        console.log('loggedOrg info')
        console.log(loggedOrg)
        this.partyInfo = {
          id: this.partyId,
          name: loggedOrg.name,
          href : this.partyId,
          role: "Owner"
        }
      }
    }
  }

  setDefaultValues() {
    if (this.billAcc != undefined) {
      const phoneNumber = parsePhoneNumber(this.billAcc.telephoneNumber)
      if (phoneNumber) {
        let pref = this.prefixes.filter(item => item.code === '+' + phoneNumber.countryCallingCode);
        if (pref.length > 0) {
          this.phonePrefix = pref[0];
        }
        this.billingForm.controls['telephoneNumber'].setValue(phoneNumber.nationalNumber);
      }
      //Get old bilAcc values
      this.billingForm.controls['name'].setValue(this.billAcc.name);
      this.billingForm.controls['email'].setValue(this.billAcc.email);
      this.billingForm.controls['country'].setValue(this.billAcc.postalAddress.country);
      this.billingForm.controls['city'].setValue(this.billAcc.postalAddress.city);
      this.billingForm.controls['stateOrProvince'].setValue(this.billAcc.postalAddress.stateOrProvince);
      this.billingForm.controls['street'].setValue(this.billAcc.postalAddress.street);
      this.billingForm.controls['postCode'].setValue(this.billAcc.postalAddress.postCode);
      this.billingForm.controls['telephoneType'].setValue(this.billAcc.telephoneType);
    }
    this.cdr.detectChanges()
  }

  resetBillingForm(): void {
    this.billingForm.reset({
      telephoneType: 'Mobile'
    });
    
  
    Object.values(this.billingForm.controls).forEach(control => {
      control.setErrors(null); // clear errors
      control.markAsPristine();
      control.markAsUntouched();
      control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
  }

  createBilling() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;

    try{
        const phoneNumber = parsePhoneNumber(this.phonePrefix.code + this.billingForm.value.telephoneNumber);
        if (phoneNumber) {
        if (!phoneNumber.isValid()) {
            console.log('NUMERO INVALIDO')
            this.billingForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
            this.toastVisibility = true;
            setTimeout(() => {
            this.toastVisibility = false
            }, 2000);
            return;
        } else {
            this.billingForm.controls['telephoneNumber'].setErrors(null);
            this.toastVisibility = false;
        }
        }
    }
    catch (error){
        this.billingForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
        this.toastVisibility = true;
        setTimeout(() => {
        this.toastVisibility = false
        }, 2000);
        return;
    }

    if (this.billingForm.invalid) {
      this.toastVisibility = true;
      setTimeout(() => {
        this.toastVisibility = false
      }, 2000);
      return;
    } else {
      this.loading = true;
      let billacc = {
        name: this.billingForm.value.name,
        contact: [{
          contactMedium: [
            {
              mediumType: 'Email',
              preferred: this.preferred,
              characteristic: {
                contactType: 'Email',
                emailAddress: this.billingForm.value.email
              }
            },
            {
              mediumType: 'PostalAddress',
              preferred: this.preferred,
              characteristic: {
                contactType: 'PostalAddress',
                city: this.billingForm.value.city,
                country: this.billingForm.value.country,
                postCode: this.billingForm.value.postCode,
                stateOrProvince: this.billingForm.value.stateOrProvince,
                street1: this.billingForm.value.street
              }
            },
            {
              mediumType: 'TelephoneNumber',
              preferred: this.preferred,
              characteristic: {
                contactType: this.billingForm.value.telephoneType,
                phoneNumber: this.phonePrefix.code + this.billingForm.value.telephoneNumber
              }
            }
          ]
        }],
        relatedParty: [this.partyInfo],
        state: "Defined"
      }
      this.accountService.postBillingAccount(billacc).subscribe({
        next: data => {
          this.eventMessage.emitBillAccChange(true);
          this.resetBillingForm();
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          console.error('There was an error while creating!', error);
          if(error.error.error){
            console.log(error)
            this.errorMessage='Error: '+error.error.error;
          } else {
            this.errorMessage='There was an error while creating billing account!';
          }
          this.showError=true;
          setTimeout(() => {
            this.showError = false;
          }, 3000);
        }
      });
    }
  }

  updateBilling() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    try{
        const phoneNumber = parsePhoneNumber(this.phonePrefix.code + this.billingForm.value.telephoneNumber);
        if (phoneNumber) {
          if (!phoneNumber.isValid()) {
            console.log('NUMERO INVALIDO')
            this.billingForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
            this.toastVisibility = true;
            setTimeout(() => {
              this.toastVisibility = false
            }, 2000);
            return;
          } else {
            this.billingForm.controls['telephoneNumber'].setErrors(null);
            this.toastVisibility = false;
          }
        }
    }catch (error){
        this.billingForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
        this.toastVisibility = true;
        setTimeout(() => {
            this.toastVisibility = false
        }, 2000);
        return;
    }
    if (this.billingForm.invalid) {
      if (this.billingForm.get('email')?.invalid == true) {
        this.billingForm.controls['email'].setErrors({'invalidEmail': true});
      } else {
        this.billingForm.controls['email'].setErrors(null);
      }

      this.toastVisibility = true;
      setTimeout(() => {
        this.toastVisibility = false
      }, 2000);
      return;
    } else {
      if (this.billAcc != undefined) {
        let bill_body = {
          name: this.billingForm.value.name,
          contact: [{
            contactMedium: [
              {
                mediumType: 'Email',
                preferred: this.billAcc.selected,
                characteristic: {
                  contactType: 'Email',
                  emailAddress: this.billingForm.value.email
                }
              },
              {
                mediumType: 'PostalAddress',
                preferred: this.billAcc.selected,
                characteristic: {
                  contactType: 'PostalAddress',
                  city: this.billingForm.value.city,
                  country: this.billingForm.value.country,
                  postCode: this.billingForm.value.postCode,
                  stateOrProvince: this.billingForm.value.stateOrProvince,
                  street1: this.billingForm.value.street
                }
              },
              {
                mediumType: 'TelephoneNumber',
                preferred: this.billAcc.selected,
                characteristic: {
                  contactType: this.billingForm.value.telephoneType,
                  phoneNumber: this.phonePrefix.code + this.billingForm.value.telephoneNumber
                }
              }
            ]
          }],
          relatedParty: [this.partyInfo],
          state: "Defined"
        }
        this.accountService.updateBillingAccount(this.billAcc.id, bill_body).subscribe({
          next: data => {
            this.eventMessage.emitBillAccChange(false);
            this.resetBillingForm();
          },
          error: error => {
            console.error('There was an error while updating!', error);
            if(error.error.error){
              console.log(error)
              this.errorMessage='Error: '+error.error.error;
            } else {
              this.errorMessage='There was an error while updating billing account!';
            }
            this.showError=true;
            setTimeout(() => {
              this.showError = false;
            }, 3000);
          }
        });
      }
    }
  }

  selectPrefix(pref:any) {
    console.log(pref)
    this.prefixCheck = false;
    this.phonePrefix = pref;
  }

  detectCountry() {
    const userLanguage = navigator.language;
    // Extract the country code from the language setting
    // Assuming the language setting is in the format 'en-US'
    const countryCode = userLanguage.split('-')[1];
    // Set detectedCountry based on the countryCode
    let detectedCountry = countryCode.toUpperCase() as CountryCode;  
    let code = getCountryCallingCode(detectedCountry);
    if (code) {
      let pref = this.prefixes.filter(item => item.code === '+' + code);
      if (pref.length > 0) {
        this.phonePrefix = pref[0];
      }
    }
  }
}
