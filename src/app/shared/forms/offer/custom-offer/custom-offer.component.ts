import {Component, Input, OnInit, OnDestroy} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslateModule} from "@ngx-translate/core";
import {ProdSpecComponent} from "../prod-spec/prod-spec.component";
import {NgClass, NgIf} from "@angular/common";
import {ApiServiceService} from "../../../../services/product-service.service";
import {PricePlansComponent} from "../price-plans/price-plans.component";
import {ProcurementModeComponent} from "../procurement-mode/procurement-mode.component"
import {RelatedPartyIdComponent} from "../related-party-id/related-party-id.component"
import {OfferSummaryComponent} from "../offer-summary/offer-summary.component"
import { lastValueFrom } from 'rxjs';
import {components} from "src/app/models/product-catalog";
import {EventMessageService} from "src/app/services/event-message.service";
import {FormChangeState, PricePlanChangeState} from "../../../../models/interfaces";
import {Subscription} from "rxjs";
import * as moment from 'moment';

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]

@Component({
  selector: 'app-custom-offer',
  standalone: true,
  imports: [
    TranslateModule,
    ProdSpecComponent,
    ReactiveFormsModule,
    PricePlansComponent,
    ProcurementModeComponent,
    OfferSummaryComponent,
    RelatedPartyIdComponent,
    NgClass],
  templateUrl: './custom-offer.component.html',
  styleUrl: './custom-offer.component.css'
})
export class CustomOfferComponent implements OnInit {
  @Input() offer: any = {};
  @Input() partyId: any;

  productOfferForm: FormGroup;
  currentStep = 0;
  highestStep = 0;
  steps = [
    'Party Info',
    'Price Plans',
    'Procurement Mode',
    'Summary'
  ];
  isFormValid = false;
  pricePlans:any = [];
  errorMessage:any='';
  showError:boolean=false;
  loading:boolean=false;
  loadingData:boolean=false;
  bundleChecked:boolean=false;
  offersBundle:any[]=[];


