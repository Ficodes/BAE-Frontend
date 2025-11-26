import {TranslateModule} from "@ngx-translate/core";
import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";
import { PickerComponent } from "@ctrl/ngx-emoji-mart";
import {SharedModule} from "../../../shared.module";
import { MarkdownComponent } from "ngx-markdown";
import {
  ControlValueAccessor, FormArray,
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
  NG_VALUE_ACCESSOR,
  Validators
} from '@angular/forms';

@Component({
  selector: 'app-offer-summary',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf,
    MarkdownComponent,
    NgClass,
    PickerComponent,
    SharedModule],
  templateUrl: './offer-summary.component.html',
  styleUrl: './offer-summary.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OfferSummaryComponent),
      multi: true
    }
  ]
})
export class OfferSummaryComponent implements OnInit {

  @Input() productOfferForm!: FormGroup;

  async ngOnInit() {
    console.log('--- INFO SUMMARY')
    console.log(this.productOfferForm)
    console.log(this.productOfferForm.get('generalInfo')?.get('status')?.value)
    console.log(this.productOfferForm.get('catalogue')?.value)
    console.log(this.productOfferForm.get('category')?.value)
  }

  get isLicenseEmpty(): boolean {
    const licenseValue = this.productOfferForm.get('license')?.value;
  
    // Check if the value is null, undefined, or an empty object
    return !licenseValue || (typeof licenseValue === 'object' && Object.keys(licenseValue).length === 0);
  }
  
  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
