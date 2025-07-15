import {Component, Input, OnInit, OnDestroy} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {GeneralInfoComponent} from "./general-info/general-info.component";
import {TranslateModule} from "@ngx-translate/core";
import {ProdSpecComponent} from "./prod-spec/prod-spec.component";
import {NgClass, NgIf} from "@angular/common";
import {ApiServiceService} from "../../../services/product-service.service";
import {CategoryComponent} from "./category/category.component";
import {LicenseComponent} from "./license/license.component";
import {PricePlansComponent} from "./price-plans/price-plans.component";
import {CatalogueComponent} from "./catalogue/catalogue.component";
import {ProcurementModeComponent} from "./procurement-mode/procurement-mode.component"
import {ReplicationVisibilityComponent} from "./replication-visibility/replication-visibility.component"
import {OfferSummaryComponent} from "./offer-summary/offer-summary.component"
import { lastValueFrom } from 'rxjs';
import {components} from "src/app/models/product-catalog";
import {EventMessageService} from "src/app/services/event-message.service";
import {FormChangeState, PricePlanChangeState} from "../../../models/interfaces";
import {Subscription} from "rxjs";
import * as moment from 'moment';
import { certifications } from 'src/app/models/certification-standards.const';

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]
 
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
    NgClass
  ],
  templateUrl: './offer.component.html',
  styleUrl: './offer.component.css'
})
export class OfferComponent implements OnInit, OnDestroy{

  @Input() formType: 'create' | 'update' = 'create';
  @Input() offer: any = {};
  @Input() partyId: any;

  productOfferForm: FormGroup;
  currentStep = 0;
  highestStep = 0;
  steps = [
    'General Info',
    'Product Specification',
    'Catalogue',
    'Category',
    'License',
    'Price Plans',
    'Procurement Mode',
    //'Replication & Visibility',
    'Summary'
  ];
  isFormValid = false;
  selectedProdSpec: any;
  pricePlans:any = [];
  errorMessage:any='';
  showError:boolean=false;
  bundleChecked:boolean=false;
  offersBundle:any[]=[];
  loadingData:boolean=false;

  offerToCreate:ProductOffering_Create | undefined;

  private formChanges: { [key: string]: FormChangeState } = {};
  private formSubscription: Subscription | null = null;
  hasChanges: boolean = false;

