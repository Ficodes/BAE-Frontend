import {Component, EventEmitter, Input, Output, OnInit, HostListener, SimpleChanges, OnChanges} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MarkdownTextareaComponent} from "../../../markdown-textarea/markdown-textarea.component";
import {TranslateModule} from "@ngx-translate/core";
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {PriceComponentsTableComponent} from "../price-components-table/price-components-table.component";
import {PriceComponentDrawerComponent} from "../price-component-drawer/price-component-drawer.component";
import {currencies} from "currencies.json";
import {
  ConfigurationProfileDrawerComponent
} from "../configuration-profile-drawer/configuration-profile-drawer.component";


@Component({
  selector: 'app-price-plan-drawer',
  standalone: true,
  templateUrl: './price-plan-drawer.component.html',
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    NgClass,
    MarkdownTextareaComponent,
    NgIf,
    PriceComponentDrawerComponent,
    PriceComponentsTableComponent,
    ConfigurationProfileDrawerComponent,
    NgForOf
  ],
  styleUrl: './price-plan-drawer.component.css'
})
export class PricePlanDrawerComponent implements OnInit {
  @Input() formGroup!: FormGroup;  // Receive the parent form
  @Input() prodSpec: any | null = null;  // Access to prodSpec

  @Input() action: string = 'create';
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  isOpen = false;
  initialized = false;
  showPriceComponentDrawer = false;
  showConfigurationDrawer = false;
  editingComponent: any = null;
  //protected readonly currencies = currencies;
  //Only allowing EUR for the moment
  protected readonly  currencies=[currencies[2]];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initialized = false;
    console.log('--- PROD PROF ----')
    console.log(this.formGroup?.get('productProfile')?.value)
    console.log(' --- --- ')
    setTimeout(() => {
      this.isOpen = true;
      this.initialized = true;
    }, 50);

    if (!this.formGroup) {
      console.error('❌ Error: `formGroup` is not a FormGroup!', this.formGroup);
      return;
    }

    // 🔹 Ensure dynamic updates work
    this.formGroup.get('paymentOnline')?.valueChanges.subscribe(value => {
      if (!value) {
        this.formGroup.get('priceType')?.setValue('custom');
      } else {
        this.formGroup.get('priceType')?.setValue('');
      }
    });

    // 🔹 Mark the form as touched when changes occur
    this.formGroup.valueChanges.subscribe(() => {
      this.formGroup.markAsTouched();
    });

