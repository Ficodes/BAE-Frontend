import { NgClass } from "@angular/common";
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import moment from 'moment';
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { components } from "src/app/models/product-catalog";
import { EventMessageService } from "src/app/services/event-message.service";
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../../../environments/environment';
import { FormChangeState, PricePlanChangeState } from "../../../models/interfaces";
import { ApiServiceService } from "../../../services/product-service.service";
import { CatalogueComponent } from "./catalogue/catalogue.component";
import { CategoryComponent } from "./category/category.component";
import { EdcContractDefinitionComponent } from "./edc-contract-definition/edc-contract-definition.component";
import { GeneralInfoComponent } from "./general-info/general-info.component";
import { LicenseComponent } from "./license/license.component";
import { OfferSummaryComponent } from "./offer-summary/offer-summary.component";
import { PricePlansComponent } from "./price-plans/price-plans.component";
import { ProcurementModeComponent } from "./procurement-mode/procurement-mode.component";
import { ProdSpecComponent } from "./prod-spec/prod-spec.component";
import { ReplicationVisibilityComponent } from "./replication-visibility/replication-visibility.component";

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]

export enum OfferStep {
  GENERAL_INFO = 'general_info',
  PROD_SPEC = 'prod_spec',
  CATALOGUE = 'catalogue',
  CATEGORY = 'category',
  LICENSE = 'license',
  CONTRACT_DEFINITION = 'contract_definition',
  PRICE = 'price',
  PROCUREMENT = 'procurement',
  REPLICATION = 'replication',
  SUMMARY = 'summary',
}

interface Step {
  label: string;
  id: OfferStep;
}

@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [
    GeneralInfoComponent,
    TranslateModule,
    ProdSpecComponent,
    ReactiveFormsModule,
    CategoryComponent,
    LicenseComponent,
    PricePlansComponent,
    CatalogueComponent,
    ProcurementModeComponent,
    ReplicationVisibilityComponent,
    OfferSummaryComponent,
    NgClass,
    EdcContractDefinitionComponent
  ],
  templateUrl: './offer.component.html',
  styleUrl: './offer.component.css'
})
export class OfferComponent implements OnInit, OnDestroy {

  @Input() formType: 'create' | 'update' = 'create';
  @Input() offer: any = {};
  @Input() partyId: any;

  productOfferForm: FormGroup;
  highestStepIdx = 0;
  contractDefinitionStep: Step = { label: 'Contract Definition', id: OfferStep.CONTRACT_DEFINITION };
  steps: Step[] = [
    { label: 'General Info', id: OfferStep.GENERAL_INFO },
    { label: 'Product Specification', id: OfferStep.PROD_SPEC },
    { label: 'Catalogue', id: OfferStep.CATALOGUE },
    { label: 'Category', id: OfferStep.CATEGORY },
    { label: 'License', id: OfferStep.LICENSE },
    { label: 'Price Plans', id: OfferStep.PRICE },
    { label: 'Procurement Mode', id: OfferStep.PROCUREMENT },
    // { label: 'Replication & Visibility', id: OfferStep.REPLICATION },
    { label: 'Summary', id: OfferStep.SUMMARY },
  ];
  currentStepIdx = 0;
  get currentStep(): Step { return this.steps[this.currentStepIdx]; }
  readonly OfferStep = OfferStep;

  isFormValid = false;
  selectedProdSpec: any;
  pricePlans: any = [];
  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;
  bundleChecked: boolean = false;
  offersBundle: any[] = [];
  loadingData: boolean = false;

  offerToCreate: ProductOffering_Create | undefined;

  private formChanges: { [key: string]: FormChangeState } = {};
  private formSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  hasChanges: boolean = false;

