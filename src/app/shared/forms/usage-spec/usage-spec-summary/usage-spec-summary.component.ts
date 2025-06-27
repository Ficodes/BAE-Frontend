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
  selector: 'usage-spec-summary',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf,
    MarkdownComponent,
    NgClass,
    PickerComponent,
    SharedModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UsageSpecSummaryComponent),
      multi: true
    }
  ],
  templateUrl: './usage-spec-summary.component.html',
  styleUrl: './usage-spec-summary.component.css'
})
export class UsageSpecSummaryComponent implements OnInit {
  @Input() usageSpecForm!: FormGroup;

  async ngOnInit() {
    console.log('--- INFO SUMMARY')
    console.log(this.usageSpecForm)
    console.log(this.usageSpecForm.get('generalInfo')?.get('name')?.value)
    console.log(this.usageSpecForm.get('metrics')?.value)
  }

}
