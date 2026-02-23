import {Component, EventEmitter, Input, Output, OnInit, HostListener, SimpleChanges, OnChanges, OnDestroy} from '@angular/core';
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
import {TierPricingDrawerComponent} from "../tier-pricing-drawer/tier-pricing-drawer.component";
import {Subject} from "rxjs";
import { takeUntil } from 'rxjs/operators';


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
    TierPricingDrawerComponent,
    NgForOf
  ],
  styleUrl: './price-plan-drawer.component.css'
})
export class PricePlanDrawerComponent implements OnInit, OnDestroy {
  @Input() formGroup!: FormGroup;  // Receive the parent form
  @Input() prodSpec: any | null = null;  // Access to prodSpec

  @Input() action: string = 'create';
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  isOpen = false;
  initialized = false;
  showPriceComponentDrawer = false;
  showConfigurationDrawer = false;
  showTierPricingDrawer = false;
  editingComponent: any = null;
  //protected readonly currencies = currencies;
  //Only allowing EUR for the moment
  protected readonly  currencies=[currencies[2]];
  private destroy$ = new Subject<void>();
  rangeValidationError: string | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initialized = false;
    console.log('--- PROD PROF ----')
    console.log(this.formGroup?.get('productProfile')?.value)
    console.log(' --- --- ')
    setTimeout(() => {
      this.isOpen = true;
      this.initialized = true;
      document.body.style.overflow = 'hidden';
    }, 50);

    if (!this.formGroup) {
      console.error('❌ Error: `formGroup` is not a FormGroup!', this.formGroup);
      return;
    }

    // 🔹 Ensure dynamic updates work
    this.formGroup.get('paymentOnline')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(value => {
      if (!value) {
        this.formGroup.get('priceType')?.setValue('custom');
      } else {
        this.formGroup.get('priceType')?.setValue('');
      }
    });

    // 🔹 Mark the form as touched when changes occur
    this.formGroup.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.formGroup.markAsTouched();
    });

    // Deshabilitar el control paymentOnline al inicio
    const paymentOnlineControl = this.formGroup.get('paymentOnline');
    if (paymentOnlineControl) {
      paymentOnlineControl.disable();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  savePricePlan() {
    if (this.formGroup.invalid) return;

    // Validate range characteristics coverage
    if (!this.validateRangeCharacteristicsCoverage()) {
      console.log('Range characteristics validation failed');
      return;
    }

    // Clear any previous validation errors
    this.rangeValidationError = null;

    this.save.emit(this.formGroup.getRawValue());
    this.closeDrawer();
  }

  private validateRangeCharacteristicsCoverage(): boolean {
    const antiCollision: any = {};
    const rangeCharMap: any = {}; // To store characteristic names by ID

    // Step 1: Initialize antiCollision with range characteristics from prodSpec
    const rangeCharacteristics = this.getRangeCharacteristics();

    for (const rangeChar of rangeCharacteristics) {
      const specValue = rangeChar.productSpecCharacteristicValue[0];
      antiCollision[rangeChar.id] = {
        totalRange: {
          from: Number(specValue.valueFrom),
          to: Number(specValue.valueTo)
        }
      };
      rangeCharMap[rangeChar.id] = rangeChar.name;
    }

    // Step 2: Add price components to the antiCollision map
    const priceComponents = this.formGroup.get('priceComponents')?.value || [];

    for (const pc of priceComponents) {
      const selectedChar = pc.selectedCharacteristic?.[0];
      if (!selectedChar) continue;

      // Check if this price component is for a range characteristic
      if (antiCollision[selectedChar.id]) {
        const charValue = selectedChar.productSpecCharacteristicValue?.[0];
        if (charValue && 'valueFrom' in charValue && 'valueTo' in charValue) {
          const from = Number(charValue.valueFrom);
          const to = Number(charValue.valueTo);

          // Initialize array if not exists
          if (!antiCollision[selectedChar.id][from]) {
            antiCollision[selectedChar.id][from] = [];
          }
          antiCollision[selectedChar.id][from].push(to);
        }
      }
    }

    // Step 3: Validate coverage for each range characteristic
    for (const [charId, rangeData] of Object.entries(antiCollision)) {
      const data = rangeData as any;
      const keys = Object.keys(data);

      // If only totalRange exists, no price components → valid
      if (keys.length === 1 && keys[0] === 'totalRange') {
        continue;
      }

      // If there are price components, check if they cover the full range
      const totalRange = data.totalRange;
      if (!this.hasCompletePathDFS(data, totalRange.from, totalRange.to)) {
        const charName = rangeCharMap[charId] || charId;
        this.rangeValidationError = `The range characteristic "${charName}" does not have complete coverage from ${totalRange.from} to ${totalRange.to}. Please ensure all ranges are continuous and cover the full specification range.`;
        console.log(`Range characteristic with ID "${charId}" does not have complete coverage`);
        console.log('   Range data:', data);
        return false;
      }
    }

    return true;
  }

  private getRangeCharacteristics(): any[] {
    if (!this.prodSpec?.productSpecCharacteristic) return [];

    return this.prodSpec.productSpecCharacteristic.filter((char: any) => {
      const firstValue = char.productSpecCharacteristicValue?.[0];
      return firstValue && 'valueFrom' in firstValue && 'valueTo' in firstValue;
    });
  }

  private hasCompletePathDFS(rangeData: any, start: number, end: number): boolean {
    const visited = new Set<number>();

    const dfs = (currentFrom: number): boolean => {
      // Get all possible valueTo from current valueFrom
      const possibleTos = rangeData[currentFrom];
      if (!possibleTos || possibleTos.length === 0) return false;

      // Try each possible valueTo
      for (const valueTo of possibleTos) {
        // If valueTo equals the end of totalRange, we found a complete path
        if (valueTo === end) return true;

        // The next range should start at valueTo + 1 (continuity)
        const nextFrom = valueTo + 1;

        // Avoid infinite loops
        if (visited.has(nextFrom)) continue;
        visited.add(nextFrom);

        // Check if there's a key for the next valueFrom
        if (rangeData[nextFrom]) {
          if (dfs(nextFrom)) return true;
        }
      }

      return false;
    };

    return dfs(start);
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
    document.body.style.overflow = '';
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

  openTierPricingDrawer() {
    this.showTierPricingDrawer = true;
  }

  closeTierPricingDrawer(priceComponents: any[] | null) {
    if (priceComponents && Array.isArray(priceComponents)) {
      // Add all tier pricing components to the price components array
      const components = this.formGroup.get('priceComponents')?.value || [];
      components.push(...priceComponents);
      this.formGroup.get('priceComponents')?.setValue(components);
      console.log('Tier pricing components added:', priceComponents);
    }
    this.showTierPricingDrawer = false;
  }

  hasRangeCharacteristics(): boolean {
    // Check if there are any range characteristics available
    if (!this.prodSpec?.productSpecCharacteristic) return false;

    return this.prodSpec.productSpecCharacteristic.some((char: any) => {
      const firstValue = char.productSpecCharacteristicValue?.[0];
      return firstValue && 'valueFrom' in firstValue && 'valueTo' in firstValue;
    });
  }

}
