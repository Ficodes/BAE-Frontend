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

//type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
//type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]

@Component({
  selector: 'new-price-plan',
  templateUrl: './new-price-plan.component.html',
  styleUrl: './new-price-plan.component.css'
})
export class NewPricePlanComponent implements OnInit {

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
    recurringPeriod: new FormControl(''),
    recurring: new FormControl(''),
    unit: new FormControl(''),
  });
  discountForm = new FormGroup({
    amount: new FormControl('', [Validators.required,Validators.pattern("^[0-9]*$")]),
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
  //@Input() priceToUpdate: ProductOfferingPrice_DTO | undefined;

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

  @HostListener('document:click')
  onClick() {
    if(this.showEmoji==true){
      this.showEmoji=false;
      this.cdr.detectChanges();
    }
    if(this.showPriceComponents==true){
      this.showPriceComponents=false;
      this.cdr.detectChanges();
    }
    if(this.showProfile==true){
      this.showProfile=false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {    
    console.log('selected----')
    console.log(this.selectedProdSpec)
    this.initPartyInfo();
    this.checkPriceInfo();
    setTimeout(() => {        
      initFlowbite();   
    }, 100);
  }

  checkPriceInfo(){
    for(let i=0;i<this.selectedProdSpec.productSpecCharacteristic.length;i++){
      if (!certifications.some(certification => certification.name === this.selectedProdSpec.productSpecCharacteristic[i].name)) {
        this.createdPriceProfile.push(this.selectedProdSpec.productSpecCharacteristic[i]);
        this.filteredCharacteristics.push(this.selectedProdSpec.productSpecCharacteristic[i]);
      }
    }
      this.editPrice=false;
      this.touchedCharCheck=false;
      this.selectedCharacteristic=undefined;
      this.selectedCharacteristicVal=undefined;
      this.createdPriceAlterations=[];
      this.createdPriceComponents=[];
      this.createdPriceProfile=[];
      initFlowbite();
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
      console.log(this.selectedCharacteristic)          
      //If its a range characteristic
      if('valueFrom' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
        console.log('---- RANGO -----')
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
        let charVal:any={value:this.selectedCharacteristicVal}        
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
      console.log('recurringPrepaid')
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
        validFor: {
          startDateTime: moment().toISOString(),
          endDateTime: this.addToISOString(Number(this.discountForm.value.duration),this.discountForm.value.period)
        },
      };
      if(this.discountSelected){
        discount.percentage = parseFloat(this.discountForm.value.amount)
      } else {
        discount.price = {
          unit: this.selectedPriceUnit,
          value: parseFloat(this.discountForm.value.amount)
        }
      }
      pricecomponent['popRelationship'] = [discount];
    }
    this.createdPriceComponents.push(pricecomponent)
    console.log('---PRICECOMP')
    console.log(this.createdPriceComponents)
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
    initFlowbite();
  }

  savePrice(){
      if(this.priceForm.value.name){
        let priceToCreate: ProductOfferingPrice_DTO = {
          id: uuidv4(),
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
            priceToCreate.bundledPopRelationship=this.createdPriceComponents;
          } else {
            priceToCreate.priceType = this.createdPriceComponents[0].priceType
            priceToCreate.price = this.createdPriceComponents[0].price
            if(this.createdPriceComponents[0].priceType=='recurring'){
              priceToCreate.recurringChargePeriodType=this.createdPriceComponents[0].recurringChargePeriodType;
              priceToCreate.recurringChargePeriodLength=this.createdPriceComponents[0].recurringChargePeriodLength;
            }
            if(this.createdPriceComponents[0].priceType=='recurring-prepaid'){
              priceToCreate.recurringChargePeriodType=this.createdPriceComponents[0].recurringChargePeriodType;
              priceToCreate.recurringChargePeriodLength=this.createdPriceComponents[0].recurringChargePeriodLength;
            }
            if(this.createdPriceComponents[0].priceType=='usage'){
                priceToCreate.unitOfMeasure=this.createdPriceComponents[0].unitOfMeasure
            }
          }
          if(this.editProfile){
            priceToCreate.prodSpecCharValueUse=this.createdPriceProfile;
            this.editProfile=false;
          }
          for(let i=0;i<this.createdPriceComponents.length;i++){
            this.createdPriceComponents[i].price.unit=this.selectedPriceUnit;
          }          
          this.createdPriceComponents=[];
          this.createdPriceAlterations=[];
          initFlowbite();
        } else {
          priceToCreate.priceType='custom';
          initFlowbite();
        }
        this.eventMessage.emitSavePricePlan(priceToCreate);
        console.log(priceToCreate);
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
