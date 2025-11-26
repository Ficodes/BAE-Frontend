import {ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {firstValueFrom, lastValueFrom} from 'rxjs';
import {TranslateModule} from "@ngx-translate/core";
import {LocalStorageService} from "../../services/local-storage.service";
import {EventMessageService} from "../../services/event-message.service";
import {PriceServiceService} from "../../services/price-service.service";
import {ShoppingCartServiceService} from "../../services/shopping-cart-service.service";
import {ApiServiceService} from "../../services/product-service.service";
import {ActivatedRoute, Router} from "@angular/router";
import {billingAccountCart, cartProduct, LoginInfo} from "../../models/interfaces";
import {faCartShopping} from "@fortawesome/sharp-solid-svg-icons";
import {environment} from "../../../environments/environment";
import {TYPES} from "../../models/types.const";
import {AccountServiceService} from "../../services/account-service.service";
import {NumberFormatStyle} from "@angular/common";
import * as moment from "moment/moment";
import {ProductOrderService} from "../../services/product-order-service.service";
import {BillingAddressComponent} from "./billing-address/billing-address.component";
import {BillingAccountFormComponent} from "../../shared/billing-account-form/billing-account-form.component";
import { PaymentService } from 'src/app/services/payment.service';
import { v4 as uuidv4 } from 'uuid';
import { data } from 'jquery';


@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  protected readonly faCartShopping = faCartShopping;
  public static BASE_URL: String = environment.BASE_URL;
  PURCHASE_ENABLED: boolean = environment.PURCHASE_ENABLED;
  TAX_RATE: number = environment.TAX_RATE;
  items: any[] = [];
  totalPrice: any;
  showBackDrop: boolean = true;
  billingAddresses: billingAccountCart[] = [];
  selectedBillingAddress: any;
  loading: boolean = false;
  loading_baddrs: boolean = false;
  addBill: boolean = false;
  relatedParty: string = '';
  contact = {email: '', username: ''};
  formatter: any;
  preferred: boolean = false;
  loading_purchase: boolean = false;
  check_custom: boolean = false;
  validBillAddr: boolean = true;
  errorMessage: any = '';
  showError: boolean = false;
  providerId:any = null;
  loadingItems:boolean=false;
  orderNote: string = '';

  constructor(
    private localStorage: LocalStorageService,
    private account: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private priceService: PriceServiceService,
    private cartService: ShoppingCartServiceService,
    private paymentService: PaymentService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute) {
    // Bind the method to preserve context
    this.orderProduct = this.orderProduct.bind(this);
    this.eventMessage.messages$.subscribe(async ev => {
      if (ev.type === 'BillAccChanged') {
        this.getBilling();
      }
      if (ev.value == true) {
        this.addBill = false;
      }
      if (ev.type === 'ChangedSession') {
        console.log('changing session...')
        await this.initCheckoutData();
      }
      if(ev.type === 'AddedCartItem') {
        this.loadingItems=true;
        console.log('Elemento añadido')
        this.cartService.getShoppingCart().then(async data => {
          console.log('---CARRITO API---')
          console.log(data)
          this.items=data;
          if(this.providerId){
            await this.getProviderInfo();
            this.groupItemsByOwner(this.providerId);
          }
          this.cdr.detectChanges();
          this.getTotalPrice();
          this.loadingItems=false;
          console.log('------------------')
        })
      }
      if(ev.type === 'RemovedCartItem') {
        this.loadingItems=true;
        this.cartService.getShoppingCart().then(async data => {
          console.log('---CARRITO API---')
          console.log(data)
          this.items=data;
          if(this.providerId){
            await this.getProviderInfo();
            this.groupItemsByOwner(this.providerId);
          }
          this.cdr.detectChanges();
          this.getTotalPrice();
          this.loadingItems=false;
          console.log('------------------')
        })
      }
    })
  }

  @HostListener('document:click')
  onClick() {
    if (this.addBill == true) {
      this.addBill = false;
      this.cdr.detectChanges();
    }
  }

  hasKey(obj: any, key: string): boolean {
    return key in obj;
  }

  getPrice(item: any) {
    if (item.options.pricing != undefined) {
      if (item.options.pricing.priceType == 'custom') {
        this.check_custom = true;
        return null
      } else {
        return {
          'priceType': item.options.pricing.priceType,
          'price': item.options.pricing.price?.value,
          'unit': item.options.pricing.price?.unit,
          'text': item.options.pricing.priceType?.toLocaleLowerCase() == TYPES.PRICE.RECURRING ? item.options.pricing.recurringChargePeriodType : item.options.pricing.priceType?.toLocaleLowerCase() == TYPES.PRICE.USAGE ? '/ ' + item.options.pricing?.unitOfMeasure?.units : ''
        }
      }
    } else {
      return null
    }
  }

  getTotalPrice() {
    this.totalPrice = [];
    let insertCheck = false;
    this.check_custom = false;
    this.cdr.detectChanges();
    let priceInfo: any = {};
    for (let i = 0; i < this.items.length; i++) {
      console.log('totalprice')
      console.log(this.items[i])
      insertCheck = false;
      if (this.totalPrice.length == 0) {
        priceInfo = this.getPrice(this.items[i]);
        if (priceInfo != null) {
          this.totalPrice.push(priceInfo);
          console.log('Añade primero')
        }
      } else {
        for (let j = 0; j < this.totalPrice.length; j++) {
          priceInfo = this.getPrice(this.items[i]);
          if (priceInfo != null) {
            if (priceInfo.priceType == this.totalPrice[j].priceType && priceInfo.unit == this.totalPrice[j].unit && priceInfo.text == this.totalPrice[j].text) {
              this.totalPrice[j].price = this.totalPrice[j].price + priceInfo.price;
              insertCheck = true;
              console.log('suma')
            }
            console.log('precio segundo')
            console.log(priceInfo)
          }
        }
        if (insertCheck == false && priceInfo != null) {
          this.totalPrice.push(priceInfo);
          insertCheck = true;
          console.log('añade segundo')
        }
      }
    }
    console.log(this.totalPrice)
  }

  goToInventory() {
    //this.router.navigate(['/product-inventory']);
    this.router.navigate(['/product-orders']);
  }

  async orderProduct() {
    console.log('buying');
    console.log(moment().utc());

    this.loading_purchase = true;

    const products = this.items
      .filter(item => item.options.pricing)
      .map(item => this.createProductPayload(item));

    console.log('Productos creados:', products);

    try {
      const productOrder = this.createProductOrder(products);
      console.log('--- order ---');
      console.log(productOrder);

      const response = await firstValueFrom(this.orderService.postProductOrder(productOrder));
      const redirectUrl = response.headers.get('X-Redirect-URL');

      console.log(response.headers)
      console.log(redirectUrl);
      console.log('PROD ORDER DONE');

      if (redirectUrl) {
        console.log('redirectURL')
        // Going to the payment gateway
        window.location.href = redirectUrl;
      } else {
        console.log('non-redirectURL')
        // we clear the shopping cart only if no redirection is applied
        await this.emptyShoppingCart();
        this.goToInventory();
      }
    } catch (error) {
      this.handleError(error, 'There was an error during purchase!');
    } finally {
      this.loading_purchase = false;
      this.cdr.detectChanges();
    }
  }

  private createProductPayload(item: any) {
    let itemTotalPrice: any = [];
    if (item.options.pricing.length > 0) {
      itemTotalPrice = [{
        productOfferingPrice: {
          id: item.options.pricing[0].id,
          href: item.options.pricing[0].id
        }
      }]
    }

    return {
      id: item.id,
      action: 'add',
      productOffering: {
        id: item.id,
        href: item.id
      },
      itemTotalPrice: itemTotalPrice,
      product: {
        productCharacteristic: item.options.characteristics
      }
    };
  }

  private createProductOrder(products: any[]) {

      let po:any = {
        productOrderItem: products,
        relatedParty: [
          {
            id: this.relatedParty,
            href: this.relatedParty,
            role: 'Customer'
          }
        ],
        priority: '4',
        billingAccount: {
          id: this.selectedBillingAddress.id,
          href: this.selectedBillingAddress.id
        },
        notificationContact: this.selectedBillingAddress.email
      };

      if(this.orderNote!=''){
        const newNote = {
          text: this.orderNote,
          id: `urn:ngsi-ld:note:${uuidv4()}`,
          author: this.relatedParty,
          date: new Date().toISOString()
        };
        po['note']=[newNote]
      }

    return po
  }

  private async emptyShoppingCart() {
    try {
      const response = await this.cartService.emptyShoppingCart();
      console.log(response);
      console.log('EMPTY');
    } catch (error) {
      this.handleError(error, 'There was an error while emptying the cart!');
    }
  }

  private handleError(error: any, defaultMessage: string) {
    console.error(defaultMessage, error);
    this.errorMessage = error?.error?.error
      ? `Error: ${error.error.error}`
      : defaultMessage;
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }


  ngOnInit(): void {
    this.loadingItems=true;
    this.formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',

      // These options are needed to round to whole numbers if that's what you want.
      //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
      //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });

    // Method 1: Get query params once
    console.log('--- Query Params ---');
    console.log(this.route.snapshot.queryParams);

    // Check if we are comming from a purchase
    const qParams:any = this.route.snapshot.queryParams;
    if (qParams.client && qParams.action && qParams.ref) {
      // All the payment basic params are here

      let params = {...qParams}
      // They are adding the jwt incorrect within the ref, so check for it
      if (params.ref.includes('?jwt')) {
        let ref = params.ref.split('?jwt');
        params.ref = ref[0];
        params.jwt = ref[1];
      }

      this.loading_purchase = true;
      firstValueFrom(this.paymentService.completePayment(params)).then((response) => {
        this.loading_purchase = false;

        console.log('--- Payment Response ---')
        console.log(response)

        if (qParams.action == 'accept' && response.status == 200) {
          // Success request
          this.emptyShoppingCart().then(() => this.goToInventory());
          // Redirect to the inventory page
        } else {
          // Call the cancel endpoint
          // We had an error, so we reload the checkout page
          this.initCheckoutData();
        }  
      }).catch((error) => {
        this.loading_purchase = true;
        console.log('--- Payment Error ---')
        console.log(error)
        this.initCheckoutData();
      });

    } else {
      this.initCheckoutData();
    }
  }

  async initCheckoutData() {
    this.providerId = this.route.snapshot.paramMap.get('id');
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux) {
      this.contact.email = aux.email;
      this.contact.username = aux.username;
    }
    if (aux.logged_as == aux.id) {
      this.relatedParty = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.relatedParty = loggedOrg.partyId
    }

    console.log('--- Login Info ---')
    console.log(aux)

    let data = await this.cartService.getShoppingCart();
    //this.cartService.getShoppingCart().then(async data => {
      console.log('---CARRITO API---')
      console.log(data)
      this.items = data;
      if(this.providerId){
        await this.getProviderInfo();
        this.groupItemsByOwner(this.providerId);
        this.loadingItems=false;
      }
      this.cdr.detectChanges();
      this.getTotalPrice();
      console.log('------------------')
    //})
    console.log('--- ITEMS ---')
    console.log(this.items)

    this.loading_baddrs = true;
    await this.getBilling();
  }

  async getProviderInfo(){
    for(let i=0; i < this.items.length; i++){
      let offer = await this.api.getProductById(this.items[i].id);
      let product = await this.api.getProductSpecification(offer.productSpecification.id)
      console.log(product)
      this.items[i]['relatedParty']=product.relatedParty
    }
  }

  groupItemsByOwner(ownerId: any) {
    const itemsForOwner = this.items.filter((item: any) => {
      const owner = item.relatedParty?.find((rp: any) => rp.role === 'Owner')?.id;
      return owner === ownerId;
    });
  
    console.log(itemsForOwner);
    this.items = itemsForOwner; // replace with only this owner's items
  }
  

  async getBilling() {
    this.selectedBillingAddress=null;
    let isBillSelected = false;
    this.billingAddresses = [];
    let data = await this.account.getBillingAccount();
    //this.account.getBillingAccount().then(data => {
      for (let i = 0; i < data.length; i++) {
        isBillSelected = false;
        let email = ''
        let phone = ''
        let phoneType = ''
        let address = {
          "city": '',
          "country": '',
          "postCode": '',
          "stateOrProvince": '',
          "street": ''
        }
        if (data[i].contact) {
          for (let j = 0; j < data[i].contact[0].contactMedium.length; j++) {
            if (data[i].contact[0].contactMedium[j].mediumType == 'Email') {
              email = data[i].contact[0].contactMedium[j].characteristic.emailAddress
            } else if (data[i].contact[0].contactMedium[j].mediumType == 'PostalAddress') {
              address = {
                "city": data[i].contact[0].contactMedium[j].characteristic.city,
                "country": data[i].contact[0].contactMedium[j].characteristic.country,
                "postCode": data[i].contact[0].contactMedium[j].characteristic.postCode,
                "stateOrProvince": data[i].contact[0].contactMedium[j].characteristic.stateOrProvince,
                "street": data[i].contact[0].contactMedium[j].characteristic.street1
              }
            } else if (data[i].contact[0].contactMedium[j].mediumType == 'TelephoneNumber') {
              phone = data[i].contact[0].contactMedium[j].characteristic.phoneNumber
              phoneType = data[i].contact[0].contactMedium[j].characteristic.contactType
            }
            if (data[i].contact[0].contactMedium[j].preferred == true) {
              isBillSelected = true;
            }
          }
        }
        const baddr = {
          "id": data[i].id,
          "href": data[i].href,
          "name": data[i].name,
          "email": email ?? '',
          "postalAddress": address ?? {},
          "telephoneNumber": phone ?? '',
          "telephoneType": phoneType ?? '',
          "selected": isBillSelected
        }
        this.billingAddresses.push(baddr)
        if (isBillSelected) {
          this.selectedBillingAddress = baddr
          this.cdr.detectChanges();
        }
      }
      console.log('billing account...')
      console.log(this.billingAddresses)
      
      this.loading_baddrs = false;
      if (this.billingAddresses.length > 0) {
        this.preferred = false;
      } else {
        this.preferred = true;
      }
    //})
    this.validBillAddr = !!this.selectedBillingAddress?.id;
    this.cdr.detectChanges();
  }

  async onSelected(baddr: billingAccountCart) {
    try{
      this.validBillAddr = true
      for (let ba of this.billingAddresses) {
        ba.selected = false;
      }
      this.selectedBillingAddress = baddr;
      const updatedItems = JSON.parse(JSON.stringify(this.items)); // we need a deep clone isntead of shallow clone
      for (const cartItem of updatedItems){
          const response = await lastValueFrom( this.priceService.calculatePrice({
                "productOrder":{
                    "id": uuidv4(),
                    "productOrderItem":[{
                      action: "add",
                      id: cartItem.id, // product offering id
                      itemTotalPrice:[{
                        productOfferingPrice:{
                          id: cartItem.options.pricing[0].id, //product offering price parent id
                          href: cartItem.options.pricing[0].id,
                          name: "" // Not using the pricePlan name in backend, we can discard thiss
                      }}],
                      product: {productCharacteristic:  cartItem.options.characteristics},
                      productOffering: {id: cartItem.id, href: cartItem.id},
                      quantity: "1"
                    }],
                    billingAccount: {
                      id: this.selectedBillingAddress.id,
                      href: this.selectedBillingAddress.id
                    }
                },
                "usage": await this.buildUsageFromCartItem(cartItem)
              }));
          let pricing: any[] = response.orderTotalPrice;
          pricing = pricing.map((data) =>{ return {...data, id: cartItem.options.pricing[0].id}});
          cartItem.options.pricing = pricing;
        }

        // If all new prices were successfully collectedd, then we can commit the changes
        await this.emptyShoppingCart();
        this.items = updatedItems;
        for (const cartItem of this.items){
          await this.cartService.addItemShoppingCart(cartItem);
        }
        this.getTotalPrice();
        this.cdr.detectChanges();
    } catch (error) {
      this.validBillAddr = false
      this.cdr.detectChanges();
      this.handleError(error, 'Invalid biling address');
    }
  }

   private async buildUsageFromCartItem(cartItem: any) {
    if (!cartItem.options.pricing || cartItem.options.pricing.length === 0) {
      return [];
    }

    let result: any[] = []

    const prodOffPrice = await this.api.getOfferingPrice(cartItem.options.pricing[0].id);
    if(prodOffPrice.isBundle){
      for(const singleRef of prodOffPrice.bundledPopRelationship){
        const singleOffPrice = await this.api.getOfferingPrice(singleRef.id);
        if (singleOffPrice.usageSpecId && singleOffPrice.unitOfMeasure) {
          result.push({
            usageSpecification: {
              id: singleOffPrice.usageSpecId
            },
            usageCharacteristic: [{
              name: singleOffPrice.unitOfMeasure.units,
              value: 1
            }]});
        }
      }
    }
    else{
      result.push(prodOffPrice)
    }

    return result;
  }

  onDeleted(baddr: billingAccountCart) {
    console.log('Deleting billing account')
    /*this.account.deleteBillingAccount(baddr).subscribe({
        next: result => {
          console.log('--- DELETE BILLING ADDRESS ---')
          console.log(baddr.id)
          this.billingAddresses.filter(item => item.id != baddr.id)
        },
        error: error => {
          console.log('--- ERROR WHILE DELETING BILLING ADDRESS ---')
          this.errorMessage='There was an error while deleting the billing addresss!';
          this.showError=true;
          setTimeout(() => {
            this.showError = false;
          }, 3000);
        }
      }
    )*/
  }

  async deleteProduct(product: cartProduct) {
    await this.cartService.removeItemShoppingCart(product.id)
    console.log('deleted');
    this.eventMessage.emitRemovedCartItem(product as cartProduct);
    this.cartService.getShoppingCart().then(async data => {
      console.log('---CARRITO API---')
      console.log(data)
      this.items = data;
      if(this.providerId){
        await this.getProviderInfo();
        this.groupItemsByOwner(this.providerId);
        this.loadingItems=false;
      }
      this.cdr.detectChanges();
      this.getTotalPrice();
      console.log('------------------')
    })
  }

  goToProdDetails(product: cartProduct){
    this.router.navigate(['/search/', product.id]);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }
}
