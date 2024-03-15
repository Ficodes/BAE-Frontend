import { Component, OnInit, ChangeDetectorRef, HostListener, AfterViewInit } from '@angular/core';
import {
  faCartShopping
} from "@fortawesome/sharp-solid-svg-icons";
import {EventMessageService} from "../../services/event-message.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { cartProduct, billingAccountCart, LoginInfo } from '../../models/interfaces';
import { TYPES } from 'src/app/models/types.const';
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import {LocalStorageService} from "../../services/local-storage.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrl: './shopping-cart.component.css'
})
export class ShoppingCartComponent implements OnInit, AfterViewInit{
  protected readonly faCartShopping = faCartShopping;
  public static BASE_URL: String = environment.BASE_URL;
  public static API_PORT: Number = environment.API_PORT;
  TAX_RATE: number = environment.TAX_RATE;
  items: cartProduct[] = [];
  totalPrice:any;
  showBackDrop:boolean=true;
  billing_accounts: billingAccountCart[] =[];
  selectedBilling:any;
  loading: boolean = false;
  relatedParty:string='';

  constructor(
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private account: AccountServiceService,
    private cartService: ShoppingCartServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private orderService: ProductOrderService,
    private router: Router) {

  }

  ngOnInit(): void {
    //initFlowbite();
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    this.relatedParty=aux.partyId;
    this.loading=true;
    this.showBackDrop=true;
    this.cartService.getShoppingCart().then(data => {
      console.log('---CARRITO API---')
      console.log(data)
      this.items=data;
      this.cdr.detectChanges();
      this.getTotalPrice();
      console.log('------------------')
      initFlowbite();
    })
    this.account.getBillingAccount().then(data => {
      for(let i=0; i< data.length;i++){
        let email =''
        let phone=''
        let address = {
          "city": '',
          "country": '',
          "postCode": '',
          "stateOrProvince": '',
          "street": ''
        }
        for(let j=0; j<data[i].contact[0].contactMedium.length;j++){
          if(data[i].contact[0].contactMedium[j].mediumType == 'Email'){
            email = data[i].contact[0].contactMedium[j].characteristic.emailAddress
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'PostalAddress'){
            address = {
              "city": data[i].contact[0].contactMedium[j].characteristic.city,
              "country": data[i].contact[0].contactMedium[j].characteristic.country,
              "postCode": data[i].contact[0].contactMedium[j].characteristic.postCode,
              "stateOrProvince": data[i].contact[0].contactMedium[j].characteristic.stateOrProvince,
              "street": data[i].contact[0].contactMedium[j].characteristic.street1
            }
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'TelephoneNumber'){
            phone = data[i].contact[0].contactMedium[j].characteristic.phoneNumber
          }
        }
        this.billing_accounts.push({
          "id": data[i].id,
          "href": data[i].href,
          "name": data[i].name,
          "email": email,
          "postalAddress": address,
          "telephoneNumber": phone,
          "selected": i==0 ? true : false
        })
        if(i==0){
          this.selectedBilling={
            "id": data[i].id,
            "href": data[i].href,
            "name": data[i].name,
            "email": email,
            "postalAddress": address,
            "telephoneNumber": phone,
            "selected": true
          }
        }
      }
      console.log('billing account...')
      console.log(this.billing_accounts)
      this.loading=false;
      this.cdr.detectChanges();
    })
    console.log('Elementos en el carrito....')
    console.log(this.items)
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  getPrice(item:any){
    return {
      'priceType': item.options.pricing.priceType,
      'price': item.options.pricing.price?.value,
      'unit': item.options.pricing.price?.unit,
      'text': item.options.pricing.priceType?.toLocaleLowerCase() == TYPES.PRICE.RECURRING ? item.options.pricing.recurringChargePeriodType : item.options.pricing.priceType?.toLocaleLowerCase() == TYPES.PRICE.USAGE ? '/ '+ item.options.pricing?.unitOfMeasure?.units : ''
    }
  }

  getTotalPrice(){
    this.totalPrice=[];
    let insertCheck = false;
    let priceInfo:any  ={};
    for(let i=0; i<this.items.length; i++){
      console.log('totalprice')
      console.log(this.items[i])
      insertCheck = false;
      if(this.totalPrice.length == 0){
        priceInfo = this.getPrice(this.items[i]);
        this.totalPrice.push(priceInfo);
        console.log('Añade primero')
      } else {
        for(let j=0; j<this.totalPrice.length; j++){
          priceInfo = this.getPrice(this.items[i]);
          if(priceInfo.priceType == this.totalPrice[j].priceType && priceInfo.unit == this.totalPrice[j].unit && priceInfo.text == this.totalPrice[j].text){
            this.totalPrice[j].price=this.totalPrice[j].price+priceInfo.price;
            insertCheck=true;
            console.log('suma')
          }
          console.log('precio segundo')
          console.log(priceInfo)
        }
        if(insertCheck==false){
          this.totalPrice.push(priceInfo);
          insertCheck=true;
          console.log('añade segundo')
        }
      }
    }
    console.log(this.totalPrice)
  }

  deleteProduct(product: cartProduct){
    this.cartService.removeItemShoppingCart(product.id).subscribe(() => console.log('deleted'));
    this.eventMessage.emitRemovedCartItem(product as cartProduct);
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  clickDropdown(id:any){
    let elem = document.getElementById(id)
    if(elem != null){
      if(elem.className.match('hidden') ) {
        this.removeClass(elem,"hidden")
      } else {
        this.addClass(elem,"hidden")
      }
    }
  }

  selectBill(idx:number){
    for(let i = 0; i<this.billing_accounts.length; i++){
      if(idx==i){
        this.billing_accounts[i].selected=true;
        this.selectedBilling=this.billing_accounts[i];
        this.cdr.detectChanges();
      } else {
        this.billing_accounts[i].selected=false;
        this.cdr.detectChanges();
      }
    }
    console.log('selecting bill')
    console.log(this.billing_accounts)
    this.cdr.detectChanges();
  }

  async orderProduct(){
    console.log('buying')
    console.log(moment().utc())
    let products = []
    for(let i = 0; i<this.items.length; i++){
      let char = [];
      let opChars = this.items[i].options.characteristics
      if(opChars != undefined){
        for(let j = 0; j< opChars.length; j++){
          char.push({
            "name": opChars[j].characteristic.name,
            "value": opChars[j].value?.value,
            "valueType": opChars[j].characteristic.valueType
          })
        }
      }

      products.push({
          "id": this.items[i].id,
          "action": "add",
          "state": "acknowledged",
          "productOffering": {
              "id": this.items[i].id,
              "href": this.items[i].id
          },
          "product": {
            "productCharacteristic": char,
            "productPrice": [
              {
                  "description": this.items[i].options.pricing?.description,
                  "name": this.items[i].options.pricing?.name,
                  "price": {
                      "taxIncludedAmount": {
                          "value": this.items[i].options.pricing?.price?.value,
                          "unit": this.items[i].options.pricing?.price?.unit
                      },
                      "taxRate": this.TAX_RATE
                  },
                  "priceType": this.items[i].options.pricing?.priceType,
                  "recurringChargePeriod": this.items[i].options.pricing?.recurringChargePeriodType != undefined ? this.items[i].options.pricing?.recurringChargePeriodType : '',
                  "unitOfMeasure": this.items[i].options.pricing?.unitOfMeasure != undefined ? this.items[i].options.pricing?.unitOfMeasure?.units : '',
                  "id": this.items[i].options.pricing?.id,
                  "productOfferingPrice": {
                      "id": this.items[i].options.pricing?.id,
                      "href": this.items[i].options.pricing?.href,
                  }
              }
            ]
        }
      })
    }
    let productOrder = {
      "state": "acknowledged",
      "productOrderItem": products,
      "relatedParty": [
        {
            "id": this.relatedParty,
            "href": this.relatedParty,
            "role": "Customer"
        }
      ],
      //priority??
      "priority": '4',
      "billingAccount": {
        "id": this.selectedBilling.id,
        "href": this.selectedBilling.id
      },
      "orderDate": moment().utc(),
      "notificationContact": this.selectedBilling.email,
    }
    await this.orderService.postProductOrder(productOrder).subscribe({
      next: data => {
          console.log(data)
          console.log('PROD ORDER DONE');
          this.cartService.emptyShoppingCart().subscribe({
            next: data => {
                console.log(data)
                console.log('EMPTY');
            },
            error: error => {
                console.error('There was an error while updating!', error);
            }
          });
          //window.location.href=`${ShoppingCartComponent.BASE_URL}:${ShoppingCartComponent.API_PORT}/#/inventory/product`;
          this.goToInventory();
      },
      error: error => {
          console.error('There was an error while updating!', error);
      }
    });
  }

  goToInventory() {
    this.router.navigate(['/product-inventory']);
  }
}
