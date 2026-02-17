import {Component, EventEmitter, HostListener, Input, OnInit, Output, ChangeDetectorRef} from '@angular/core';
import {FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslateModule} from "@ngx-translate/core";
import {NgClass, NgForOf, NgIf} from "@angular/common";
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';

interface SubRange {
  id: string;
  valueFrom: number;
  valueTo: number;
  name: string;
  priceComponent: any | null; // Stores the configured price component for this subrange
  isEditing?: boolean; // Track if this subrange form is open
}

@Component({
  selector: 'app-tier-pricing-drawer',
  standalone: true,
  templateUrl: './tier-pricing-drawer.component.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgClass,
    NgIf,
    NgForOf
  ],
  styleUrl: './tier-pricing-drawer.component.css'
})
export class TierPricingDrawerComponent implements OnInit {
  @Input() prodChars: any[] | [] = [];
  @Output() close = new EventEmitter<void>();
  @Output() saveTierPricing = new EventEmitter<any[]>(); // Emits array of configured price components

  isOpen = false;
  initialized = false;

  // Range characteristics (filtered)
  rangeCharacteristics: any[] = [];
  selectedCharacteristic: any = null;

  // Slider and subranges
  rangeMin: number = 0;
  rangeMax: number = 100;
  sliderMarkers: number[] = []; // Points where the user cuts the range
  subRanges: SubRange[] = [];

  // Inline price form
  editingSubRangeIndex: number | null = null;
  priceForm!: FormGroup;
  showDiscount: boolean = false;

  // Usage specs for usage pricing
  usageSpecs: any[] = [];
  selectedUsageSpec: any = null;
  selectedMetric: any = null;
  showMetricSelect: boolean = false;
  partyId: any = '';

  // Validation errors
  validationErrors: string[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private usageService: UsageServiceService,
    private localStorage: LocalStorageService
  ) {}

  ngOnInit() {
    this.initialized = false;
    setTimeout(() => {
      this.isOpen = true;
      this.initialized = true;
      document.body.style.overflow = 'hidden';
    }, 50);

    // Filter only range characteristics (those with valueFrom/valueTo)
    this.rangeCharacteristics = this.prodChars.filter(char => {
      const firstValue = char.productSpecCharacteristicValue?.[0];
      return firstValue && 'valueFrom' in firstValue && 'valueTo' in firstValue;
    });

    // Initialize party info and get usage specs
    this.initPartyInfo();
    this.usageService.getAllUsageSpecs(this.partyId).then(data => {
      this.usageSpecs = data;
    });
  }

  initPartyInfo() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  onCharacteristicChange(event: any) {
    const charId = event.target.value;
    if (!charId) {
      this.selectedCharacteristic = null;
      this.resetSlider();
      return;
    }

    this.selectedCharacteristic = this.rangeCharacteristics.find(
      (char: { id: any; }) => char.id === charId
    );

    if (this.selectedCharacteristic) {
      const firstValue = this.selectedCharacteristic.productSpecCharacteristicValue[0];
      this.rangeMin = parseInt(firstValue.valueFrom, 10);
      this.rangeMax = parseInt(firstValue.valueTo, 10);
      this.resetSlider();
    }
  }

  resetSlider() {
    this.sliderMarkers = [];
    this.subRanges = [];
    this.validationErrors = [];
  }

  addMarker() {
    // Add a marker in the middle of the range if none exist, or between existing markers
    if (this.sliderMarkers.length === 0) {
      const middle = Math.floor((this.rangeMin + this.rangeMax) / 2);
      this.sliderMarkers.push(middle);
    } else {
      // Find the largest gap and add a marker there
      const sortedMarkers = [this.rangeMin, ...this.sliderMarkers.sort((a, b) => a - b), this.rangeMax];
      let maxGap = 0;
      let gapIndex = 0;

      for (let i = 0; i < sortedMarkers.length - 1; i++) {
        const gap = sortedMarkers[i + 1] - sortedMarkers[i];
        if (gap > maxGap) {
          maxGap = gap;
          gapIndex = i;
        }
      }

      const newMarker = Math.floor((sortedMarkers[gapIndex] + sortedMarkers[gapIndex + 1]) / 2);
      this.sliderMarkers.push(newMarker);
    }

    this.updateSubRanges();
  }

  removeMarker(index: number) {
    this.sliderMarkers.splice(index, 1);
    this.updateSubRanges();
  }

  onMarkerChange(index: number, event: any) {
    const value = parseInt(event.target.value, 10);
    this.sliderMarkers[index] = value;
    this.updateSubRanges();
  }