  constructor(private api: ApiServiceService,
              private eventMessage: EventMessageService,
              private fb: FormBuilder) {

    this.productOfferForm = this.fb.group({
      generalInfo: this.fb.group({}),
      prodSpec: new FormControl(null, [Validators.required]),
      catalogue: new FormControl(null, [Validators.required]),
      category: new FormControl([]),
      license: this.fb.group({}),
      pricePlans: new FormControl([]),
      procurementMode: this.fb.group({}),
      replicationMode: this.fb.group({})
    });

    // Subscribe to form validation changes
    this.productOfferForm.statusChanges.subscribe(status => {
      this.isFormValid = status === 'VALID';
    });

    // Subscribe to subform changes
    this.formSubscription = this.eventMessage.messages$.subscribe(message => {
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
  }

  goToStep(index: number) {
    // Solo validar en modo creación
    if (this.formType === 'create' && index > this.currentStep) {
      // Validar el paso actual
      const currentStepValid = this.validateCurrentStep();
      if (!currentStepValid) {
        return; // No permitir avanzar si el paso actual no es válido
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
        return this.productOfferForm.get('generalInfo')?.valid || false;
      case 1: // Product Specification
        return !!this.productOfferForm.get('prodSpec')?.value;
      case 2: // Catalogue
        return !!this.productOfferForm.get('catalogue')?.value;
      case 3: // Category
        return true; // Las categorías no son obligatorias
      case 4: // License
        return this.productOfferForm.get('license')?.valid || false;
      case 5: // Price Plans
        return true;
      case 6: // Procurement Mode
        return this.productOfferForm.get('procurementMode')?.valid || false;
      /*case 7: // Replication & Visibility
        return this.productOfferForm.get('replicationMode')?.valid || false;*/
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    if(this.formType == 'create'){
      return (this.productOfferForm.get('generalInfo')?.valid &&  (index <= this.currentStep)) || (this.productOfferForm.get('generalInfo')?.valid &&  (index <= this.highestStep));
    } else {
      return this.productOfferForm.get('generalInfo')?.valid
    }
  }  

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
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
      this.loadingData=true;
      this.steps = [
        'General Info',
        'Product Specification',
        //'Catalogue',
        'Category',
        'License',
        'Price Plans',
        'Procurement Mode',
        //'Replication & Visibility',
        'Summary'
      ];
      await this.loadOfferData();
      this.loadingData=false;
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
    if(this.offer.category){
      this.productOfferForm.patchValue({
        category: this.offer.category || null // Cargar si existe, o dejar en null
      });
    }

    //LICENSE
    if(this.offer.productOfferingTerm){
      console.log('Found productOfferingTerm:', this.offer.productOfferingTerm);
      
      // Mantener el primer término (licencia) incluso si está vacío
      const licenseTerm = this.offer.productOfferingTerm[0];
      
      // Filtrar el resto de términos
      const otherTerms = this.offer.productOfferingTerm.slice(1).filter((term: any) => 
        term.name && term.name.trim() !== '' && term.description && term.description.trim() !== ''
      );
      
      // Reconstruir el array con el término de licencia en la posición 0
      this.offer.productOfferingTerm = [licenseTerm, ...otherTerms];

      this.productOfferForm.patchValue({
        license: {
          treatment: this.offer.productOfferingTerm[0].name,
          description: this.offer.productOfferingTerm[0].description
        }
      });

      //PROCUREMENT
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
      let relatedPrices:any[] = [];
       const pricePlan = await this.api.getOfferingPrice(pop.id);
       console.log('-- price plan ----')
       console.log(pricePlan)
       let configProfileCheck = true;
       let realCharsLength = 0;
       for(let i=0;i<this.selectedProdSpec?.productSpecCharacteristic.length;i++){
          if (!certifications.some(certification => certification.name === this.selectedProdSpec?.productSpecCharacteristic[i].name)) {
            realCharsLength++;
          }
        }
       if(pricePlan?.prodSpecCharValueUse && pricePlan?.prodSpecCharValueUse.length < realCharsLength){
        configProfileCheck=false
       }
       let priceInfo: any = {
        id: pricePlan.id,
        name: pricePlan.name,
        description: pricePlan.description,
        lifecycleStatus: pricePlan.lifecycleStatus,
        paymentOnline: pricePlan?.paymentOnline ?? !!pricePlan?.bundledPopRelationship,
        productProfile: configProfileCheck ? this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []) : [],     
      }
      if(pricePlan.priceType){
        priceInfo.priceType=pricePlan.priceType;
      }
      /*if(pricePlan.prodSpecCharValueUse){
        priceInfo.selectedCharacteristic=pricePlan.prodSpecCharValueUse;
      }*/
      if(pricePlan?.price?.unit){
        priceInfo.currency=pricePlan?.price?.unit
      }
      if(pricePlan?.price?.value && pricePlan.isBundle==false){
        priceInfo.paymentOnline=true
        priceInfo.price=pricePlan?.price?.value        
        let pricePlanTmp:any = {
          id:pricePlan.id,
          href:pricePlan.href,
          name:pricePlan.name,
          description:pricePlan?.description,
          priceType:pricePlan?.priceType,
          lastUpdate:pricePlan?.lastUpdate,
          lifecycleStatus:pricePlan?.lifecycleStatus,
          paymentOnline: true,
          selectedCharacteristic: configProfileCheck ? null : pricePlan?.prodSpecCharValueUse,
          currency: pricePlan?.price?.unit || 'EUR',
          recurringPeriod: pricePlan?.recurringChargePeriodType || 'month',
          productProfile: configProfileCheck ? this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []) : [],
          price: pricePlan?.price?.value,
          validFor: pricePlan?.validFor || null,
          usageUnit: pricePlan.usageUnit,
          usageSpecId: pricePlan?.usagespecid
        }
        if(pricePlan?.popRelationship){
          let alter = await this.api.getOfferingPrice(pricePlan?.popRelationship[0].id)
          if(alter.percentage){
            pricePlanTmp.discountValue=alter?.percentage
            pricePlanTmp.discountUnit='percentage'
          }else{
            pricePlanTmp.discountValue=alter?.price?.value
            pricePlanTmp.discountUnit=alter?.price?.unit
          }            
          pricePlanTmp.discountDuration = alter?.unitOfMeasure?.amount            
          pricePlanTmp.discountDurationUnit = alter?.unitOfMeasure?.units
        }
        relatedPrices.push(pricePlanTmp)
        priceInfo.priceComponents=relatedPrices;
      }
      console.log('price components---')
      console.log(relatedPrices)
      //if(pricePlan.bundledPopRelationship){
      if(pricePlan.isBundle==true){  
      for(let i=0;i<pricePlan.bundledPopRelationship.length;i++){
        let data = await this.api.getOfferingPrice(pricePlan.bundledPopRelationship[i].id)
          let priceComp:any = {
            id:data.id,
            href:data.href,
            name:data?.name,
            description:data?.description,
            isBundle:data?.isBundle,
            priceType:data?.priceType,
            lastUpdate:data?.lastUpdate,
            lifecycleStatus:data?.lifecycleStatus,
            paymentOnline: data?.paymentOnline ?? !!data?.bundledPopRelationship,
            selectedCharacteristic: data?.prodSpecCharValueUse || null,
            currency: data?.price?.unit || 'EUR',
            usageUnit: data?.unitOfMeasure?.units || null,
            usageSpecId: data?.usagespecid,
            recurringPeriod: data?.recurringChargePeriodType || 'month',
            price: data?.price?.value,
            validFor: data?.validFor || null,
          }
          
          if(data?.price?.unit){
            priceComp.currency=data?.price?.unit
          }

          if(data?.popRelationship){
            let alter = await this.api.getOfferingPrice(data?.popRelationship[0].id)
            console.log('----- alter')
            console.log(alter)
            if(alter.percentage){
              priceComp.discountValue=alter?.percentage
              priceComp.discountUnit='percentage'
            }else{
              priceComp.discountValue=alter?.price?.value
              priceComp.discountUnit=alter?.price?.unit
            }            
            priceComp.discountDuration = alter?.unitOfMeasure?.amount            
            priceComp.discountDurationUnit = alter?.unitOfMeasure?.units            
            //priceComp.discountDurationUnit=alter?.
            //priceComp.discountDuration=this.calculateDiscountDuration(alter?.validFor,alter?.)
          }
          relatedPrices.push(priceComp)
      }
      priceInfo.priceComponents=relatedPrices;
      console.log(priceInfo)
      }
      if(pricePlan.priceType=='usage'){
        priceInfo.usageUnit=pricePlan.unitOfMeasure.units
        priceInfo.usageSpecId= pricePlan?.usagespecid
      }

      if(pricePlan.priceType=='recurring' || pricePlan.priceType=='recurring-prepaid'){
        priceInfo.recurringPeriod=pricePlan.recurringChargePeriodType
      }

      this.pricePlans.push(priceInfo);
      console.log(this.pricePlans)
     }
     console.log('Price Plans existentes: ', this.pricePlans);

    this.productOfferForm.patchValue({
      pricePlans: this.pricePlans // Cargar si existe, o dejar en null
    });
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
      (priceComp as any).usagespecid = component.newValue.usageSpecId;


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

      priceComp['@baseType'] = "ProductOfferingPrice";
      priceComp['@schemaLocation'] = "https://raw.githubusercontent.com/laraminones/tmf-new-schemas/main/UsageSpecId.json";
      (priceComp as any).usagespecid = component.newValue.usageSpecId;

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
      let discountMock:any = {
        discountValue: component.newValue.discountValue
      }
      if(component.newValue.discountUnit){
        discountMock.discountUnit=component.newValue.discountUnit
      }
      if(component.newValue.discountDuration){
        discountMock.discountDuration=component.newValue.discountDuration
      }
      if(component.newValue.discountDurationUnit){
        discountMock.discountDurationUnit=component.newValue.discountDurationUnit
      }
      const discount = await this.createPriceAlteration(discountMock, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('update price comp')
    console.log(priceComp)
    const updated = await lastValueFrom(this.api.updateOfferingPrice(priceComp,component.id));
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

    if (plan.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }

    if(plan?.newValue?.prodSpecCharValueUse){
      price.prodSpecCharValueUse = plan?.newValue?.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }

    if (plan.usageUnit) {
      price.unitOfMeasure = plan.usageUnit;
    }

    if(plan?.newValue?.usageUnit){
      price.unitOfMeasure = plan?.newValue?.usageUnit;
    }

    return price;
  }

  private async createSinglePricePlan(plan: any, comp: any): Promise<ProductOfferingPrice> {
    const price: ProductOfferingPrice = {
      name: plan.name ?? plan?.newValue?.name,
      isBundle: false,
      description: plan.description ?? plan?.newValue?.description,
      lifecycleStatus: plan.status ?? plan?.newValue?.lifecycleStatus,
      priceType: comp?.priceType ?? plan?.newValue?.priceComponents[0]?.priceType ?? plan?.priceType ?? plan?.newValue?.priceType,
      //price: comp?.price ? { value: comp.price ?? plan?.newValue.priceComponents[0].price, unit: plan.currency ?? plan?.newValue.priceComponents[0].currency } : undefined,
      recurringChargePeriodType: undefined,
      recurringChargePeriodLength: undefined,
      unitOfMeasure: undefined,
      prodSpecCharValueUse: undefined
    };

    if(comp?.price){
      price.price = {
        value: comp.price,
        unit: plan.currency
      }
    } else if (plan?.newValue && !plan?.newValue?.isBundle && plan?.newValue?.priceComponents[0]?.price){
      price.price = {
        value: plan?.newValue?.priceComponents[0]?.price,
        unit: plan?.newValue?.currency
      }
    } else {
      price.price = undefined
    }

    let priceType = comp?.priceType ?? plan?.newValue?.priceComponents[0]?.priceType

    if (['recurring', 'recurring-prepaid'].includes(priceType)) {
      price.recurringChargePeriodType = comp.recurringPeriod ?? plan?.newValue?.priceComponents[0]?.recurringPeriod;
      price.recurringChargePeriodLength = 1;
    }

    if (priceType === 'usage') {
      price.unitOfMeasure = { 
        amount: 1,
        units: comp.usageUnit ?? plan?.newValue?.priceComponents[0]?.usageUnit     
      };

      price['@baseType'] = "ProductOfferingPrice";
      price['@schemaLocation'] = "https://raw.githubusercontent.com/laraminones/tmf-new-schemas/main/UsageSpecId.json";
      (price as any).usagespecid = comp.usageSpecId ?? plan?.newValue?.priceComponents[0].usageSpecId;


      console.log('----- here')
      console.log(price)
    }

    if (comp?.discountValue != null) {
      const discount = await this.createPriceAlteration(comp, plan.currency);
      price.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }

    if(plan?.newValue?.priceComponents[0]?.discountValue){
      const discount = await this.createPriceAlteration(plan?.newValue?.priceComponents[0], plan?.newValue?.currency);
      price.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }

    if (comp?.selectedCharacteristic || plan?.newValue?.priceComponents[0]?.selectedCharacteristic) {
      price.prodSpecCharValueUse = comp.selectedCharacteristic ?? plan?.newValue.priceComponents[0].selectedCharacteristic;
    }

    if (plan?.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }

    if(plan?.newValue?.prodSpecCharValueUse){
      price.prodSpecCharValueUse = plan?.newValue?.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }

    return price;
  }

  async updatePricePlan(plan: any, compRel: any[], modifiedFields: string[]): Promise<ProductOfferingPrice> {

    console.log('plan info')
    console.log(plan)
    console.log(plan.id)
    console.log(compRel)
    let price : ProductOfferingPrice = {
      name: plan.newValue.name,
      isBundle: true,
      bundledPopRelationship: compRel
    }
    if(compRel.length<=1){
      price = {
        name: plan.newValue.name,
        isBundle: false,
        price: plan.newValue.priceComponents[0]?.price ? { value: plan.newValue.priceComponents[0].price, unit: plan.newValue.currency } : undefined
      };
      if(plan.newValue.priceComponents[0]?.priceType != plan.oldValue.priceType){
        price.priceType = plan.newValue.priceComponents[0]?.priceType
      }
      if (['recurring', 'recurring-prepaid'].includes(plan.newValue.priceComponents[0]?.priceType)) {
        price.recurringChargePeriodType = plan.newValue.priceComponents[0].recurringPeriod;
        price.recurringChargePeriodLength = 1;
      }
  
      if (plan.newValue.priceComponents[0]?.priceType === 'usage') {
        price.unitOfMeasure = { 
          amount: 1,
          units: plan.newValue.priceComponents[0].usageUnit        
        };

        price['@baseType'] = "ProductOfferingPrice";
        price['@schemaLocation'] = "https://raw.githubusercontent.com/laraminones/tmf-new-schemas/main/UsageSpecId.json";
        (price as any).usagespecid = plan?.newValue?.priceComponents[0].usageSpecId;

        console.log('----- here')
        console.log(price)
      }
  
      if (plan.newValue.priceComponents[0]?.selectedCharacteristic) {
        price.prodSpecCharValueUse = plan.newValue.priceComponents[0].selectedCharacteristic;
      }

      if(plan.oldValue?.priceComponents && plan.oldValue?.priceComponents.length>1){
        console.log('tenia bundle pero ahora undefined')
        price.bundledPopRelationship=undefined
        console.log(price)
      }

      if(plan.newValue.priceComponents[0].prodSpecCharValueUse != null){
        price.prodSpecCharValueUse = plan.newValue.priceComponents[0].prodSpecCharValueUse.map((item: any) => ({
          ...item,
          productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
        }));
      }
  
      if (plan.newValue.priceComponents[0].discountValue != null) {
        console.log(plan.newValue.priceComponents[0])
        const discount = await this.createPriceAlteration(plan.newValue.priceComponents[0], plan.newValue.currency);
        price.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
      }
      
    } else if (plan.oldValue.price!=null){
      price.price = undefined;
      price.priceType = undefined;
      if('recurringChargePeriodType' in plan.oldValue){
        price.recurringChargePeriodType = undefined
      }
      if('recurringChargePeriodLength' in plan.oldValue){
        price.recurringChargePeriodLength = undefined
      }
      if('unitOfMeasure' in plan.oldValue){
        price.unitOfMeasure = undefined
      }
    }
    if(modifiedFields.includes('description')){
      price.description = plan.newValue.description
    }
    if(modifiedFields.includes('prodSpecCharValueUse') && plan.newValue.prodSpecCharValueUse != null){
      price.prodSpecCharValueUse = plan.newValue.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }
    let updatedPrice =await lastValueFrom(this.api.updateOfferingPrice(price,plan.id))
    return updatedPrice;
  }

  async createOffer() {
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

        if (components.length > 1) {
          const compRel = await Promise.all(
            components.map((comp: any) => this.createPriceComponent(comp, plan.currency))
          );
          const bundledPricePlan = this.createBundledPricePlan(plan, compRel);
          const created = await lastValueFrom(this.api.postOfferingPrice(bundledPricePlan));
          createdPriceId = created.id;
        } else {
          const singlePlan = await this.createSinglePricePlan(plan, components[0]);
          const created = await lastValueFrom(this.api.postOfferingPrice(singlePlan));
          createdPriceId = created.id;
        }

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
      category: categories,
      productOfferingPrice: prices,
      validFor: {
        startDateTime: new Date().toISOString()
      },
      productOfferingTerm: [
        {
          name: formValue.license.treatment || '',
          description: formValue.license.description || ''
        },
        {
          name: 'procurement',
          description: formValue.procurementMode.mode
        }
      ]
    };

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
        this.goBack();
      },
      error: (error) => {
        console.error('Error during offer save/update:', error);
        this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while saving the offer!';
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
    console.log('🔄 Starting offer update process...');
    console.log('📝 Current form changes:', this.formChanges);

    // Preparar el payload base con los datos que no han cambiado
    const basePayload: any = {
      name: this.offer.name,
      description: this.offer.description,
      lifecycleStatus: this.offer.lifecycleStatus,
      version: this.offer.version,
      category: this.offer.category,
      productOfferingPrice: this.offer.productOfferingPrice,
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
          const licenseTerm = basePayload.productOfferingTerm.find((term: any) => term.name === change.currentValue.treatment);
          if (licenseTerm) {
            licenseTerm.description = change.currentValue.description;
          } else {
            // Añadir el término de licencia al principio del array
            basePayload.productOfferingTerm.unshift({
              name: change.currentValue.treatment,
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
          for(let i=0;i< pricePlanChangeInfo.length; i++){
            let finalPriceComps:any[]=[];
            if(pricePlanChangeInfo[i].priceComponents.added.length>0){
              //Crear price comp
              for(let j=0;j< pricePlanChangeInfo[i].priceComponents.added.length; j++){
                //finalPriceComps.push(this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j],change.currentValue.currency))
                let compCreated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j],pricePlanChangeInfo[i]?.newValue.currency)
                finalPriceComps.push(compCreated)
              } 
              console.log('The following price comps has been created:')
              console.log(finalPriceComps)
            }
            if(pricePlanChangeInfo[i].priceComponents.modified.length>0){
              //Modificar price comp
              for(let j=0; j < pricePlanChangeInfo[i].priceComponents.modified.length ;j++){
                //Revisar que en el caso de actualizar un componente que tenga el mismo id que el price plan (que antes no fuese bundle) ahora hay que crear el componente
                console.log('antes del check')
                console.log(pricePlanChangeInfo[i])
                console.log(pricePlanChangeInfo[i]?.oldValue.isBundle)
                console.log((!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length>0))
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id)
                if((pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id) && (!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length>0)){
                  console.log('Si entra en el check')
                  let compUpdated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j],pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                } else if(pricePlanChangeInfo[i].priceComponents.modified[j].id != pricePlanChangeInfo[i].id){
                  let compUpdated = await this.updatePriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j],pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                } 
                
                console.log('The following price comp has been updated:')
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j])
              }
            }
            //Modificar el plan
            if (!pricePlanChangeInfo[i].id.startsWith('temp-id')) {
              let updatedPricePlan = await this.updatePricePlan(pricePlanChangeInfo[i],finalPriceComps,pricePlanChangeInfo[i].modifiedFields);
            
              console.log('Modified price plan')
              console.log(updatedPricePlan)
            } else {
              if (finalPriceComps.length > 1) {
                let createdPricePlan = await this.createBundledPricePlan(pricePlanChangeInfo[i],finalPriceComps);
                const created = await lastValueFrom(this.api.postOfferingPrice(createdPricePlan));
                let index = basePayload.productOfferingPrice.findIndex(
                  (plan: any) => plan.id === pricePlanChangeInfo[i].id
                );
                basePayload.productOfferingPrice[index].id = created.id;
                basePayload.productOfferingPrice[index].href = created.id;
                console.log('New price plan')
                console.log(createdPricePlan)
              } else {
                let createdPricePlan = await this.createSinglePricePlan(pricePlanChangeInfo[i],finalPriceComps[0]);
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
          break;

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
    if (basePayload.productOfferingTerm) {
      // Mantener el primer término (licencia) incluso si está vacío
      const licenseTerm = basePayload.productOfferingTerm[0];
      
      // Filtrar el resto de términos
      const otherTerms = basePayload.productOfferingTerm.slice(1).filter((term: any) => 
        term.name && term.name.trim() !== '' && term.description && term.description.trim() !== ''
      );
      
      // Reconstruir el array con el término de licencia en la posición 0
      basePayload.productOfferingTerm = [licenseTerm, ...otherTerms];
    }

    console.log('📝 Final update payload:', basePayload);

    try {
      // Llamar a la API para actualizar la oferta
      await lastValueFrom(this.api.updateProductOffering(basePayload, this.offer.id));
      console.log('✅ Offer updated successfully');
      this.goBack();
    } catch (error: any) {
      console.error('❌ Error updating offer:', error);
      this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while updating the offer!';
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
    }
  }
}
