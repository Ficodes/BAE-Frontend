import {Component, EventEmitter, HostListener, Input, OnInit, Output, ChangeDetectorRef} from '@angular/core';
import {FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MarkdownTextareaComponent} from "../../../markdown-textarea/markdown-textarea.component";
import {TranslateModule} from "@ngx-translate/core";
import {NgClass} from "@angular/common";
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { certifications } from 'src/app/models/certification-standards.const';

@Component({
  selector: 'app-price-component-drawer',
  standalone: true,
  templateUrl: './price-component-drawer.component.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MarkdownTextareaComponent,
    TranslateModule,
    NgClass
  ],
  styleUrl: './price-component-drawer.component.css'
})
export class PriceComponentDrawerComponent implements OnInit {
  @Input() component: any | null = null;
  @Input() prodChars: any[] | [] = [];
  @Input() profileData: boolean = false;
  @Output() close = new EventEmitter<any | null>();
  @Output() save = new EventEmitter<any>();

  isOpen = false;
  initialized = false;

  priceComponentForm!: FormGroup;
  showValueSelect:boolean=false;
  selectedCharacteristic:any=undefined;
  touchedCharCheck:boolean=false;
  selectedCharacteristicVal:any;
  showDiscount:boolean=false;
  filteredChars:any[]=[];
  showPopover = false;

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef,) {}

  ngOnInit() {
    this.initialized = false;
    setTimeout(() => {
      this.isOpen = true;
      this.initialized = true;
    }, 50);

    for(let i=0;i<this.prodChars.length;i++){
      if (!certifications.some(certification => certification.name === this.prodChars[i].name)) {
        this.filteredChars.push(this.prodChars[i]);
      }
    }

    this.priceComponentForm = this.fb.group({
      name: ['', Validators.required],
      price:['', [Validators.required, Validators.min(0.01), Validators.max(1000000000)]],
      description: [''],
      priceType: ['one time', Validators.required],
      discountValue: [null, [Validators.min(0), Validators.max(100)]],
      discountUnit: ['percentage'],
      discountDuration: [null, [Validators.min(1)]],
      discountDurationUnit: ['days'],
      recurringPeriod: ['month'],
      usageUnit: [''],
      selectedCharacteristic:[undefined]
    });

    if (this.component) {
      this.priceComponentForm.patchValue(this.component);
      this.cdr.detectChanges();
      console.log('---- Editing the following price component...')
      console.log(this.priceComponentForm.value)
      
      const selectedCharControl = this.priceComponentForm.get('selectedCharacteristic');
      const selectedCharValue = selectedCharControl?.value;
      
      if (Array.isArray(selectedCharValue) && selectedCharValue.length > 0) {
        const pscv = selectedCharValue[0]?.productSpecCharacteristicValue;
      
        if (Array.isArray(pscv) && pscv.length > 0) {
          if ('valueFrom' in pscv[0]) {
            this.showValueSelect = false;
          } else {
            this.showValueSelect = true;
          }
        } else {
          this.showValueSelect = true;
        }
      }
      
      if(this.priceComponentForm.get('discountValue')?.value != null){
        this.showDiscount=true;
      }
      const selectedChar = this.priceComponentForm.get('selectedCharacteristic')?.value?.[0];

      if (selectedChar) {
        console.log(selectedChar)
        this.selectedCharacteristic = selectedChar;
        console.log('selected char')
        console.log(this.selectedCharacteristic)
      }
    }
  }

  submitForm() {
    if (this.priceComponentForm.valid) {
      this.save.emit(this.priceComponentForm.value);
      this.closeDrawer();
    }
  }

  changePriceComponentChar(event: any){
    if(event.target.value == ''){
      this.showValueSelect = false;
      return
    }

    let charValue = this.prodChars.find(
      (char: { id: any; }) => char.id === event.target.value
    );

    this.selectedCharacteristic = charValue;
    this.cdr.detectChanges();

    if('valueFrom' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
      // This is a range characteristic, so no value to select
      this.showValueSelect = false;
    } else if('unitOfMeasure' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
      // This is a number characteristic
      this.selectedCharacteristicVal = this.selectedCharacteristic.productSpecCharacteristicValue[0].value;
      this.showValueSelect = true;
    } else {
      // This is a string characteristic
      this.selectedCharacteristicVal = this.selectedCharacteristic.productSpecCharacteristicValue[0].value;
      this.showValueSelect = true;
    }

    this.priceComponentForm.patchValue({
      selectedCharacteristic: this.mapChars(this.selectedCharacteristicVal)
    });
  }

  private mapChars(charValue: any): any {
    console.log(this.selectedCharacteristic)
    const char: any = {
      id: this.selectedCharacteristic.id,
      name: this.selectedCharacteristic.name,
      description: this.selectedCharacteristic.description || '',
    }

    // Add the productSpecCharacteristicValue only if needed
    // Range chars not include a value
    if (this.showValueSelect) {
      char.productSpecCharacteristicValue = [this.selectedCharacteristic.productSpecCharacteristicValue.find((opt: any) => {
        return String(opt.value) === String(charValue);
      })];
    }

    return char
  }

  changePriceComponentCharValue(event: any){
    this.selectedCharacteristicVal = event.target.value;
    this.priceComponentForm.patchValue({
      selectedCharacteristic: this.mapChars(event.target.value)
    });
  }

  closeDrawer() {
    this.isOpen = false;
    // If editing, do nothing; if creating, clear form
    setTimeout(() => this.close.emit(null), 500);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    event.stopPropagation();  // Prevent closing parent drawer
    this.closeDrawer();
  }

  hasKey(obj: any, key: string): boolean {
    return key in obj;
  }
}
