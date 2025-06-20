import { Component, Input, OnInit, forwardRef, ChangeDetectorRef, OnDestroy, Output, EventEmitter } from '@angular/core';
import {
  ControlValueAccessor, FormArray,
  FormBuilder,
  FormGroup,
  NG_VALUE_ACCESSOR,
  Validators,
  FormControl
} from '@angular/forms';
import {PricePlansTableComponent} from "./price-plans-table/price-plans-table.component";
import {TranslateModule} from "@ngx-translate/core";
import {PricePlanDrawerComponent} from "./price-plan-drawer/price-plan-drawer.component";
import { v4 as uuidv4 } from 'uuid';
import {pricePlanValidator, uniqueNameValidatorFactory} from "../../../../validators/validators";
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass } from "@angular/common";
import { EventMessageService } from "src/app/services/event-message.service";
import { FormChangeState, PricePlanChangeState } from "src/app/models/interfaces";
import { Subscription, debounceTime, distinctUntilChanged, filter } from "rxjs";

interface PriceComponent {
  id: string;
  name: string;
  price: number;
  currency: string;
  recurringPeriod?: string;
  usageUnit?: string;
}

interface PricePlan {
  id: string;
  name: string;
  description: string;
  isBundle: boolean;
  lastUpdate: string | null;
  lifecycleStatus: string;
  paymentOnline: boolean;
  priceType: string;
  currency: string;
  unitOfMeasure: string | null;
  validFor: any | null;
  priceComponents: PriceComponent[];
}

interface PriceComponentChange {
  id: string;
  name: string;
  price: number;
  currency: string;
  recurringPeriod?: string;
  usageUnit?: string;
  modifiedFields: string[];
  oldValue?: PriceComponent;
  newValue?: PriceComponent;
}

interface PricePlanChange {
  id: string;
  isNew: boolean;
  modifiedFields: string[];
  oldValue?: PricePlan;
  newValue?: PricePlan;
  priceComponents: {
    added: PriceComponentChange[];
    modified: PriceComponentChange[];
    deleted: string[];
  };
}