  updateSubRanges() {
    if (!this.selectedCharacteristic) return;

    // Sort markers
    const sortedMarkers = [this.rangeMin, ...this.sliderMarkers.sort((a, b) => a - b), this.rangeMax];

    // Create subranges, preserving existing priceComponents if they exist
    const newSubRanges: SubRange[] = [];
    for (let i = 0; i < sortedMarkers.length - 1; i++) {
      const valueFrom = sortedMarkers[i];
      const valueTo = sortedMarkers[i + 1];

      // Adjust for contiguous ranges (valueTo of one should be valueFrom - 1 of next)
      const adjustedValueTo = (i < sortedMarkers.length - 2) ? valueTo - 1 : valueTo;

      // Check if we already have a subrange with the same valueFrom/valueTo
      const existingSubRange = this.subRanges.find(
        sr => sr.valueFrom === valueFrom && sr.valueTo === adjustedValueTo
      );

      newSubRanges.push({
        id: `temp-tier-${i}`,
        valueFrom: valueFrom,
        valueTo: adjustedValueTo,
        name: `${this.selectedCharacteristic.name} ${valueFrom}-${adjustedValueTo}`,
        priceComponent: existingSubRange?.priceComponent || null
      });
    }

    this.subRanges = newSubRanges;
    this.validateSubRanges();
    this.cdr.detectChanges();
  }

  validateSubRanges() {
    this.validationErrors = [];

    if (this.subRanges.length < 2) {
      this.validationErrors.push('At least 2 subranges are required for tier pricing');
      return;
    }

    // Check if all subranges have a configured price component
    const unconfiguredSubRanges = this.subRanges.filter(sr => !sr.priceComponent);
    if (unconfiguredSubRanges.length > 0) {
      this.validationErrors.push(`${unconfiguredSubRanges.length} subrange(s) need price configuration`);
    }

    // Check if subranges are contiguous
    for (let i = 0; i < this.subRanges.length - 1; i++) {
      const current = this.subRanges[i];
      const next = this.subRanges[i + 1];

      if (current.valueTo + 1 !== next.valueFrom) {
        this.validationErrors.push(`Subranges must be contiguous: ${current.name} ends at ${current.valueTo}, next starts at ${next.valueFrom}`);
      }
    }

    // Check if subranges cover the entire range
    const firstSubRange = this.subRanges[0];
    const lastSubRange = this.subRanges[this.subRanges.length - 1];

    if (firstSubRange.valueFrom !== this.rangeMin) {
      this.validationErrors.push(`First subrange must start at ${this.rangeMin}`);
    }

    if (lastSubRange.valueTo !== this.rangeMax) {
      this.validationErrors.push(`Last subrange must end at ${this.rangeMax}`);
    }

    // Check for overlaps (should not happen with our logic, but just in case)
    for (let i = 0; i < this.subRanges.length - 1; i++) {
      const current = this.subRanges[i];
      const next = this.subRanges[i + 1];

      if (current.valueTo >= next.valueFrom) {
        this.validationErrors.push(`Subranges cannot overlap: ${current.name} and ${next.name}`);
      }
    }
  }

  openPriceForm(subRangeIndex: number) {
    // Close any other editing forms
    this.subRanges.forEach(sr => sr.isEditing = false);

    const subRange = this.subRanges[subRangeIndex];
    this.editingSubRangeIndex = subRangeIndex;
    subRange.isEditing = true;

    // Initialize or reset the form with existing values if editing
    const existingComponent = subRange.priceComponent;

    this.priceForm = this.fb.group({
      name: [existingComponent?.name || subRange.name, Validators.required],
      price: [existingComponent?.price || '', [Validators.required, Validators.min(0.01)]],
      description: [existingComponent?.description || ''],
      priceType: [existingComponent?.priceType || 'one time', Validators.required],
      recurringPeriod: [existingComponent?.recurringPeriod || 'month'],
      usageUnit: [existingComponent?.usageUnit || ''],
      usageSpecId: [existingComponent?.usageSpecId || ''],
      discountValue: [existingComponent?.discountValue || null, [Validators.min(0), Validators.max(100)]],
      discountUnit: [existingComponent?.discountUnit || 'percentage'],
      discountDuration: [existingComponent?.discountDuration || null, [Validators.min(1)]],
      discountDurationUnit: [existingComponent?.discountDurationUnit || 'days']
    });

    this.showDiscount = existingComponent?.discountValue != null;

    // If editing and has usage spec, pre-populate
    if (existingComponent?.usageSpecId) {
      this.selectedUsageSpec = this.usageSpecs.find((element: { id: any; }) => element.id == existingComponent.usageSpecId);
      this.selectedMetric = existingComponent.usageUnit;
      this.showMetricSelect = true;
    } else {
      this.selectedUsageSpec = null;
      this.selectedMetric = null;
      this.showMetricSelect = false;
    }

    this.cdr.detectChanges();
  }

