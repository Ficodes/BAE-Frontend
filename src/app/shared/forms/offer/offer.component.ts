import {Component, Input, OnInit} from '@angular/core';
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
import * as moment from 'moment';

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]
 
@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [
    GeneralInfoComponent,
    TranslateModule,
    ProdSpecComponent,
    NgIf,
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
export class OfferComponent implements OnInit{

  @Input() formType: 'create' | 'update' = 'create';
  @Input() offer: any = {};
  @Input() partyId: any;

  productOfferForm: FormGroup;
  currentStep = 0;
  steps = [
    'General Info',
    'Product Specification',
    'Catalogue',
    'Category',
    'License',
    'Price Plans',
    'Procurement Mode',
    'Replication & Visibility',
    'Summary'
  ];
  isFormValid = false;
  selectedProdSpec: any;
  pricePlans:any = [];

  errorMessage:any='';
  showError:boolean=false;
  bundleChecked:boolean=false;
  offersBundle:any[]=[];

  offerToCreate:ProductOffering_Create | undefined;

  constructor(private api: ApiServiceService,
              private eventMessage: EventMessageService,
              private fb: FormBuilder) {

    this.productOfferForm = this.fb.group({
      generalInfo: this.fb.group({}),
      prodSpec: new FormControl(null),
      catalogue: new FormControl(null),
      category: new FormControl([]),
      license: this.fb.group({}),
      pricePlans: new FormControl([]),
      procurementMode: this.fb.group({}),
      replicationMode: this.fb.group({})
    });

    // Suscribirse a cambios en la validación
    this.productOfferForm.statusChanges.subscribe(status => {
      this.isFormValid = status === 'VALID';
    });
  }

  goToStep(index: number) {
    this.currentStep = index;
  }

  submitForm() {
    console.log(this.productOfferForm.value);
    this.createOffer();
  }

  async ngOnInit() {
    if (this.formType === 'update' && this.offer) {
      await this.loadOfferData();
      this.steps = [
        'General Info',
        'Product Specification',
        //'Catalogue',
        'Category',
        'License',
        'Price Plans',
        'Procurement Mode',
        'Replication & Visibility',
        'Summary'
      ];
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
      this.productOfferForm.patchValue({
        license: {
          treatment: this.offer.productOfferingTerm[0].name,
          description: this.offer.productOfferingTerm[0].description
        }
      });

      //PROCUREMENT
      this.offer.productOfferingTerm.forEach((term: any) => {
        if(term.name == 'procurement') {
          this.productOfferForm.patchValue({
            procurementMode: {
              treatment: term.name,
              description: term.description
            }
          });
        }
      })
    }

    // Price Plans
    if (Array.isArray(this.offer.productOfferingPrice) && this.offer.productOfferingPrice.length > 0) {
     for (let pop of this.offer.productOfferingPrice) {
      let relatedPrices:any[] = [];
       const pricePlan = await this.api.getOfferingPrice(pop.id);
       let priceInfo: any = {
        id: pricePlan.id,
        name: pricePlan.name,
        description: pricePlan.description,
        lifecycleStatus: pricePlan.lifecycleStatus,
        paymentOnline: pricePlan?.paymentOnline ?? !!pricePlan?.bundledPopRelationship,
        productProfile: this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []),     
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
      if(pricePlan?.price?.value){
        priceInfo.paymentOnline=true
        priceInfo.price=pricePlan?.price?.value
        relatedPrices.push({
          id:pricePlan.id,
          href:pricePlan.href,
          name:pricePlan.name,
          description:pricePlan?.description,
          priceType:pricePlan?.priceType,
          lastUpdate:pricePlan?.lastUpdate,
          lifecycleStatus:pricePlan?.lifecycleStatus,
          paymentOnline: true,
          selectedCharacteristic: pricePlan?.prodSpecCharValueUse || null,
          currency: pricePlan?.price?.unit || 'EUR',
          recurringPeriod: pricePlan?.recurringChargePeriodType || 'month',
          productProfile: this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []),
          price: pricePlan?.price?.value,
          validFor: pricePlan?.validFor || null,
          usageUnit: pricePlan.usageUnit
        })
        priceInfo.priceComponents=relatedPrices;
      }
      console.log('price components---')
      console.log(relatedPrices)
      if(pricePlan.bundledPopRelationship){  
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
    const priceComp: ProductOfferingPrice = {
      name: component.name,
      description: component.description,
      lifecycleStatus: component.lifecycleStatus,
      priceType: component.priceType,
      price: { unit: currency, value: component?.price },
      recurringChargePeriodType: undefined,
      recurringChargePeriodLength: undefined,
      unitOfMeasure: undefined,
      prodSpecCharValueUse: undefined
    };

    if (['recurring', 'recurring-prepaid'].includes(component.priceType)) {
      priceComp.recurringChargePeriodType = component.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (component.priceType === 'usage') {
      priceComp.unitOfMeasure = { amount: 1, units: component.usageUnit };
    }

    if (component.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.selectedCharacteristic;
    }

    if (component.unitOfMeasure) {
      priceComp.unitOfMeasure = component.usageUnit;
    }

    if (component.discountValue != null) {
      const discount = await this.createPriceAlteration(component, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }

    const created = await lastValueFrom(this.api.postOfferingPrice(priceComp));
    return { id: created.id, href: created.id, name: created.name };
  }

  private createBundledPricePlan(plan: any, compRel: any[]): ProductOfferingPrice {
    const price: ProductOfferingPrice = {
      name: plan.name,
      isBundle: true,
      description: plan.description,
      lifecycleStatus: plan.lifecycleStatus,
      bundledPopRelationship: compRel
    };

    if (plan.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }

    if (plan.usageUnit) {
      price.unitOfMeasure = plan.usageUnit;
    }

    return price;
  }

  private async createSinglePricePlan(plan: any, comp: any): Promise<ProductOfferingPrice> {
    const price: ProductOfferingPrice = {
      name: plan.name,
      isBundle: false,
      description: plan.description,
      lifecycleStatus: plan.status,
      priceType: comp?.priceType,
      price: comp?.price ? { value: comp.price, unit: plan.currency } : undefined,
      recurringChargePeriodType: undefined,
      recurringChargePeriodLength: undefined,
      unitOfMeasure: undefined,
      prodSpecCharValueUse: undefined
    };

    if (['recurring', 'recurring-prepaid'].includes(comp?.priceType)) {
      price.recurringChargePeriodType = comp.recurringPeriod;
      price.recurringChargePeriodLength = 1;
    }

    if (comp?.priceType === 'usage') {
      price.unitOfMeasure = { amount: 1, units: comp.usageUnit };
    }

    if (comp?.selectedCharacteristic) {
      price.prodSpecCharValueUse = comp.selectedCharacteristic;
    }

    if (plan.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }

    return price;
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
          description: formValue.procurementMode.id
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
}
