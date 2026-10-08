import {Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges} from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {TranslateModule} from "@ngx-translate/core";
import {NgClass, NgIf} from "@angular/common";
import {ApiServiceService} from "../../../services/product-service.service";
import { lastValueFrom } from 'rxjs';
import {components} from "src/app/models/product-catalog";
import {EventMessageService} from "src/app/services/event-message.service";
import {FormChangeState, PricePlanChangeState} from "../../../models/interfaces";
import {Subscription} from "rxjs";
import moment from 'moment';
import { certifications } from 'src/app/models/certification-standards.const';
import { UsageSpecGeneralInfoComponent } from './usage-spec-general-info/usage-spec-general-info.component'
import { UsageSpecMetricsComponent } from './usage-spec-metrics/usage-spec-metrics.component'
import { UsageSpecSummaryComponent } from './usage-spec-summary/usage-spec-summary.component'
import { AccountServiceService } from 'src/app/services/account-service.service'
import { UsageServiceService } from 'src/app/services/usage-service.service'
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import {Subject} from "rxjs";
import { takeUntil } from 'rxjs/operators';
import { uniqueNameValidatorFactory } from 'src/app/validators/validators';
import { LifecycleStatus } from 'src/app/models/provider-stats.model';

function atLeastOneMetricValidator(control: AbstractControl): ValidationErrors | null {
  return Array.isArray(control.value) && control.value.length > 0
    ? null
    : { metricsRequired: true };
}

@Component({
  selector: 'usage-spec-form',
  standalone: true,
  imports: [
    UsageSpecGeneralInfoComponent,
    UsageSpecMetricsComponent,
    UsageSpecSummaryComponent,
    TranslateModule,
    ReactiveFormsModule,
    NgClass
  ],
  templateUrl: './usage-spec.component.html',
  styleUrl: './usage-spec.component.css'
})
export class UsageSpecComponent implements OnInit, OnDestroy, OnChanges {

  @Input() formType: 'create' | 'update' = 'create';
  @Input() usageSpec: any = {};
  @Input() partyId: any;

  usageSpecForm: FormGroup;
  currentStep = 0;
  highestStep = 0;
  steps = [
    'General Info',
    'Metrics',
    'Summary'
  ];
  isFormValid = false;
  loadingData:boolean=false;

  errorMessage:any='';
  showError:boolean=false;

  private formChanges: { [key: string]: FormChangeState } = {};
  private formSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  private providerUsageSpecs: any[] = [];
  private existingUsageSpecNames: string[] = [];
  private loadedUsageSpecNamesPartyId: any = null;
  hasChanges: boolean = false;

  constructor(private api: ApiServiceService,
              private eventMessage: EventMessageService,
              private fb: FormBuilder,
              private accService: AccountServiceService,
              private usageSpecService: UsageServiceService) {

    this.usageSpecForm = this.fb.group({
      generalInfo: this.fb.group({}, { validators: [uniqueNameValidatorFactory(() => this.existingUsageSpecNames)] }),
      metrics: new FormControl([], [atLeastOneMetricValidator])
    });

    // Subscribe to form validation changes
    this.usageSpecForm.statusChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(status => {
      this.isFormValid = status === 'VALID';
    });

    // Subscribe to subform changes
    this.formSubscription = this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(message => {
      if (message.type === 'SubformChange') {
        const changeState = message.value as FormChangeState;
        console.log('Received subform change:', changeState);
        this.handleSubformChange(changeState);
      }
    });
  }

  handleSubformChange(change: FormChangeState) {
    console.log('📝 Subform change received:', change);
    this.formChanges[change.subformType] = change;
    this.hasChanges = Object.keys(this.formChanges).length > 0;
    console.log('📝 Has changes:', this.hasChanges);
    console.log(this.formChanges[change.subformType])
  }

  ngOnDestroy() {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partyId'] && this.partyId) {
      this.loadExistingUsageSpecNames();
    }