  offerToCreate:ProductOffering_Create | undefined;


  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder) {

      this.productOfferForm = this.fb.group({
        prodSpec: new FormControl(null, [Validators.required]),
        partyInfo: new FormControl(null, [Validators.required]),
        pricePlans: new FormControl([]),
        procurementMode: this.fb.group({})
      });

    }

    async ngOnInit() {
      console.log('--------- OFFER DATA ----------')
      console.log(this.offer)
      console.log('-------------------------------')
      await this.loadOfferData();
      this.loadingData=false;  
    }

    async loadOfferData() {
      console.log('Loading offer into form...', this.offer);
  
      if(this.offer.productOfferingTerm){
        console.log('Found productOfferingTerm:', this.offer.productOfferingTerm);
  
        //PROCUREMENT
        const procurementTerm = this.offer.productOfferingTerm.find(
          (element: { name: string; }) => element.name === 'procurement'
        );
        if(procurementTerm){
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
      }

      // Product Specification
      if (this.offer.productSpecification) {
        await this.api.getProductSpecification(this.offer.productSpecification.id).then(async data => {
          this.productOfferForm.patchValue({
            prodSpec: data || null // Cargar si existe, o dejar en null
          });
        })
      }
  
    }

    async createOffer() {
      this.loading=true;
      const plans = this.productOfferForm.value.pricePlans;

      console.log('---- party info value ----')
      console.log(this.productOfferForm.get('partyInfo')?.value)
      console.log('---- full form value ----')
      console.log(this.productOfferForm.value)
  
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
  
      const prices = formValue.pricePlans.map((plan: any) => ({
        id: plan.id,
        href: plan.id
      }));

      const license = this.offer.productOfferingTerm.find((t: { name: string; }) => t.name === 'License');
  
      const offer: any = {
        name: this.offer.name,
        description: this.offer?.description || '',
        lifecycleStatus: 'Active',
        isBundle: this.bundleChecked,
        bundledProductOffering: this.offersBundle,
        place: [],
        version: this.offer.version,
        category: this.offer.category,
        productOfferingPrice: prices,
        validFor: {
          startDateTime: new Date().toISOString()
        },
        relatedParty: [
          {
            "role": "Buyer",
            "name": this.productOfferForm.get('partyInfo')?.value.username,
            "href": this.productOfferForm.get('partyInfo')?.value.id,
            "id": this.productOfferForm.get('partyInfo')?.value.id
          }
        ],
        productOfferingTerm: [
          {
            name: 'License',
            description: license?.description || ''
          },
          {
            name: 'procurement',
            description: formValue.procurementMode.mode
          }
        ]
      };
  
      if (!this.bundleChecked) {
        offer.productSpecification = this.offer.productSpecification;
      }
  
      this.offerToCreate = offer;
      console.log('---- Offer to create -----')
      console.log(this.offerToCreate)
  
      const request$ = this.api.postProductOffering(offer, formValue.catalogue.id)
  
      request$.subscribe({
        next: (data) => {
          console.log('product offer created:');
          console.log(data);
          this.loading=false;
          this.goBack();
        },
        error: (error) => {
          console.error('Error during offer save/update:', error);
          this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while saving the offer!';
          this.loading=false;
          this.showError = true;
          setTimeout(() => (this.showError = false), 3000);
        }
      });
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

    private createBundledPricePlan(plan: any, compRel: any[]): ProductOfferingPrice {
      const price: ProductOfferingPrice = {
        name: plan.name ?? plan?.newValue?.name,
        isBundle: true,
        description: plan.description ?? plan?.newValue?.description,
        lifecycleStatus: plan.lifecycleStatus ?? plan?.newValue?.lifecycleStatus,
        bundledPopRelationship: compRel
      };
  
      if(plan?.priceType){
        if(plan?.priceType == 'custom'){
          price.priceType='custom'
        }
      }
  
      if (plan.prodSpecCharValueUse) {
        price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
          ...item,
          productSpecCharacteristicValue: item.productSpecCharacteristicValue
            .filter((v: any) => v.isDefault)
        }));
      }
      
  
  
      if(plan?.newValue?.prodSpecCharValueUse){
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
  
      if(plan?.newValue?.usageUnit){
        price.unitOfMeasure = plan?.newValue?.usageUnit;
      }
  
      return price;
    }

    goToStep(index: number) {
        // Validar el paso actual
        console.log('click go to step')        
        const currentStepValid = this.validateCurrentStep();
        console.log(!currentStepValid)
        if (!currentStepValid) {
          return; // No permitir avanzar si el paso actual no es válido
        }
        this.currentStep = index;
        if(this.currentStep>this.highestStep){
          this.highestStep=this.currentStep
        }
    }

    goBack() {
      this.eventMessage.emitSellerOffer(true);
    }

    private handleApiError(error: any): void {
      console.error('Error while creating offer price!', error);
      this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'Error creating offer price!';
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
    }
  
    validateCurrentStep(): boolean {
      console.log('-length------')
      console.log(this.productOfferForm.get('pricePlans')?.value.length)
      switch (this.currentStep) {
        case 0: // General Info
          return true;
        case 1: // Price Plans
          return this.productOfferForm.get('pricePlans')?.value.length == 0 ? false : true;
        case 2: // Procurement Mode
          return this.productOfferForm.get('procurementMode')?.valid || false;
        default:
          return true;
      }
    }
  
    canNavigate(index: number) {
      return (this.productOfferForm.get('partyInfo')?.valid &&  (index <= this.currentStep)) || (this.productOfferForm.get('partyInfo')?.valid &&  (index <= this.highestStep));
    }  
  
    handleStepClick(index: number): void {
      if (this.canNavigate(index)) {
        this.goToStep(index);
      }
    }

}