@Component({
  selector: 'app-price-plans-form',
  standalone: true,
  templateUrl: './price-plans.component.html',
  styleUrl: './price-plans.component.css',
  imports: [
    PricePlansTableComponent,
    TranslateModule,
    PricePlanDrawerComponent,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PricePlansComponent),
      multi: true
    }
  ]
})
export class PricePlansComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() form!: FormGroup;  // Recibe el formulario del padre
  @Input() prodSpec: any | null = null;  // Y con este se acceder a prodSpec
  @Output() formChange = new EventEmitter<FormChangeState>();

  pricePlansForm = this.fb.array<FormGroup>([], { validators: [] });
  paymentOnline = false;  // Estado global del checkbox
  paymentOnlineControl = new FormControl({ value: false, disabled: false });

  pricePlans: any[] = [];
  existingPlanNames: string[] = [];
  selectedPricePlan: any | null = null;
  showDrawer = false;
  pricePlanForm!: FormGroup;  // This will be passed to the drawer
  action = 'create'; // What are we doing?
  originalValue: any;
  formSubscription: Subscription | null = null;

  private originalPricePlans: PricePlan[] = [];
  private originalPriceComponents: { [key: string]: any[] } = {};
  private lastKnownState: PricePlan[] = [];

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef, private eventMessage: EventMessageService) {}

  ngOnInit() {
    console.log('🔄 Initializing PricePlansComponent');
    this.pricePlanForm = this.createPricePlanForm();

    // ✅ Get existing price plans from parent form
    const existingPlans = this.form.get('pricePlans')?.value || [];
    console.log('📋 Existing plans:', existingPlans);
    
    this.pricePlansForm = this.fb.array<FormGroup>(
      existingPlans.map((plan: PricePlan) => this.createPricePlanForm(plan))
    );

    // ✅ Sync the displayed list with the form array
    this.pricePlans = this.pricePlansForm.value;
    console.log('💰 Initial price plans:', this.pricePlans);
    
    // Set initial payment online state based on existing plans
    if (this.pricePlans.length > 0) {
      this.paymentOnline = this.pricePlans[0].paymentOnline;
      this.paymentOnlineControl.setValue(this.paymentOnline);
      this.paymentOnlineControl.disable();
    }

    // Guardar el estado original
    this.originalPricePlans = this.pricePlans.map((plan: PricePlan) => ({
      id: plan['id'],
      name: plan['name'],
      description: plan['description'],
      isBundle: plan['isBundle'],
      lastUpdate: plan['lastUpdate'],
      lifecycleStatus: plan['lifecycleStatus'],
      paymentOnline: plan['paymentOnline'],
      priceType: plan['priceType'],
      currency: plan['currency'],
      unitOfMeasure: plan['unitOfMeasure'],
      validFor: plan['validFor'],
      priceComponents: plan['priceComponents']?.map((comp: PriceComponent) => ({
        id: comp['id'],
        name: comp['name'],
        price: comp['price'],
        currency: comp['currency'],
        recurringPeriod: comp['recurringPeriod'],
        usageUnit: comp['usageUnit']
      })) || []
    }));

    // Guardar el estado inicial como último estado conocido
    this.lastKnownState = this.pricePlans.map((plan: PricePlan) => ({
      id: plan['id'],
      name: plan['name'],
      description: plan['description'],
      isBundle: plan['isBundle'],
      lastUpdate: plan['lastUpdate'],
      lifecycleStatus: plan['lifecycleStatus'],
      paymentOnline: plan['paymentOnline'],
      priceType: plan['priceType'],
      currency: plan['currency'],
      unitOfMeasure: plan['unitOfMeasure'],
      validFor: plan['validFor'],
      priceComponents: plan['priceComponents']?.map((comp: PriceComponent) => ({
        id: comp['id'],
        name: comp['name'],
        price: comp['price'],
        currency: comp['currency'],
        recurringPeriod: comp['recurringPeriod'],
        usageUnit: comp['usageUnit']
      })) || []
    }));

    this.existingPlanNames = this.pricePlans
    .map(p => p.name)
    .filter(name => !!name);

    console.log('📝 Original state:', this.originalPricePlans);
    console.log('🔍 Last known state:', this.lastKnownState);

    // Subscribe to form array changes
    this.formSubscription = this.pricePlansForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(() => this.pricePlansForm.dirty)
      )
      .subscribe((newValue) => {
        console.log('📊 Form array value changed:', newValue);
        this.checkChanges();
      });

    // Subscribe to individual price plan changes
    this.pricePlansForm.controls.forEach((control, index) => {
      control.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe((newValue) => {
          console.log(`📈 Price plan ${index} changed:`, newValue);
          this.checkChanges();
        });
    });
  }

  ngOnDestroy() {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  private checkChanges() {
    console.log('🔍 Checking for changes...');
    const currentValue = this.pricePlansForm.getRawValue() as PricePlan[];
    console.log('📊 Current form value:', currentValue);

    const changes = this.getDetailedChanges(currentValue);
    console.log('📝 Detailed changes:', changes);

    const changeState: PricePlanChangeState = {
      subformType: 'pricePlans',
      isDirty: this.pricePlansForm.dirty,
      dirtyFields: Object.keys(this.pricePlansForm.controls)
        .filter(key => this.pricePlansForm.get(key)?.dirty),
      originalValue: this.originalValue,
      currentValue,
      priceComponentsChanged: changes.some(change =>
        change.priceComponents.added.length > 0 || 
        change.priceComponents.modified.length > 0 || 
        change.priceComponents.deleted.length > 0
      ),
      profileChanged: this.checkProfileChanges(),
      modifiedPricePlans: changes
    };

    console.log('🚀 Emitting price plans change state:', changeState);
    this.formChange.emit(changeState);

    // Actualizar el último estado conocido
    this.lastKnownState = currentValue.map(plan => {
      const mappedPlan: PricePlan = {
        id: plan['id'],
        name: plan['name'],
        description: plan['description'],
        isBundle: plan['isBundle'],
        lastUpdate: plan['lastUpdate'],
        lifecycleStatus: plan['lifecycleStatus'],
        paymentOnline: plan['paymentOnline'],
        priceType: plan['priceType'],
        currency: plan['currency'],
        unitOfMeasure: plan['unitOfMeasure'],
        validFor: plan['validFor'],
        priceComponents: plan['priceComponents']?.map((comp: PriceComponent) => ({
          id: comp['id'],
          name: comp['name'],
          price: comp['price'],
          currency: comp['currency'],
          recurringPeriod: comp['recurringPeriod'],
          usageUnit: comp['usageUnit']
        })) || []
      };
      return mappedPlan;
    });
  }

  private getDetailedChanges(currentValue: PricePlan[]): PricePlanChange[] {
    const changes: PricePlanChange[] = [];

    currentValue.forEach((plan: PricePlan) => {
      const originalPlan = this.originalPricePlans['find'](p => p['id'] === plan['id']);
      const lastKnownPlan = this.lastKnownState['find']((p: PricePlan) => p['id'] === plan['id']);
      
      // Detectar cambios en el plan
      const modifiedFields = this.getModifiedFields(originalPlan, plan);
      const planChanges = this.getModifiedFields(lastKnownPlan, plan);
      
      // Detectar cambios en los componentes
      const originalComponents = originalPlan?.priceComponents || [];
      const lastKnownComponents = lastKnownPlan?.priceComponents || [];
      const currentComponents = plan.priceComponents || [];

      const priceComponents = this.getDetailedComponentChanges(
        originalComponents,
        lastKnownComponents,
        currentComponents
      );

      if (modifiedFields.length > 0 || 
          planChanges.length > 0 ||
          priceComponents.added.length > 0 || 
          priceComponents.modified.length > 0 || 
          priceComponents.deleted.length > 0) {
        changes.push({
          id: plan['id'],
          isNew: !originalPlan,
          modifiedFields,
          oldValue: lastKnownPlan,
          newValue: plan,
          priceComponents
        });
      }
    });

    return changes;
  }

  private getDetailedComponentChanges(
    originalComponents: PriceComponent[],
    lastKnownComponents: PriceComponent[],
    currentComponents: PriceComponent[]
  ): {
    added: PriceComponentChange[];
    modified: PriceComponentChange[];
    deleted: string[];
  } {
    const added = currentComponents
      .filter(comp => !originalComponents['find'](o => o['id'] === comp['id']))
      .map(comp => ({
        id: comp['id'],
        name: comp['name'],
        price: comp['price'],
        currency: comp['currency'],
        recurringPeriod: comp['recurringPeriod'],
        usageUnit: comp['usageUnit'],
        modifiedFields: Object.keys(comp),
        newValue: comp
      }));

    const deleted = originalComponents
      .filter(comp => !currentComponents['find'](c => c['id'] === comp['id']))
      .map(comp => comp['id']);

    const modified = currentComponents
      .filter(comp => {
        const originalComp = originalComponents['find'](o => o['id'] === comp['id']);
        const lastKnownComp = lastKnownComponents['find'](l => l['id'] === comp['id']);
        return originalComp && (
          this.getModifiedFields(originalComp, comp).length > 0 ||
          this.getModifiedFields(lastKnownComp, comp).length > 0
        );
      })
      .map(comp => {
        const originalComp = originalComponents['find'](o => o['id'] === comp['id']);
        const lastKnownComp = lastKnownComponents['find'](l => l['id'] === comp['id']);
        return {
          id: comp['id'],
          name: comp['name'],
          price: comp['price'],
          currency: comp['currency'],
          recurringPeriod: comp['recurringPeriod'],
          usageUnit: comp['usageUnit'],
          modifiedFields: this.getModifiedFields(lastKnownComp, comp),
          oldValue: lastKnownComp,
          newValue: comp
        };
      });

    return { added, modified, deleted };
  }

  private getModifiedFields(original: PricePlan | PriceComponent | undefined, current: PricePlan | PriceComponent): string[] {
    if (!original) return Object.keys(current);
    
    return Object.keys(current).filter(key => {
      // Ignorar campos que no queremos comparar
      if (key === 'priceComponents' || key === 'productProfile' || key === 'controls' || key === '_parent') {
        return false;
      }

      const originalValue = (original as any)[key];
      const currentValue = (current as any)[key];

      // Si alguno de los valores es un FormGroup o FormArray, comparar sus valores
      if (originalValue instanceof FormGroup || currentValue instanceof FormGroup ||
          originalValue instanceof FormArray || currentValue instanceof FormArray) {
        return JSON.stringify(originalValue?.value) !== JSON.stringify(currentValue?.value);
      }

      // Para otros tipos de valores, comparar directamente
      return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
    });
  }

  private checkProfileChanges(): boolean {
    const pricePlans = this.pricePlansForm.get('pricePlans')?.value || [];
    return pricePlans.some((plan: any) => 
      plan.productProfile?.dirty || plan.productProfile?.touched
    );
  }

  onPaymentOnlineChange(event: any) {
    // Solo permitir cambios si no hay price plans
    if (this.pricePlans.length === 0) {
      this.paymentOnline = event.target.checked;
      this.paymentOnlineControl.setValue(this.paymentOnline);
      this.cdr.detectChanges();
    }
  }

  private createPricePlanForm(plan: any = null): FormGroup {
    return this.fb.group(
      {
        id: [plan?.id || this.generateId()],
        href: [plan?.href || null],
        name: [
          plan?.name || '',
          { validators: [Validators.required] }
        ],
        description: [
          plan?.description || '',
          { validators: [Validators.required] }
        ],
        isBundle: [plan?.isBundle || false],
        lastUpdate: [plan?.lastUpdate || null],
        lifecycleStatus: [plan?.lifecycleStatus || 'Active'],
        paymentOnline: [plan?.paymentOnline ?? this.paymentOnline],  // Use global state
        priceType: [plan?.priceType || 'custom'],
        prodSpecCharValueUse: [plan?.prodSpecCharValueUse || null],
        currency: [plan?.price?.unit || 'EUR'],
        unitOfMeasure: [plan?.unitOfMeasure || null],
        productProfile: plan?.productProfile ? plan.productProfile : this.mapProductProfile(plan?.prodSpecCharValueUse || []),
        priceComponents: [plan?.priceComponents || []],
        validFor: [plan?.validFor || null],
      },
      { validators: [pricePlanValidator, uniqueNameValidatorFactory(() => this.existingPlanNames)] } // Custom validator
    );
  }

  private mapProductProfile(prodSpecCharValueUse: any[]): FormGroup {
    return this.fb.group({
      selectedValues: this.fb.array(
        prodSpecCharValueUse.map(spec =>
          this.fb.group({
            id: [spec.id],
            name: [spec.name],
            selectedValue: [
              spec.productSpecCharacteristicValue.find((v: { isDefault: boolean }) => v.isDefault)?.value || null,
              Validators.required
            ]
          })
        )
      )
    });
  }

  addPricePlan(plan?: any) {
    console.log('add plan')
    // Determinar el valor correcto de paymentOnline
    const paymentOnlineValue = plan?.paymentOnline ?? this.paymentOnline;

    const pricePlanGroup = this.createPricePlanForm({
      ...plan,
      paymentOnline: paymentOnlineValue
    });
    this.pricePlansForm.push(pricePlanGroup);
    this.existingPlanNames = this.pricePlans
    //.filter((p: PricePlan) => p.id !== this.selectedPricePlan.value.id) // exclude the one being edited
    .map(p => p.name)
    .filter(name => !!name);
    this.form.updateValueAndValidity();
    this.syncPricePlans();
  }

  removePricePlan(index: number) {
    if (index !== -1) {
      this.pricePlansForm.removeAt(index);
      console.log(this.pricePlansForm)
      this.syncPricePlans();
      this.checkChanges();
      
      // Si se eliminaron todos los price plans, permitir cambiar el estado de payment online
      if (this.pricePlans.length === 0) {
        this.paymentOnline = false;
        this.paymentOnlineControl.setValue(false);
        this.paymentOnlineControl.enable();
        this.cdr.detectChanges();
      }
    }
  }

  savePricePlan(plan: any) {
    const index = this.pricePlansForm.controls.findIndex(p => p.getRawValue().id === this.selectedPricePlan?.getRawValue().id);

    // Determinar el valor correcto de paymentOnline
    const paymentOnlineValue = this.action === 'edit' 
      ? this.selectedPricePlan?.getRawValue().paymentOnline // Mantener el valor original para edición
      : this.paymentOnline; // Usar el valor global para nuevos planes

    // Asegurarse de que el plan mantenga el valor de paymentOnline correcto
    const updatedPlan = {
      ...plan,
      paymentOnline: paymentOnlineValue
    };

    if (index > -1) {
      this.pricePlansForm.at(index).patchValue(updatedPlan);
    } else {
      this.addPricePlan(updatedPlan);
    }

    this.syncPricePlans();
    this.showDrawer = false;
    this.selectedPricePlan = null;
  }

  private generateId(): string {
    return `temp-id:${uuidv4()}`; // Generates a random ID
  }

  openPricePlanDrawer(plan: any = null) {
    if (plan) {
      console.log('📝 Editing existing price plan:', plan);

      // Buscar el FormGroup en pricePlansForm en base al ID del plan
      const index = this.pricePlansForm.controls.findIndex(p => p.value.id === plan.id);
      console.log(index)
      if (index !== -1) {
        this.selectedPricePlan = this.pricePlansForm.at(index) as FormGroup;
      } else {
        // Si no lo encuentra, creamos un nuevo FormGroup con los datos del plan
        this.selectedPricePlan = this.createPricePlanForm(plan);
        this.existingPlanNames = this.pricePlans
        .filter((p: PricePlan) => p.id !== this.selectedPricePlan.value.id) // exclude the one being edited
        .map(p => p.name)
        .filter(name => !!name);
        this.form.updateValueAndValidity();
      }

      this.action = 'edit';
    } else {
      console.log('➕ Creating a new price plan');
      this.action = 'create';
      // Crear el nuevo price plan con el valor actual de paymentOnline
      this.selectedPricePlan = this.createPricePlanForm({
        paymentOnline: this.paymentOnline
      });
      this.existingPlanNames = this.pricePlans
      .map(p => p.name)
      .filter(name => !!name);
      this.form.updateValueAndValidity();
      this.pricePlansForm.push(this.selectedPricePlan);
    }

    this.showDrawer = true;
  }

  closeDrawer() {
    this.showDrawer = false;
    if(this.action == 'create'){
      this.removePricePlan(this.pricePlansForm.length - 1);
    }
  }

  editPricePlan(plan: any) {
    console.log('Editing Price Plan:', plan);

    if (plan) {
      this.action = 'edit';
      // Mantener el valor de paymentOnline del plan original
      this.selectedPricePlan = this.createPricePlanForm({
        ...plan,
        paymentOnline: plan.paymentOnline // Asegurarse de mantener el valor original
      });

      this.existingPlanNames = this.pricePlans
      .filter((p: PricePlan) => p.id !== this.selectedPricePlan.value.id) // exclude the one being edited
      .map(p => p.name)
      .filter(name => !!name);
      this.form.updateValueAndValidity();
    } else {
      this.action = 'create';
      this.selectedPricePlan = this.createPricePlanForm({
        paymentOnline: this.paymentOnline // Usar el valor global para nuevos planes
      });
      this.existingPlanNames = this.pricePlans
      .map(p => p.name)
      .filter(name => !!name);
      this.form.updateValueAndValidity();
    }

    console.log('📝 Form after patching:', this.selectedPricePlan.value);
    this.cdr.detectChanges();
    this.showDrawer = true;
  }

  private syncPricePlans() {
    // Usar getRawValue() para incluir campos deshabilitados
    this.pricePlans = this.pricePlansForm.controls.map(control => control.getRawValue());
    this.form.get('pricePlans')?.setValue(this.pricePlans);
    this.onChange(this.pricePlans);
    if (this.pricePlans.length === 0) {
      this.paymentOnlineControl.enable();
    } else {
      this.paymentOnlineControl.disable();
    }
    this.cdr.detectChanges();
  }

  // Métodos del ControlValueAccessor para conectar con `formControlName`
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.pricePlansForm.clear();
    value?.forEach((plan: any) => this.addPricePlan(plan));
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