    if (changes['usageSpec'] && this.providerUsageSpecs.length > 0) {
      this.applyExistingUsageSpecNames();
    }
  }

  goToStep(index: number) {
    if (index > this.currentStep) {
      const currentStepValid = this.validateCurrentStep();
      if (!currentStepValid) {
        return;
      }
    }
    
    this.currentStep = index;
    if(this.currentStep>this.highestStep){
      this.highestStep=this.currentStep
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0: // General Info
        return this.usageSpecForm.get('generalInfo')?.valid || false;
      case 1: // Metrics
        return this.usageSpecForm.get('metrics')?.valid || false;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    const generalInfoValid = this.usageSpecForm.get('generalInfo')?.valid || false;
    const metricsValid = this.usageSpecForm.get('metrics')?.valid || false;

    if (index >= 2 && !metricsValid) {
      return false;
    }

    if(this.formType == 'create'){
      return (generalInfoValid &&  (index <= this.currentStep)) || (generalInfoValid &&  (index <= this.highestStep));
    } else {
      return generalInfoValid
    }
  }  

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }
  

  submitForm() {
    if (this.usageSpecForm.invalid) {
      this.usageSpecForm.markAllAsTouched();
      return;
    }

    if (this.formType === 'update') {
      console.log('🔄 Starting offer update process...');
      console.log('📝 Current form changes:', this.formChanges);
      
      // Aquí irá la lógica de actualización
      // Por ahora solo mostramos los cambios
      this.updateUsageSpec();
    } else {
      // Lógica de creación existente
      this.createUsageSpec();
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.partyId) {
      await this.loadExistingUsageSpecNames();
    }

    if (this.formType === 'update' && this.usageSpec) {
      this.loadingData=true;
      await this.loadUsageSpecData();
      this.loadingData=false;
    }
  }

  private async loadExistingUsageSpecNames(): Promise<void> {
    if (this.loadedUsageSpecNamesPartyId === this.partyId) {
      return;
    }

    this.loadedUsageSpecNamesPartyId = this.partyId;

    try {
      this.providerUsageSpecs = await this.usageSpecService.getAllUsageSpecs(this.partyId);
      this.applyExistingUsageSpecNames();
    } catch (error) {
      console.error('There was an error while loading usage specs for name validation!', error);
      this.loadedUsageSpecNamesPartyId = null;
      this.providerUsageSpecs = [];
      this.existingUsageSpecNames = [];
      this.usageSpecForm.get('generalInfo')?.updateValueAndValidity();
    }
  }

  private applyExistingUsageSpecNames(): void {
    const currentUsageSpecId = this.usageSpec?.id;
    this.existingUsageSpecNames = this.providerUsageSpecs
      .filter((usageSpec: any) => usageSpec?.id !== currentUsageSpecId)
      .map((usageSpec: any) => usageSpec?.name)
      .filter((name: any) => !!name);
    this.usageSpecForm.get('generalInfo')?.updateValueAndValidity();
  }

  loadUsageSpecData(){
    if(this.usageSpec){
      const metrics = this.usageSpec.specCharacteristic = this.usageSpec.specCharacteristic.map((item: any) => ({
        ...item,
        id: uuidv4()
      }));
      this.usageSpecForm.patchValue({
        generalInfo: {
          name: this.usageSpec.name,
          description: this.usageSpec.description
        },
        metrics: metrics
      });
    }
  }

  async createUsageSpec(){
    if (this.formType !== 'create') return;

    const formValue = this.usageSpecForm.value;
    const generalInfo = formValue.generalInfo;
    const metrics = formValue.metrics.map(({ id, ...rest }: any) => rest);

    const usageSpec: any = {
      name: generalInfo.name,
      description: generalInfo.description || '',
      lifecycleStatus: 'Active',
      specCharacteristic: metrics,
      relatedParty: [
        {
          id: this.partyId,
          href: this.partyId,
          role: environment.SELLER_ROLE
        }
      ],
    }
    console.log(usageSpec)

    this.usageSpecService.postUsageSpec(usageSpec).subscribe({
      next: data => {
        console.log('usageSpec created:')
        console.log(data)
        this.eventMessage.emitProviderStatsTransition({
          entity: 'usageSpecification',
          previousLifecycleStatus: null,
          nextLifecycleStatus: (usageSpec.lifecycleStatus || 'Active') as LifecycleStatus
        });
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating the usageSpec!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage='Error: '+error.error.error;
        } else {
          this.errorMessage='There was an error while creating the usageSpec!';
        }
        this.showError=true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    });

  }

  async updateUsageSpec(){
    console.log('🔄 Starting offer update process...');
    console.log('📝 Current form changes:', this.formChanges);

    // Preparar el payload base con los datos que no han cambiado
    const basePayload: any = {
      name: this.usageSpec.name,
      description: this.usageSpec.description,
      lifecycleStatus: this.usageSpec.lifecycleStatus || 'Active',
      specCharacteristic: this.usageSpec.specCharacteristic
    };

    // Procesar cada cambio emitido por los subformularios
    for (const [subformType, change] of Object.entries(this.formChanges)) {
      console.log(`📝 Processing changes for ${subformType}:`, change);

      switch (subformType) {
        case 'generalInfo':
          // Actualizar información general
          basePayload.name = change.currentValue.name;
          basePayload.description = change.currentValue.description;
          break;
        case 'metrics':
          // Actualizar metricas
          const metrics = change.currentValue.map((metric: any) => ({
            name: metric.name,
            description: metric.description,
            valueType: 'number'
          }));
          basePayload.specCharacteristic = metrics
          console.log('------ here')
          console.log(metrics)
          break;
      }
    }
    console.log('📝 Final update payload:', basePayload);

    try {
      // Llamar a la API para actualizar la oferta
      await lastValueFrom(this.usageSpecService.updateUsageSpec(basePayload, this.usageSpec.id));
      console.log('✅ Usage Spec updated successfully');
      this.goBack();
    } catch (error: any) {
      console.error('❌ Error updating Usage Spec:', error);
      this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while updating the Usage Spec!';
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
    }
  }


  goBack() {
    this.eventMessage.emitUsageSpecList(true);
  }

}
