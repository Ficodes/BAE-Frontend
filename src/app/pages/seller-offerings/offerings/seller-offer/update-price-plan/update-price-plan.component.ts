import { Component, OnInit, ChangeDetectorRef, HostListener, ElementRef, ViewChild, Input } from '@angular/core';
import { Router } from '@angular/router';
import {components} from "src/app/models/product-catalog";
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import {AttachmentServiceService} from "src/app/services/attachment-service.service";
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { currencies } from 'currencies.json';
import { certifications } from 'src/app/models/certification-standards.const';
import {ProductOfferingPrice_DTO} from 'src/app/models/interfaces';

@Component({
  selector: 'update-price-plan',
  templateUrl: './update-price-plan.component.html',
  styleUrl: './update-price-plan.component.css'
})
export class UpdatePricePlanComponent implements OnInit {

  //currencies=currencies;
  //Only allowing EUR for the moment
  currencies=[currencies[2]];
  partyId:any='';
  oneTimeSelected:boolean=true;
  recurringSelected:boolean=false;
  recurringPrepaidSelected:boolean=false;
  usageSelected:boolean=false;
  filteredCharacteristics:any[]=[];
  selectedCharacteristic:any=undefined;
  touchedCharCheck:boolean=false;
  selectedCharacteristicVal:any
  showValueSelect:boolean=false;
  isDiscount:boolean=false;
  isDomeManaged:boolean=false;
  priceForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    price: new FormControl('', ),
    description: new FormControl('')
  });
  priceComponentForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    price: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    recurring: new FormControl(''),
    recurringPeriod: new FormControl(''),
    unit: new FormControl(''),
  });
  discountForm = new FormGroup({
    amount: new FormControl('', [Validators.required,Validators.pattern(/^[0-9]+$/)]),
    percentage: new FormControl(''),
    duration: new FormControl('',[Validators.required]),
    period: new FormControl('',[Validators.required]),
  });
  priceDescription:string='';
  priceComponentDescription:string='';
  createdPriceComponents:any[]=[];
  createdPriceAlterations:any[]=[];
  createdPriceProfile:any=[];
  hideStringCharOption:boolean=true;
  showPriceComponents:boolean=false;
  discountSelected:boolean=false;

  selectedPriceUnit:any=currencies[2].code;

  //PRICEPROFILE
  showProfile:boolean=false;
  editProfile:boolean=false;
  editPrice:boolean=false;

  showPreview:boolean=false;
  showEmoji:boolean=false;

  @Input() selectedProdSpec: any | {id:''};
  @Input() priceToUpdate: ProductOfferingPrice_DTO | undefined;

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private prodSpecService: ProductSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private elementRef: ElementRef,
    private attachmentService: AttachmentServiceService,
    private servSpecService: ServiceSpecServiceService,
    private resSpecService: ResourceSpecServiceService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showEmoji = false;
      this.showPriceComponents = false;
      this.showProfile = false;
      this.cdr.detectChanges();
    }
  }


  ngOnInit() {
    this.initPartyInfo();
    this.checkPriceInfo();
  }

  checkPriceInfo(){
    for(let i=0;i<this.selectedProdSpec.productSpecCharacteristic.length;i++){
      if (!certifications.some(certification => certification.name === this.selectedProdSpec.productSpecCharacteristic[i].name)) {
        this.createdPriceProfile.push(this.selectedProdSpec.productSpecCharacteristic[i]);
        this.filteredCharacteristics.push(this.selectedProdSpec.productSpecCharacteristic[i]);
      }
    }
    if(this.priceToUpdate != undefined){
      console.log('--updating--')
      console.log(this.priceToUpdate)
      console.log('---------')
      if(this.priceToUpdate.name)
      this.priceForm.controls['name'].setValue(this.priceToUpdate.name);
      if(this.priceToUpdate.description)
      this.priceForm.controls['description'].setValue(this.priceToUpdate.description);
      if(this.priceToUpdate?.priceType=='custom'){
        this.isDomeManaged=false;
        this.priceToUpdate.isBundle=false;
      } else {
        this.isDomeManaged=true;
        if(this.priceToUpdate.isBundle==false){
          let pricecomponent:ProductOfferingPrice_DTO = {
            id: uuidv4(),
            name: this.priceToUpdate.name,
            description: this.priceToUpdate.description,
            price: {
              unit: this.priceToUpdate?.price?.unit,
              value: this.priceToUpdate?.price?.value
            },
            priceType:this.priceToUpdate?.priceType
          }

          if(this.priceToUpdate.price != undefined && this.priceToUpdate.price.unit != undefined){
            this.selectedPriceUnit=this.priceToUpdate.price.unit
          }
          if(this.priceToUpdate.prodSpecCharValueUse!=undefined){
            console.log('HAY INFO DE PERFIL')
            this.createdPriceProfile=this.priceToUpdate.prodSpecCharValueUse;
            this.editProfile=true;
            pricecomponent.prodSpecCharValueUse = this.priceToUpdate.prodSpecCharValueUse
          }
          if(this.priceToUpdate.recurringChargePeriodType){
            pricecomponent.recurringChargePeriodType=this.priceToUpdate.recurringChargePeriodType;
            pricecomponent.recurringChargePeriodLength=this.priceToUpdate.recurringChargePeriodLength;
          }
          if(this.priceToUpdate.unitOfMeasure){
            pricecomponent.unitOfMeasure=this.priceToUpdate.unitOfMeasure
          }
          if(this.priceToUpdate.popRelationship){
            pricecomponent.popRelationship=this.priceToUpdate.popRelationship;
          }
          this.createdPriceComponents.push(pricecomponent)
        } else {
          if(this.priceToUpdate.bundledPopRelationship){
            this.createdPriceComponents=this.priceToUpdate.bundledPopRelationship as any[];
            if(this.priceToUpdate.bundledPopRelationship[0].price != undefined && this.priceToUpdate.bundledPopRelationship[0].price.unit != undefined){
              this.selectedPriceUnit=this.priceToUpdate.bundledPopRelationship[0].price.unit;
            }
          }
          this.createdPriceProfile=this.priceToUpdate.prodSpecCharValueUse;
          if(this.priceToUpdate.prodSpecCharValueUse!=undefined){
            this.createdPriceProfile=this.priceToUpdate.prodSpecCharValueUse;
            this.editProfile=true;
          }
        }
        this.editPrice=true;
      }
      initFlowbite();
    }
  }

  showDrawerPriceComp(){
    this.isDiscount=false;
    this.oneTimeSelected=true;
    this.recurringSelected=false;
    this.recurringPrepaidSelected=false;
    this.usageSelected=false;

    this.showPriceComponents=!this.showPriceComponents;
    console.log(this.selectedProdSpec)
    console.log('drawer')
    initFlowbite()
  }

  createPriceComponent(){
    let pricecomponent:ProductOfferingPrice_DTO = {
      id: uuidv4(),
      name: this.priceComponentForm.value.name ? this.priceComponentForm.value.name : '',
      lifecycleStatus: "Active",
      description: this.priceComponentForm.value.description ? this.priceComponentForm.value.description : '',
      price: {
        unit: this.selectedPriceUnit,
        value: this.priceComponentForm.value.price ? parseInt(this.priceComponentForm.value.price) : 0
      },
      priceType: this.recurringSelected ? 'recurring' : this.usageSelected ? 'usage' : this.recurringPrepaidSelected ? 'recurring-prepaid' : 'one time'
    }
    if(this.selectedCharacteristic!=undefined){
      let charVal:any={value:this.selectedCharacteristicVal}
      //If its a range characteristic
      if('valueFrom' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
        pricecomponent.unitOfMeasure={
          amount:1,
          units:this.selectedCharacteristic.productSpecCharacteristicValue[0].unitOfMeasure
        }
        pricecomponent.prodSpecCharValueUse = [{
          id: this.selectedCharacteristic.id,
          name: this.selectedCharacteristic.name,
          productSpecCharacteristicValue: []
        }]
      //if not
      } else {
        const charIdx = this.selectedCharacteristic.productSpecCharacteristicValue.findIndex((item: { value: any; }) => (item.value).toString() === (this.selectedCharacteristicVal).toString());
        if(charIdx!=-1){
          if('unitOfMeasure' in this.selectedCharacteristic.productSpecCharacteristicValue[charIdx]){
            charVal={value:this.selectedCharacteristic.productSpecCharacteristicValue[charIdx].value,unitOfMeasure:this.selectedCharacteristic.productSpecCharacteristicValue[charIdx].unitOfMeasure}
          }else{
            charVal={value:this.selectedCharacteristic.productSpecCharacteristicValue[charIdx].value}
          }
        }
        pricecomponent.prodSpecCharValueUse = [{
          id: this.selectedCharacteristic.id,
          name: this.selectedCharacteristic.name,
          productSpecCharacteristicValue: [charVal]
        }]
      }
    }
    if(this.recurringSelected){
      console.log('recurring')
      if(this.priceComponentForm.value.recurring)
        pricecomponent.recurringChargePeriodLength=Number(this.priceComponentForm.value.recurring);
        if(this.priceComponentForm.value?.recurringPeriod)
        pricecomponent.recurringChargePeriodType=this.priceComponentForm.value.recurringPeriod;
    }
    if(this.recurringPrepaidSelected){
      console.log('recurring')
      if(this.priceComponentForm.value.recurring)
        pricecomponent.recurringChargePeriodLength=Number(this.priceComponentForm.value.recurring);
        if(this.priceComponentForm.value?.recurringPeriod)
        pricecomponent.recurringChargePeriodType=this.priceComponentForm.value.recurringPeriod;
    }
    if(this.usageSelected){
      console.log('usage')
      if(this.priceComponentForm.value.unit)
      pricecomponent.unitOfMeasure= {
        amount: 1,
        units: this.priceComponentForm.value.unit
      }
    }
    if(this.isDiscount && this.discountForm.value.amount && this.discountForm.value.duration && this.discountForm.value.period){
      let discount:ProductOfferingPrice_DTO = {
        id: uuidv4(),
        name: 'discount',
        priceType: 'discount',
        percentage: this.discountSelected ? parseFloat(this.discountForm.value.amount) : 0,
        validFor: {
          startDateTime: moment().toISOString(),
          endDateTime:  this.addToISOString(Number(this.discountForm.value.duration),this.discountForm.value.period)
        },
      };
      this.createdPriceAlterations.push(discount);
      pricecomponent['popRelationship'] = [{
        id: discount.id,
        name: discount.name
      }]
    }
    this.createdPriceComponents.push(pricecomponent)
    this.showPriceComponents=!this.showPriceComponents;
    this.priceComponentForm.reset();
    if(this.selectedCharacteristic!=undefined){
      this.touchedCharCheck=true;
    }
    this.selectedCharacteristic=undefined;
    this.showValueSelect=false;
    this.discountForm.reset();
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

  changePriceProfileCharValue(char:any,event:any){
    const index = this.createdPriceProfile.findIndex((item: { id: any; }) => item.id === char.id);
    const innerIndex = this.createdPriceProfile[index].productSpecCharacteristicValue.findIndex((item: { value: any; }) => (item.value).toString() === (event.target.value).toString());
    console.log(innerIndex)
    for(let i=0;i<this.createdPriceProfile[index].productSpecCharacteristicValue.length;i++){
      if(i==innerIndex){
        this.createdPriceProfile[index].productSpecCharacteristicValue[i].isDefault=true;
      } else {
        this.createdPriceProfile[index].productSpecCharacteristicValue[i].isDefault=false;
      }
    }
    console.log(this.createdPriceProfile)
  }

  changeRangeProfileValue(char:any,event:any){
    const index = this.createdPriceProfile.findIndex((item: { id: any; }) => item.id === char.id);
    //Set range value
    this.createdPriceProfile[index].productSpecCharacteristicValue[0].value=Number(event.target.value);
    console.log(this.createdPriceProfile[index])
  }

  cancelPriceComponent(){
    this.showPriceComponents=!this.showPriceComponents;
    this.priceComponentForm.reset();
    this.selectedCharacteristic=undefined;
    this.showValueSelect=false;
    this.discountForm.reset();
  }

  createPriceProfile(){
    this.showProfile=!this.showProfile;
    if(this.editProfile==false){
      this.editProfile=true;
    }
    console.log('saved price profile')
    console.log(this.createdPriceProfile)
  }

  cancelPriceProfile(){
    this.showProfile=!this.showProfile;
    this.createdPriceProfile=[];
    for(let i=0;i<this.selectedProdSpec.productSpecCharacteristic.length;i++){
      if (!certifications.some(certification => certification.name === this.selectedProdSpec.productSpecCharacteristic[i].name)) {
        this.createdPriceProfile.push(this.selectedProdSpec.productSpecCharacteristic[i])
      }
    }
  }

  deletePriceComp(price:any){
    const index = this.createdPriceComponents.findIndex(item => item.id === price.id);
    if (index !== -1) {
      console.log('eliminar')
      this.createdPriceComponents.splice(index, 1);
    }
    if(this.createdPriceComponents.length==0){
      this.touchedCharCheck=false;
    } else {
      this.touchedCharCheck=false;
      for(let i=0;i<this.createdPriceComponents.length;i++){
        if('prodSpecCharValueUse' in this.createdPriceComponents[i]){
          this.touchedCharCheck=true;
        }
      }
    }
    this.cdr.detectChanges();
  }

  editPriceComp(price:any){
    this.showPriceComponents=!this.showPriceComponents;
    this.cdr.detectChanges();
    console.log('editing price...')
    console.log(price)
    if(price.name)
      this.priceComponentForm.controls['name'].setValue(price.name);
    if(price.description)
      this.priceComponentForm.controls['description'].setValue(price.description);
  }

  showDrawerProfile(){
    this.showProfile=!this.showProfile;
    if(!this.editProfile){
      console.log('create')
      this.createdPriceProfile=[];
      for(let i=0;i<this.selectedProdSpec.productSpecCharacteristic.length;i++){
        if (!certifications.some(certification => certification.name === this.selectedProdSpec.productSpecCharacteristic[i].name)) {
          this.createdPriceProfile.push(this.selectedProdSpec.productSpecCharacteristic[i])
        }
      }
    }
    console.log('-----')
    console.log(this.createdPriceProfile)
    console.log('drawer')
    initFlowbite()
  }

  hasKey(obj: any, key: string): boolean {
    return obj?.hasOwnProperty(key);
  }

  changePriceComponentChar(event: any){
    if(event.target.value==''){
      this.showValueSelect=false;
    } else {
      this.selectedCharacteristic = this.selectedProdSpec.productSpecCharacteristic.find(
        (char: { id: any; }) => char.id === event.target.value
      );
      this.cdr.detectChanges();
      console.log('selected char')
      console.log(this.selectedCharacteristic)
      console.log('-----change select')
      console.log(this.selectedCharacteristic.productSpecCharacteristicValue)
      if('valueFrom' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
        this.showValueSelect=false;
      } else if('unitOfMeasure' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
        this.selectedCharacteristicVal=this.selectedCharacteristic.productSpecCharacteristicValue[0].value;
        this.showValueSelect=true;
      } else {
        this.selectedCharacteristicVal=this.selectedCharacteristic.productSpecCharacteristicValue[0].value;
        this.showValueSelect=true;
        this.hideStringCharOption=false;
      }
    }
    initFlowbite();
  }

  changePriceComponentCharValue(event: any){
    this.selectedCharacteristicVal=event.target.value;
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  savePrice(){
    if(this.priceToUpdate){
      if(this.priceForm.value.name){
        let updatingPrice: ProductOfferingPrice_DTO = {
          id: this.priceToUpdate.id,
          name: this.priceForm.value.name,
          description: this.priceForm.value.description ? this.priceForm.value.description : '',
          lifecycleStatus: "Active",
          isBundle: true ? this.createdPriceComponents.length > 1 : false
        }
        if(this.isDomeManaged){
          if(this.createdPriceComponents.length>1){
            for(let i=0;i<this.createdPriceComponents.length;i++){
              this.createdPriceComponents[i].price.unit=this.selectedPriceUnit;
            }
             updatingPrice.bundledPopRelationship=this.createdPriceComponents;
          } else {
            updatingPrice.priceType = this.createdPriceComponents[0].priceType
            updatingPrice.price = this.createdPriceComponents[0].price
            if(this.createdPriceComponents[0].priceType=='recurring'){
              updatingPrice.recurringChargePeriodType=this.createdPriceComponents[0].recurringChargePeriodType;
              updatingPrice.recurringChargePeriodLength=this.createdPriceComponents[0].recurringChargePeriodLength;
            }
            if(this.createdPriceComponents[0].priceType=='recurring-prepaid'){
              updatingPrice.recurringChargePeriodType=this.createdPriceComponents[0].recurringChargePeriodType;
              updatingPrice.recurringChargePeriodLength=this.createdPriceComponents[0].recurringChargePeriodLength;
            }
            if(this.createdPriceComponents[0].priceType=='usage'){
              updatingPrice.unitOfMeasure=this.createdPriceComponents[0].unitOfMeasure
            }
          }
          if(this.createdPriceProfile){
            //referenia al comp profile
            updatingPrice.prodSpecCharValueUse=this.createdPriceProfile;
          }
          for(let i=0;i<this.createdPriceComponents.length;i++){
            this.createdPriceComponents[i].price.unit=this.selectedPriceUnit;
          }
          this.createdPriceComponents=[];
          this.createdPriceAlterations=[];
        } else {
          updatingPrice.priceType='custom';
        }
        console.log(updatingPrice)
        this.eventMessage.emitUpdatePricePlan(updatingPrice);
      }
      this.editPrice=!this.editPrice;
    }
    this.clearPriceFormInfo();
  }

  clearPriceFormInfo(){
    console.log('clear')
    this.oneTimeSelected=true;
    this.selectedPriceUnit=currencies[2].code;

    this.usageSelected=false;
    this.recurringSelected=false;
    this.recurringPrepaidSelected=false;

    this.priceForm.reset();
    this.priceForm.controls['name'].setValue('');
    this.priceForm.controls['price'].setValue('');
    this.priceForm.controls['description'].setValue('');
    // Explicitly mark all controls as pristine and untouched
    Object.keys(this.priceForm.controls).forEach(key => {
      this.priceForm.get(key)?.markAsPristine();
      this.priceForm.get(key)?.markAsUntouched();
      this.priceForm.get(key)?.updateValueAndValidity();
    });
  }

  onPriceUnitChange(event:any){
    this.selectedPriceUnit=event.target.value;
  }

  onPriceTypeSelected(event: any){
    if(event.target.value=='ONE TIME'){
      this.oneTimeSelected=true;
      this.recurringSelected=false;
      this.recurringPrepaidSelected=false;
      this.usageSelected=false;
    } else if (event.target.value=='RECURRING'){
      this.oneTimeSelected=false;
      this.recurringSelected=true;
      this.recurringPrepaidSelected=false;
      this.usageSelected=false;
    } else if (event.target.value=='USAGE'){
      this.oneTimeSelected=false;
      this.recurringSelected=false;
      this.recurringPrepaidSelected=false;
      this.usageSelected=true;
    } else if (event.target.value=='CUSTOM'){
      this.oneTimeSelected=false;
      this.recurringSelected=false;
      this.recurringPrepaidSelected=false;
      this.usageSelected=false;
    } else if (event.target.value=='RECURRINGPREPAID'){
      this.oneTimeSelected=false;
      this.recurringSelected=false;
      this.recurringPrepaidSelected=true;
      this.usageSelected=false;
    }
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  unselectMenu(elem:HTMLElement | null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        this.removeClass(elem,cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectMenu(elem:HTMLElement| null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        console.log('already selected')
      } else {
        this.addClass(elem,cls)
      }
    }
  }

  //Markdown actions:
  addBold() {
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + ' **bold text** '
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + ' **bold text** '
      });
    }
  }

  addItalic() {
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + ' _italicized text_ '
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + ' _italicized text_ '
      });
    }
  }

  addList(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + '\n- First item\n- Second item'
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + '\n- First item\n- Second item'
      });
    }
  }

  addOrderedList(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + '\n1. First item\n2. Second item'
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + '\n1. First item\n2. Second item'
      });
    }
  }

  addCode(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + '\n`code`'
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + '\n`code`'
      });
    }
  }

  addCodeBlock(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + '\n```\ncode\n```'
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + '\n```\ncode\n```'
      });
    }
  }

  addBlockquote(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + '\n> blockquote'
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + '\n> blockquote'
      });
    }
  }

  addLink(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + ' [title](https://www.example.com) '
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + ' [title](https://www.example.com) '
      });
    }
  }

  addTable(){
    if(this.showPriceComponents){
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
      });
    }
  }

  addEmoji(event:any){
    if(this.showPriceComponents){
      this.showEmoji=false;
      const currentText = this.priceComponentForm.value.description;
      this.priceComponentForm.patchValue({
        description: currentText + event.emoji.native
      });
    } else {
      const currentText = this.priceForm.value.description;
      this.priceForm.patchValue({
        description: currentText + event.emoji.native
      });
    }
  }


  togglePreview(){
    if(this.showPriceComponents){
      if(this.priceComponentForm.value.description){
        this.priceComponentDescription=this.priceComponentForm.value.description;
      } else {
        this.priceComponentDescription=''
      }
    } else {
      if(this.priceForm.value.description){
        this.priceDescription=this.priceForm.value.description;
      } else {
        this.priceDescription=''
      }
    }
  }

  changeDomeManaged(){
    this.isDomeManaged=!this.isDomeManaged;
    initFlowbite();
  }

}