  cancelPriceForm() {
    if (this.editingSubRangeIndex !== null) {
      this.subRanges[this.editingSubRangeIndex].isEditing = false;
      this.editingSubRangeIndex = null;
    }
    this.selectedUsageSpec = null;
    this.selectedMetric = null;
    this.showMetricSelect = false;
    this.cdr.detectChanges();
  }

  changePriceComponentUsageSpec(event: any) {
    if(event.target.value == '') {
      this.showMetricSelect = false;
      return;
    }
    this.selectedUsageSpec = this.usageSpecs.find((element: { id: any; }) => element.id == event.target.value);
    if(this.selectedUsageSpec.specCharacteristic.length > 0) {
      this.selectedMetric = this.selectedUsageSpec.specCharacteristic[0].name;
    } else {
      this.selectedMetric = '';
    }
    this.priceForm.patchValue({
      usageUnit: this.selectedMetric,
      usageSpecId: this.selectedUsageSpec.id
    });
    this.showMetricSelect = true;
  }

  changePriceComponentMetric(event: any) {
    this.selectedMetric = event.target.value;
    this.priceForm.patchValue({
      usageUnit: this.selectedMetric
    });
  }

  savePriceForm() {
    if (!this.priceForm.valid || this.editingSubRangeIndex === null) {
      return;
    }

    const subRange = this.subRanges[this.editingSubRangeIndex];
    const formValue = this.priceForm.value;

    // Create price component with correct structure including range characteristic
    const priceComponent: any = {
      id: subRange.priceComponent?.id || `temp-tier-${Date.now()}-${this.editingSubRangeIndex}`,
      name: formValue.name,
      price: formValue.price,
      description: formValue.description,
      priceType: formValue.priceType,
      recurringPeriod: formValue.recurringPeriod,
      discountValue: this.showDiscount ? formValue.discountValue : null,
      discountUnit: this.showDiscount ? formValue.discountUnit : null,
      discountDuration: this.showDiscount ? formValue.discountDuration : null,
      discountDurationUnit: this.showDiscount ? formValue.discountDurationUnit : null,
      selectedCharacteristic: [{
        id: this.selectedCharacteristic.id,
        name: this.selectedCharacteristic.name,
        description: this.selectedCharacteristic.description || '',
        productSpecCharacteristicValue: [{
          valueFrom: subRange.valueFrom,
          valueTo: subRange.valueTo,
          isDefault: true
        }]
      }]
    };

    // Add usage fields if priceType is usage
    if (formValue.priceType === 'usage') {
      priceComponent.usageUnit = formValue.usageUnit;
      priceComponent.usageSpecId = formValue.usageSpecId;
    }

    // Save the configured price component to the subrange
    this.subRanges[this.editingSubRangeIndex].priceComponent = priceComponent;
    this.subRanges[this.editingSubRangeIndex].isEditing = false;

    // Re-validate after configuration
    this.validateSubRanges();
    this.editingSubRangeIndex = null;
    this.selectedUsageSpec = null;
    this.selectedMetric = null;
    this.showMetricSelect = false;
    this.cdr.detectChanges();
  }

  confirmTierPricing() {
    this.validateSubRanges();

    if (this.validationErrors.length > 0) {
      return; // Don't proceed if there are validation errors
    }

    // Extract all configured price components
    const priceComponents = this.subRanges
      .filter(sr => sr.priceComponent !== null)
      .map(sr => sr.priceComponent);

    // Emit the array of price components to parent
    this.saveTierPricing.emit(priceComponents);

    this.closeDrawer();
  }

  closeDrawer() {
    this.isOpen = false;
    document.body.style.overflow = '';
    setTimeout(() => this.close.emit(), 500);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    event.stopPropagation();
    this.closeDrawer();
  }

  get canConfirm(): boolean {
    return this.validationErrors.length === 0 &&
           this.subRanges.length >= 2 &&
           this.subRanges.every(sr => sr.priceComponent !== null);
  }

  // TrackBy functions to prevent unnecessary DOM re-rendering
  trackByIndex(index: number): number {
    return index;
  }

  trackBySubRangeId(_index: number, subRange: SubRange): string {
    return subRange.id;
  }
}