    // Deshabilitar el control paymentOnline al inicio
    const paymentOnlineControl = this.formGroup.get('paymentOnline');
    if (paymentOnlineControl) {
      paymentOnlineControl.disable();
    }
  }

  savePricePlan() {
    if (this.formGroup.invalid) return;
    this.save.emit(this.formGroup.getRawValue());
    this.closeDrawer();
  }

  openPriceComponentDrawer(component: any = null) {
    this.editingComponent = component;
    this.showPriceComponentDrawer = true;
  }

  closePriceComponentDrawer(updatedComponent: any | null) {
    if (updatedComponent) {
      const components = this.formGroup.get('priceComponents')?.value || [];
      if (this.editingComponent) {
        // Editar componente existente
        const index = components.findIndex((c: { id: string }) => c.id === this.editingComponent.id);
        if (index > -1) {
          if (!this.editingComponent.id?.startsWith('temp-id')) {
            updatedComponent.id = this.editingComponent.id
          }          
          components[index] = updatedComponent;
        }
      } else {
        // Agregar nuevo componente
        components.push(updatedComponent);
      }
      this.formGroup.get('priceComponents')?.setValue(components);
      console.log(this.formGroup.get('priceComponents')?.value)
    }
    this.showPriceComponentDrawer = false;
    this.editingComponent = null;
  }

  editPriceComponent(component: any) {
    this.openPriceComponentDrawer(component);
  }

  deletePriceComponent(componentId: string) {
    const components = this.formGroup.get('priceComponents')?.value || [];
    this.formGroup.get('priceComponents')?.setValue(
      components.filter((c: { id: string }) => c.id !== componentId)
    );
  }

  checkPriceCompChars(): boolean {
    const priceComponents = this.formGroup.get('priceComponents')?.value ?? [];

    const hasSelectedCharacteristic = priceComponents.some(
      (item: any) => item.selectedCharacteristic != null
    );
    return hasSelectedCharacteristic;
  }

  get pricePlanTranslationKey(): string {
    return this.action === 'create' ? 'FORMS.PRICE_PLANS._new_price_plan' : 'FORMS.PRICE_PLANS._edit_price_plan';
  }

  closeDrawer() {
    this.isOpen = false;
    // If editing, do nothing; if creating, clear form
    setTimeout(() => this.close.emit(), 500);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (this.showConfigurationDrawer) {
      this.showConfigurationDrawer = false;
    } else if(!this.showPriceComponentDrawer)
      this.closeDrawer();
  }

  openConfigurationProfileDrawer() {
    this.showConfigurationDrawer = true;
  }

  updateConfigurationProfile(updatedProfile: any) {
    this.formGroup.get('prodSpecCharValueUse')?.setValue(updatedProfile);
    this.showConfigurationDrawer = false;
  }

  get configurationProfileButtonText(): string {
    return this.formGroup?.get('prodSpecCharValueUse')?.value?.length > 0
      ? 'FORMS.PRICE_PLANS._edit_profile'
      : 'FORMS.PRICE_PLANS._add_profile';
  }

  // Profile table with pagination
  currentPage = 0;
  pageSize = 5;

  get paginatedProfileData() {
    const data = this.formGroup?.get('prodSpecCharValueUse')?.value || [];
    const startIndex = this.currentPage * this.pageSize;
    return data.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages() {
    const data = this.formGroup?.get('prodSpecCharValueUse')?.value || [];
    return Math.ceil(data.length / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  getProcessedProfileData() {
    if(this.formGroup?.get('prodSpecCharValueUse')?.value){
      return this.formGroup?.get('prodSpecCharValueUse')?.value?.map((char: any) => ({
        ...char,
        selectedValue: char.productSpecCharacteristicValue?.find((v: any) => v.isDefault) || null
      })) || [];
    } else {
      return this.formGroup?.get('productProfile')?.value?.selectedValues
    }

  }

  updateIsDefault(profileData: any[], selectedValues: any[]) {
    return profileData.map((char) => {
      // Find the selected value for the current characteristic
      const selectedChar = selectedValues.find((sel) => sel.id === char.id);
  
      if (selectedChar) {
        return {
          ...char,
          productSpecCharacteristicValue: char.productSpecCharacteristicValue.map((opt: any) => ({
            ...opt,
            isDefault: opt.value === selectedChar.selectedValue, // Set isDefault to true if it matches
          })),
        };
      }
      return char;
    });
  }
  

  getProfileData() {
    let profileData = this.formGroup?.get('prodSpecCharValueUse')?.value;

    if (!profileData || profileData.length === 0) {
      // If no profile, chars come from prodSpec
      if(this.formGroup?.get('productProfile')?.value?.selectedValues.length >0){
        profileData = this.updateIsDefault(this.prodSpec?.productSpecCharacteristic,this.formGroup?.get('productProfile')?.value?.selectedValues)
      } else {
        profileData = this.prodSpec?.productSpecCharacteristic || [];
      }      
    }

    return profileData;
  }

  checkProfileData() {
    let profileData = this.formGroup?.get('prodSpecCharValueUse')?.value;

    if(!profileData && this.formGroup?.get('productProfile')?.value){
      profileData=this.formGroup?.get('productProfile')?.value.selectedValues
    }

    if (!profileData || profileData.length === 0) {
      return true;
    } else {
      return false;
    }
  }



}