  get dspEnable(): boolean {
    return environment.DSP_ENABLED && environment.DATA_SPACE_ENABLED
  }

  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder) {

    this.productOfferForm = this.fb.group({
      generalInfo: this.fb.group({}),
      prodSpec: new FormControl(null, [Validators.required]),
      catalogue: new FormControl(null, [Validators.required]),
      category: new FormControl([]),
      license: this.fb.group({}),
      edcContractDefinition: this.fb.group({}),
      pricePlans: new FormControl([]),
      procurementMode: this.fb.group({}),
      replicationMode: this.fb.group({})
    });

    // Subscribe to form validation changes
    this.productOfferForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (!this.productOfferForm.controls['generalInfo'].valid || !this.productOfferForm.get('procurementMode')?.valid || !this.productOfferForm.get('edcContractDefinition')?.valid) {
          this.isFormValid = false
        } else {
          this.isFormValid = true
        }
      });

    // Subscribe to subform changes
    this.formSubscription = this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('subform changed-----')
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

  goToStep(index: number) {
    // Solo validar en modo creación
    if (this.formType === 'create' && index > this.currentStepIdx) {
      const currentStepValid = this.validateCurrentStep();
      if (!currentStepValid) {
        return;
      }
    }

    if (this.currentStep.id === 'prod_spec') {
      // VERIFY EDC compatible and enable if so
      if (this.isdEdcCompatible() && this.dspEnable) {
        this.enableContractDefinitionStep()
      } else {
        this.disableContractDefinitionStep();
      }
    }
    this.currentStepIdx = index;
    if (index > this.highestStepIdx) {
      this.highestStepIdx = index;
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep.id) {
      case OfferStep.GENERAL_INFO:
        return this.productOfferForm.get('generalInfo')?.valid || false;
      case OfferStep.PROD_SPEC:
        return !!this.productOfferForm.get('prodSpec')?.value;
      case OfferStep.CATALOGUE:
        return !!this.productOfferForm.get('catalogue')?.value;
      case OfferStep.CATEGORY:
        return true;
      case OfferStep.LICENSE:
        return this.productOfferForm.get('license')?.valid || false;
      case OfferStep.CONTRACT_DEFINITION:
        return this.productOfferForm.get('edcContractDefinition')?.valid || false;
      case OfferStep.PRICE:
        return true;
      case OfferStep.PROCUREMENT:
        return this.productOfferForm.get('procurementMode')?.valid || false;
      // case OfferStep.REPLICATION:
      //   return this.productOfferForm.get('replicationMode')?.valid || false;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    if (this.formType == 'create') {
      return (this.productOfferForm.get('generalInfo')?.valid && (index <= this.currentStepIdx)) || (this.productOfferForm.get('generalInfo')?.valid && (index <= this.highestStepIdx));
    } else {
      //return this.productOfferForm.get('generalInfo')?.valid
      return this.isFormValid
    }
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }

  enableContractDefinitionStep(): void {
    const alreadyAdded = this.steps.some(s => s.id === OfferStep.CONTRACT_DEFINITION);
    if (alreadyAdded) return;
    const licenseIdx = this.steps.findIndex(s => s.id === OfferStep.LICENSE);
    this.steps = [
      ...this.steps.slice(0, licenseIdx + 1),
      this.contractDefinitionStep,
      ...this.steps.slice(licenseIdx + 1),
    ];
  }

  disableContractDefinitionStep(): void {
    this.steps = this.steps.filter(s => s.id !== OfferStep.CONTRACT_DEFINITION);
  }


  submitForm() {
    if (this.formType === 'update') {
      this.eventMessage.emitUpdateOffer(true);
      console.log('🔄 Starting offer update process...');
      console.log('📝 Current form changes:', this.formChanges);

      // Aquí irá la lógica de actualización
      // Por ahora solo mostramos los cambios
      this.updateOffer();
    } else {
      // Lógica de creación existente
      this.createOffer();
    }
  }

  async ngOnInit() {
    if (this.formType === 'update' && this.offer) {
      this.loadingData = true;
      this.steps = this.steps.filter(step => step.id !== 'catalogue');
      await this.loadOfferData();
      this.loadingData = false;
    }
  }
  async loadOfferData() {
    console.log('Loading offer into form...', this.offer);

    // Product Specification
    if (this.offer.productSpecification) {
      await this.api.getProductSpecification(this.offer.productSpecification.id).then(async data => {
        this.selectedProdSpec = data;
      })
      this.productOfferForm.patchValue({
        prodSpec: this.selectedProdSpec || null // Cargar si existe, o dejar en null
      });
    }

    //CATEGORIES
    if (this.offer.category) {
      this.productOfferForm.patchValue({
        category: this.offer.category || null // Cargar si existe, o dejar en null
      });
    }

    //LICENSE
    if (this.offer.productOfferingTerm) {
      console.log('Found productOfferingTerm:', this.offer.productOfferingTerm);

      // Mantener el primer término (licencia) incluso si está vacío
      //const licenseTerm = this.offer.productOfferingTerm[0];
      const licenseTerm = this.offer.productOfferingTerm.find(
        (element: { name: string; }) => element.name === 'License'
      );

      // Filtrar el resto de términos

      /*const otherTerms = this.offer.productOfferingTerm.filter(
        (term: any) => term.name !== 'License'
      ) ?? [];


      // Reconstruir el array con el término de licencia en la posición 0
      this.offer.productOfferingTerm = [licenseTerm, ...otherTerms];*/

      if (licenseTerm) {
        this.productOfferForm.patchValue({
          license: {
            treatment: 'License',
            description: licenseTerm.description
          }
        });
      } else {
        this.productOfferForm.patchValue({
          license: {
            treatment: 'License',
            description: ''
          }
        });
      }

      //PROCUREMENT
      const procurementTerm = this.offer.productOfferingTerm.find(
        (element: { name: string; }) => element.name === 'procurement'
      );
      if (procurementTerm) {
        const procurementValue = {
          id: procurementTerm.description,
          name: procurementTerm.description
        };
        console.log('Setting procurement value:', procurementValue);
        this.productOfferForm.patchValue({
          procurementMode: procurementValue
        });
      } else {
        this.productOfferForm.patchValue({
          procurementMode: {
            id: 'manual',
            name: 'Manual'
          }
        });
      }

      // EDC Contract Definition
      if (environment.DSP_ENABLED) {
        const contractDefinition = this.offer.productOfferingTerm.find(
          (element: { name: string; }) => element.name === 'edc:contractDefinition'
        ) || { name: 'edc:contractDefinition' };
        this.productOfferForm.patchValue(({
          contractDefinition: {
            name: contractDefinition.name,
            accessPolicy: contractDefinition.accessPolicy ? JSON.stringify(contractDefinition.accessPolicy) : '',
            contractPolicy: contractDefinition.contractPolicy ? JSON.stringify(contractDefinition.contractPolicy) : ''
          }
        }))
      }
      /*console.log('Checking procurement terms...');
      this.offer.productOfferingTerm.forEach((term: any) => {
        console.log('Checking term:', term);
        if(term.name == 'procurement') {
          console.log('Found procurement term:', term);
          const procurementValue = {
            id: term.description,
            name: term.description
          };
          console.log('Setting procurement value:', procurementValue);
          this.productOfferForm.patchValue({
            procurementMode: procurementValue
          });
          console.log('Form value after patch:', this.productOfferForm.value);
        }
      })*/
    }

    // Price Plans
    if (Array.isArray(this.offer.productOfferingPrice) && this.offer.productOfferingPrice.length > 0) {
      for (let pop of this.offer.productOfferingPrice) {
        let relatedPrices: any[] = [];
        const pricePlan = await this.api.getOfferingPrice(pop.id);
        console.log('-- price plan ----')
        console.log(pricePlan)
        let configProfileCheck = false;
        if (pricePlan?.prodSpecCharValueUse && pricePlan?.prodSpecCharValueUse.length > 0) {
          configProfileCheck = true
        } else {
          configProfileCheck = false
        }

        let priceInfo: any = {
          id: pricePlan.id,
          name: pricePlan.name,
          description: pricePlan.description,
          lifecycleStatus: pricePlan.lifecycleStatus,
          paymentOnline: pricePlan?.paymentOnline ?? !!pricePlan?.bundledPopRelationship,
          productProfile: configProfileCheck ? this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []) : [],
        }

        //Now every pricePlan is set as bundle even with only one price component
        if (pricePlan.bundledPopRelationship) {
          for (let i = 0; i < pricePlan.bundledPopRelationship.length; i++) {
            let data = await this.api.getOfferingPrice(pricePlan.bundledPopRelationship[i].id)
            let priceComp: any = {
              id: data.id,
              href: data.href,
              name: data?.name,
              description: data?.description,
              isBundle: data?.isBundle,
              priceType: data?.priceType,
              lastUpdate: data?.lastUpdate,
              lifecycleStatus: data?.lifecycleStatus,
              paymentOnline: data?.paymentOnline ?? !!data?.bundledPopRelationship,
              selectedCharacteristic: data?.prodSpecCharValueUse || null,
              currency: data?.price?.unit || 'EUR',
              usageUnit: data?.unitOfMeasure?.units || null,
              usageSpecId: data?.usageSpecId,
              recurringPeriod: data?.recurringChargePeriodType || 'month',
              price: data?.price?.value,
              validFor: data?.validFor || null,
            }

            if (data?.price?.unit) {
              priceComp.currency = data?.price?.unit
            }

            if (data?.popRelationship) {
              let alter = await this.api.getOfferingPrice(data?.popRelationship[0].id)
              console.log('----- alter')
              console.log(alter)
              if (alter.percentage) {
                priceComp.discountValue = alter?.percentage
                priceComp.discountUnit = 'percentage'
              } else {
                priceComp.discountValue = alter?.price?.value
                priceComp.discountUnit = 'fixed'
              }
              priceComp.discountDuration = alter?.unitOfMeasure?.amount
              priceComp.discountDurationUnit = alter?.unitOfMeasure?.units
              //priceComp.discountDurationUnit=alter?.
              //priceComp.discountDuration=this.calculateDiscountDuration(alter?.validFor,alter?.)
            }
            relatedPrices.push(priceComp)
          }
        }

        priceInfo.priceComponents = relatedPrices;
        console.log(priceInfo)
        //}

        this.pricePlans.push(priceInfo);
        console.log(this.pricePlans)
      }
      console.log('Price Plans existentes: ', this.pricePlans);

      this.productOfferForm.patchValue({
        pricePlans: this.pricePlans // Cargar si existe, o dejar en null
      });
    }

    if (this.offer.externalId && this.isdEdcCompatible() && this.dspEnable) {
      this.enableContractDefinitionStep()
    }
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

  private handleApiError(error: any): void {
    console.error('Error while creating offer price!', error);
    this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'Error creating offer price!';
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  private async createPriceAlteration(component: any, currency: string): Promise<any> {
    const priceAlter: ProductOfferingPrice = {
      name: 'discount',
      priceType: 'discount',
      validFor: {
        startDateTime: moment().toISOString(),
        endDateTime: moment().add(Number(component.discountDuration), component.discountDurationUnit).toISOString()
      },
      unitOfMeasure: {
        amount: component.discountDuration,
        units: component.discountDurationUnit
      }
    };

    if (component.discountUnit === 'percentage') {
      priceAlter.percentage = component.discountValue;
    } else {
      priceAlter.price = { value: component.discountValue, unit: currency };
    }

    return await lastValueFrom(this.api.postOfferingPrice(priceAlter));
  }

  private async createPriceComponent(component: any, currency: string): Promise<any> {
    console.log('component format')
    console.log(component)
    let priceComp: ProductOfferingPrice = {
      name: component.name,
      isBundle: false,
      description: component.description ?? component?.newValue.description,
      lifecycleStatus: component?.lifecycleStatus ?? component?.newValue?.lifecycleStatus ?? 'Active',
      priceType: component.priceType ?? component?.newValue?.priceType,
      price: { unit: currency, value: component?.price ?? component?.newValue.price },
      recurringChargePeriodType: undefined,
      recurringChargePeriodLength: undefined,
      unitOfMeasure: undefined,
      prodSpecCharValueUse: undefined
    };

    let priceType = component.priceType ?? component?.newValue?.priceType;

    if (['recurring', 'recurring-prepaid'].includes(priceType)) {
      priceComp.recurringChargePeriodType = component.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (priceType === 'usage') {
      console.log(component.newValue)
      priceComp.unitOfMeasure = {
        amount: 1,
        units: component.usageUnit ?? component.newValue.usageUnit
      }
      priceComp['@baseType'] = "ProductOfferingPrice";
      priceComp['@schemaLocation'] = "https://raw.githubusercontent.com/laraminones/tmf-new-schemas/main/UsageSpecId.json";
      (priceComp as any).usageSpecId = component.usageSpecId ?? component?.newValue?.usageSpecId;


      console.log('-- here')
      console.log(priceComp)
    }

    if (component?.selectedCharacteristic || component?.newValue?.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.selectedCharacteristic ?? component.newValue.selectedCharacteristic;
    }

    if (component?.unitOfMeasure) {
      priceComp.unitOfMeasure = component.usageUnit;
    }

    if (component?.discountValue != null) {
      const discount = await this.createPriceAlteration(component, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('create price comp')
    console.log(priceComp)
    const created = await lastValueFrom(this.api.postOfferingPrice(priceComp));
    return { id: created.id, href: created.id, name: created.name };
  }

  private async updatePriceComponent(component: any, currency: string): Promise<any> {
    console.log('update function')
    console.log(component)
    console.log(currency)
    console.log('------')
    let priceComp: ProductOfferingPrice = {
      name: component.newValue.name,
      isBundle: false,
      description: component.newValue.description,
      lifecycleStatus: component.newValue.lifecycleStatus,
      priceType: component.newValue.priceType,
      price: { unit: currency, value: component.newValue.price }
    };

    if (['recurring', 'recurring-prepaid'].includes(component.newValue.priceType)) {
      priceComp.recurringChargePeriodType = component.newValue.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (component.newValue.priceType === 'usage') {
      console.log(component.newValue)
      priceComp.unitOfMeasure = {
        amount: 1,
        units: component.newValue.usageUnit
      };

      (priceComp as any).usageSpecId = component.newValue.usageSpecId;

      console.log('----- here')
      console.log(priceComp)
    }

    if (component.newValue.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.newValue.selectedCharacteristic;
    }

    if (component.newValue.unitOfMeasure) {
      priceComp.unitOfMeasure = component.newValue.usageUnit;
    }

    if (component.newValue.discountValue != null) {
      let discountMock: any = {
        discountValue: component.newValue.discountValue
      }
      if (component.newValue.discountUnit) {
        discountMock.discountUnit = component.newValue.discountUnit
      }
      if (component.newValue.discountDuration) {
        discountMock.discountDuration = component.newValue.discountDuration
      }
      if (component.newValue.discountDurationUnit) {
        discountMock.discountDurationUnit = component.newValue.discountDurationUnit
      }
      const discount = await this.createPriceAlteration(discountMock, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('update price comp')
    console.log(priceComp)
    const updated = await lastValueFrom(this.api.updateOfferingPrice(priceComp, component.id));
    return { id: updated.id, href: updated.id, name: updated.name };
  }

  private createBundledPricePlan(plan: any, compRel: any[]): ProductOfferingPrice {
    const price: ProductOfferingPrice = {
      name: plan.name ?? plan?.newValue?.name,
      isBundle: true,
      description: plan.description ?? plan?.newValue?.description,
      lifecycleStatus: plan.lifecycleStatus ?? plan?.newValue?.lifecycleStatus,
      bundledPopRelationship: compRel
    };

    if (plan?.priceType) {
      if (plan?.priceType == 'custom') {
        price.priceType = 'custom'
      }
    } else if (plan?.newValue?.priceType) {
      if (plan?.newValue?.priceType == 'custom') {
        price.priceType = 'custom'
      }
    }

    if (plan.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue
          .filter((v: any) => v.isDefault)
      }));
    }



    if (plan?.newValue?.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan?.newValue?.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue
          .filter((v: any) => v.isDefault)
      }));
    }

    console.log(price.prodSpecCharValueUse)

    if (plan.usageUnit) {
      price.unitOfMeasure = plan.usageUnit;
    }

    if (plan?.newValue?.usageUnit) {
      price.unitOfMeasure = plan?.newValue?.usageUnit;
    }

    return price;
  }

  async updatePricePlan(plan: any, compRel: any[], modifiedFields: string[]): Promise<ProductOfferingPrice> {

    console.log('plan info')
    console.log(plan)
    console.log(plan.id)
    console.log(compRel)
    let price: ProductOfferingPrice = {
      name: plan.newValue.name,
      isBundle: true,
      bundledPopRelationship: compRel
    }
    if (modifiedFields.includes('description')) {
      price.description = plan.newValue.description
    }
    if (modifiedFields.includes('prodSpecCharValueUse') && plan.newValue.prodSpecCharValueUse != null) {
      price.prodSpecCharValueUse = plan.newValue.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }
    let updatedPrice = await lastValueFrom(this.api.updateOfferingPrice(price, plan.id))
    return updatedPrice;
  }

  async createOffer() {
    this.loading = true;
    const plans = this.productOfferForm.value.pricePlans;

    if (plans.length === 0) {
      this.saveOfferInfo();
      return;
    }

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const components = plan.priceComponents || [];

      try {
        let createdPriceId: string;

        const compRel = await Promise.all(
          components.map((comp: any) => this.createPriceComponent(comp, plan.currency))
        );
        const bundledPricePlan = this.createBundledPricePlan(plan, compRel);
        const created = await lastValueFrom(this.api.postOfferingPrice(bundledPricePlan));
        createdPriceId = created.id;

        this.productOfferForm.value.pricePlans[i].id = createdPriceId;

        if (i === plans.length - 1) {
          this.saveOfferInfo();
        }
      } catch (error: any) {
        this.handleApiError(error);
      }
    }
  }

  saveOfferInfo(): void {
    const formValue = this.productOfferForm.value;

    const categories = formValue.category.map((cat: any) => ({
      id: cat.id,
      href: cat.id
    }));

    const prices = formValue.pricePlans.map((plan: any) => ({
      id: plan.id,
      href: plan.id
    }));

    const generalInfo = formValue.generalInfo;
    const lifecycleStatus = this.formType === 'update' ? generalInfo.status : 'Active';

    const offer: any = {
      name: generalInfo.name,
      description: generalInfo.description || '',
      lifecycleStatus,
      isBundle: this.bundleChecked,
      bundledProductOffering: this.offersBundle,
      place: [],
      version: generalInfo.version,
      ...(formValue.procurementMode.extBillingEnabled && formValue.procurementMode.plaSpecId ? {
        pricingLogicAlgorithm: [{ name: 'external billing', plaSpecId: formValue.procurementMode.plaSpecId }]
      } : {}),

      category: categories,
      productOfferingPrice: prices,
      validFor: {
        startDateTime: new Date().toISOString()
      },
      productOfferingTerm: [
        {
          name: 'License',
          description: formValue.license.description || ''
        },
        {
          name: 'procurement',
          description: formValue.procurementMode.mode
        }
      ]
    };

    if (this.dspEnable && this.isdEdcCompatible()) {
      const contractDefinition = formValue.edcContractDefinition;
      offer.productOfferingTerm.push({
        name: contractDefinition.name,
        contractPolicy: contractDefinition.contractPolicy ? JSON.parse(contractDefinition.contractPolicy) : '',
        accessPolicy: contractDefinition.accessPolicy ? JSON.parse(contractDefinition.accessPolicy) : '',
        '@schemaLocation': environment.DSP_CONTRACT_DEFINITION_SCHEMA
      })
      offer.externalId = uuidv4()
      offer['@schemaLocation'] = environment.DSP_SCHEMA
    }
    if (!this.bundleChecked && this.formType === 'create') {
      offer.productSpecification = {
        id: formValue.prodSpec.id,
        href: formValue.prodSpec.href
      };
    }

    this.offerToCreate = offer;

    const request$ = this.formType === 'create'
      ? this.api.postProductOffering(offer, formValue.catalogue.id)
      : this.api.updateProductOffering(offer, this.offer.id);

    request$.subscribe({
      next: (data) => {
        console.log('product offer created:');
        console.log(data);
        this.loading = false;
        this.goBack();
      },
      error: (error) => {
        console.error('Error during offer save/update:', error);
        this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while saving the offer!';
        this.loading = false;
        this.showError = true;
        setTimeout(() => (this.showError = false), 3000);
      }
    });
  }

  goBack() {
    this.eventMessage.emitSellerOffer(true);
  }

  addToISOString(duration: number, unit: string): string {
    // Mapping between custom units and Moment.js valid units
    const unitMapping: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      day: 'days',
      week: 'weeks',
      month: 'months',
      year: 'years',
    };

    // Validate the unit and map to Moment.js DurationConstructor
    const validUnit = unitMapping[unit.toLowerCase()];

    if (validUnit) {
      return moment().add(duration, validUnit).toISOString();
    } else {
      throw new Error(`Invalid unit: ${unit}. Must be one of day, week, month, or year.`);
    }
  }

  calculateDiscountDuration(validFor: { startDateTime: string, endDateTime: string }, unit: 'days' | 'hours' | 'months') {
    const start = moment(validFor.startDateTime);
    const end = moment(validFor.endDateTime);

    // Calculate the difference based on the given unit
    const discountDuration = end.diff(start, unit);

    return discountDuration;
  }

  async updateOffer() {
    this.loading = true;
    console.log('🔄 Starting offer update process...');
    console.log('📝 Current form changes:', this.formChanges);

    // Preparar el payload base con los datos que no han cambiado
    const basePayload: any = {
      name: this.offer.name,
      description: this.offer.description,
      lifecycleStatus: this.offer.lifecycleStatus,
      version: this.offer.version,
      category: this.offer.category,
      productOfferingPrice: this.offer.productOfferingPrice.map((price: any) => {
        return { // WORKARROUND ISSUE WITH THE PRICE PLAN TO BE INCLUDED IN THE REF
          id: price.id,
          href: price.href
        }
      }),
      validFor: this.offer.validFor,
      productOfferingTerm: this.offer.productOfferingTerm
    };

    // Procesar cada cambio emitido por los subformularios
    for (const [subformType, change] of Object.entries(this.formChanges)) {
      console.log(`📝 Processing changes for ${subformType}:`, change);

      switch (subformType) {
        case 'generalInfo':
          // Actualizar información general
          basePayload.name = change.currentValue.name;
          basePayload.description = change.currentValue.description;
          basePayload.version = change.currentValue.version;
          basePayload.lifecycleStatus = change.currentValue.status;
          break;

        case 'productSpecification':
          // Actualizar especificación del producto
          basePayload.productSpecification = {
            id: change.currentValue.id,
            href: change.currentValue.id
          };
          break;

        case 'category':
          // Actualizar categorías
          basePayload.category = change.currentValue.map((cat: any) => ({
            id: cat.id,
            href: cat.id
          }));
          break;

        case 'license':
          // Actualizar términos de licencia
          const licenseTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'License');
          if (licenseTerm) {
            licenseTerm.description = change.currentValue.description;
          } else {
            // Añadir el término de licencia al principio del array
            basePayload.productOfferingTerm.unshift({
              name: 'License',
              description: change.currentValue.description
            });
          }
          break;

        case 'pricePlans':
          // Actualizar planes de precios
          basePayload.productOfferingPrice = change.currentValue.map((plan: any) => ({
            id: plan.id,
            href: plan.id
          }));
          console.log('Cambio en el plan de precios')
          console.log(basePayload.productOfferingPrice)
          console.log((change as PricePlanChangeState).modifiedPricePlans)
          let pricePlanChangeInfo = (change as PricePlanChangeState).modifiedPricePlans;
          for (let i = 0; i < pricePlanChangeInfo.length; i++) {
            let finalPriceComps: any[] = [];
            if (pricePlanChangeInfo[i].priceComponents.added.length > 0) {
              //Crear price comp
              for (let j = 0; j < pricePlanChangeInfo[i].priceComponents.added.length; j++) {
                //finalPriceComps.push(this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j],change.currentValue.currency))
                let compCreated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j], pricePlanChangeInfo[i]?.newValue.currency)
                finalPriceComps.push(compCreated)
              }
              console.log('The following price comps has been created:')
              console.log(finalPriceComps)
            }
            if (pricePlanChangeInfo[i].priceComponents.modified.length > 0) {
              //Modificar price comp
              for (let j = 0; j < pricePlanChangeInfo[i].priceComponents.modified.length; j++) {
                //Revisar que en el caso de actualizar un componente que tenga el mismo id que el price plan (que antes no fuese bundle) ahora hay que crear el componente
                console.log('antes del check')
                console.log(pricePlanChangeInfo[i])
                console.log(pricePlanChangeInfo[i]?.oldValue.isBundle)
                console.log((!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length > 0))
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id)
                if ((pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id) && (!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length > 0)) {
                  console.log('Si entra en el check')
                  let compUpdated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j], pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                } else if (pricePlanChangeInfo[i].priceComponents.modified[j].id != pricePlanChangeInfo[i].id) {
                  let compUpdated = await this.updatePriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j], pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                }

                console.log('The following price comp has been updated:')
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j])
              }
            }
            //Modificar el plan
            if (!pricePlanChangeInfo[i].id.startsWith('temp-id')) {
              let updatedPricePlan = await this.updatePricePlan(pricePlanChangeInfo[i], finalPriceComps, pricePlanChangeInfo[i].modifiedFields);

              console.log('Modified price plan')
              console.log(updatedPricePlan)
            } else {
              let createdPricePlan = await this.createBundledPricePlan(pricePlanChangeInfo[i], finalPriceComps);
              const created = await lastValueFrom(this.api.postOfferingPrice(createdPricePlan));
              let index = basePayload.productOfferingPrice.findIndex(
                (plan: any) => plan.id === pricePlanChangeInfo[i].id
              );
              basePayload.productOfferingPrice[index].id = created.id;
              basePayload.productOfferingPrice[index].href = created.id;
              console.log('New price plan')
              console.log(createdPricePlan)
            }
          }
          break;

        case 'procurement':
          // Actualizar modo de adquisición
          const procurementTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'procurement');
          if (procurementTerm) {
            procurementTerm.description = change.currentValue.id;
          } else {
            basePayload.productOfferingTerm.push({
              name: 'procurement',
              description: change.currentValue.id
            });
          }
          if (change.currentValue.extBillingEnabled && change.currentValue.plaSpecId) {
            basePayload.pricingLogicAlgorithm = [{ name: 'external billing', plaSpecId: change.currentValue.plaSpecId }];
          } else if (change.originalValue.extBillingEnabled && !change.currentValue.extBillingEnabled) {
            basePayload.pricingLogicAlgorithm = [];
          }
          break;

        case 'contractDefinition': {
          if (change.currentValue.dspCompatible) {
            const edcTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'edc:contractDefinition');
            if (edcTerm) {
              edcTerm.accessPolicy = JSON.parse(change.currentValue.accessPolicy);
              edcTerm.contractPolicy = JSON.parse(change.currentValue.contractPolicy);
            } else {
              basePayload.productOfferingTerm.push({
                name: change.currentValue.name,
                contractPolicy: change.currentValue.contractPolicy ? JSON.parse(change.currentValue.contractPolicy) : '',
                accessPolicy: change.currentValue.accessPolicy ? JSON.parse(change.currentValue.accessPolicy) : '',
                '@schemaLocation': environment.DSP_CONTRACT_DEFINITION_SCHEMA
              })
            }
          } else {
            basePayload.productOfferingTerm = basePayload.productOfferingTerm.filter(
              (term: any) => term.name !== 'edc:contractDefinition'
            );
          }
          break;
        }

        case 'replication':
          // Actualizar configuración de replicación
          // TODO: Implementar cuando se tenga la estructura de replicación
          break;
      }
    }

    // Eliminar campos undefined o null
    Object.keys(basePayload).forEach(key => {
      if (basePayload[key] === undefined || basePayload[key] === null) {
        delete basePayload[key];
      }
    });

    // Limpiar términos vacíos en productOfferingTerm
    /*if (basePayload.productOfferingTerm) {
      // Mantener el primer término (licencia) incluso si está vacío
      //const licenseTerm = basePayload.productOfferingTerm[0];
      let licenseTerm = basePayload.productOfferingTerm.find((element: { name: any; }) => element.name == 'License')
      if(!licenseTerm){
        licenseTerm={
          name: 'License',
          description: basePayload.productOfferingTerm[0].description
        }
      }

      // Filtrar el resto de términos
      const otherTerms = this.offer.productOfferingTerm.filter(
        (term: any) => term.name !== 'License'
      ) ?? [];

      // Reconstruir el array con el término de licencia en la posición 0
      basePayload.productOfferingTerm = [licenseTerm, ...otherTerms];
    }*/

    console.log('📝 Final update payload:', basePayload);

    try {
      // Llamar a la API para actualizar la oferta
      await lastValueFrom(this.api.updateProductOffering(basePayload, this.offer.id));
      console.log('✅ Offer updated successfully');
      this.loading = false;
      this.goBack();
    } catch (error: any) {
      console.error('❌ Error updating offer:', error);
      this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while updating the offer!';
      this.loading = false;
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
    }
  }

  private isdEdcCompatible() {

    const prodSpec = this.productOfferForm.controls['prodSpec'].value
    return prodSpec && (prodSpec as any).externalId;
  }
}
