import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, Input, OnDestroy } from '@angular/core';
import { LoginInfo, billingAccountCart } from 'src/app/models/interfaces';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {EventMessageService} from "src/app/services/event-message.service";
import { FastAverageColor } from 'fast-average-color';
import {components} from "src/app/models/product-catalog";
import { ActivatedRoute, Router } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';
type ProductOffering = components["schemas"]["ProductOffering"];
import moment from 'moment';
import { FormControl } from '@angular/forms';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { getShortOfferDescription } from 'src/app/shared/card/offer-card-text.util';

@Component({
  selector: 'inventory-products',
  templateUrl: './inventory-products.component.html',
  styleUrl: './inventory-products.component.css'
})
export class InventoryProductsComponent implements OnInit, OnDestroy {

  readonly getShortDescription = getShortOfferDescription;
  viewMode: 'grid' | 'list' = 'grid';



  inventory:any[] = [];
  nextInventory:any[] =[];
  partyId:any='';
  loading: boolean = false;
  bgColor: string[] = [];
  products: ProductOffering[]=[];
  unsubscribeModal:boolean=false;
  renewModal:boolean=false;
  prodToRenew:any;
  prodToUnsubscribe:any;
  prices: any[]=[];
  readonly statusTabs = [
    { value: 'created', label: 'PRODUCT_INVENTORY._created' },
    { value: 'active', label: 'PRODUCT_INVENTORY._active' },
    { value: 'suspended', label: 'PRODUCT_INVENTORY._suspended' },
    { value: 'terminated', label: 'PRODUCT_INVENTORY._terminated' },
  ];
  selectedStatus = this.statusTabs[0].value;
  filters: string[] = [this.selectedStatus];
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  INVENTORY_LIMIT: number = environment.INVENTORY_LIMIT;
  searchField = new FormControl();
  keywordFilter:any=undefined;
  selectedProduct:any;
  selectedInv:any;
  productOff:any;

  errorMessage:any='';
  showError:boolean=false;
  checkCustom:boolean=false;
  private destroy$ = new Subject<void>();

  isModifyDrawerOpen:boolean = false;
  selectedProdSpec:any;
  billingAddresses: billingAccountCart[] = [];
  selectedBillingAddress: any = null;
  showBillingSelector: boolean = false;
  pendingModifyPayload: any = null;

  constructor(
    private inventoryService: ProductInventoryServiceService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private priceService: PriceServiceService,
    private router: Router,
    private route: ActivatedRoute,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
    private accountService: AccountServiceService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initInventory();
      }
    })
  }

  private searchInputListener = (_e: Event) => {
    console.log(`Input updated`)
    if (this.searchField.value == '') {
      this.keywordFilter = undefined;
      this.getInventory(false);
    }
  }

  ngOnInit() {
    this.selectedStatus = this.statusTabs[0].value;
    this.filters = [this.selectedStatus];
    this.viewMode = this.route.snapshot.queryParamMap.get('view') === 'list' ? 'list' : 'grid';
    this.initInventory();
    const input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', this.searchInputListener);
    }
  }

  ngOnDestroy(){
    const input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.removeEventListener('input', this.searchInputListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  initInventory(){
    this.loading = true;

    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
      this.getInventory(false);
    }
    initFlowbite();
  }

  @HostListener('document:click')
  onClick() {
    if(this.unsubscribeModal==true){
      this.unsubscribeModal=false;
      this.cdr.detectChanges();
    }
    if(this.prodToRenew==true){
      this.prodToRenew=false;
      this.cdr.detectChanges();
    }   
  }
  
  getProductImage(prod:ProductOffering) {
    let images: any[] = []
    if(prod?.attachment){
      let profile = prod?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
      images = prod.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
      if(profile.length!=0){
        images = profile;
      } 
    }
    return images.length > 0 ? images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  goToProductDetails(product: any) {
    return this.router.navigate(['/product-inventory', product.id], {
      queryParams: { view: this.viewMode }
    });
  }

  async getInventory(next:boolean){
    if(next == false){
      this.loading = true;
    }

    let options = {
      "keywords": this.keywordFilter,
      "filters": this.filters,
      "partyId": this.partyId
    }
    
    await this.paginationService.getItemsPaginated(this.page, this.INVENTORY_LIMIT, next, this.inventory, this.nextInventory, options,
      this.paginationService.getInventory.bind(this.paginationService)).then(data => {
        this.page_check = data.page_check;
        this.inventory = data.items;
        this.nextInventory = data.nextItems;
        this.page = data.page;
        this.loading = false;
        this.loading_more = false;
        initFlowbite();
    })
  }

  selectStatusTab(status: string) {
    if (this.loading || this.loading_more || this.selectedStatus === status || !this.statusTabs.some(tab => tab.value === status)) return;

    this.selectedStatus = status;
    this.filters = [status];
    this.page = 0;
    this.inventory = [];
    this.nextInventory = [];
    return this.getInventory(false);
  }

  async next(){
    this.loading_more = true;
    try {
      await this.getInventory(true);
    } finally {
      this.loading_more = false;
    }
  }

  filterInventoryByKeywords(){
    this.keywordFilter=this.searchField.value;
    this.getInventory(false);
  }

  async unsubscribeProduct(){
    const inv = this.prodToUnsubscribe;
    const orderItem: any = {
      id: inv.productOffering.id,
      action: 'delete',
      productOffering: {
        id: inv.productOffering.id,
        href: inv.productOffering.id
      },
      product: {
        id: inv.id,
        productCharacteristic: []
      }
    };
    this.unsubscribeModal = false;
    await this.onModifySubmit(orderItem);
  }

  showUnsubscribeModal(inv:any){
    this.unsubscribeModal=true;
    this.prodToUnsubscribe=inv;
  }

  showRenewModal(inv:any){
    this.renewModal=true;
    this.prodToRenew=inv;
  }
  
  renewProduct(id:any){
    console.log(id)
  }

  async loadProductForModification(prod:any){
    this.selectedProduct=prod;
    console.log('selecting prod')
    console.log(this.selectedProduct)
    const spec = await this.api.getProductSpecification(prod.product.productSpecification.id);
    this.selectedProdSpec = spec;
    this.checkCustom = false;

    let prodOff = await this.api.getProductById(this.selectedProduct.productOffering.id);
    let prodPrices: any[] | undefined= prodOff.productOfferingPrice;
    let prices: any[]=[];
    if(prodPrices!== undefined){
      for(let j=0; j < prodPrices.length; j++){
        let price = await this.api.getProductPrice(prodPrices[j].id);
        prices.push(price);
        console.log(price)
        if(price.priceType == 'custom'){
          this.checkCustom = true;
        }
      }
    }

    this.productOff={
      id: prodOff.id,
      name: prodOff.name,
      category: prodOff.category,
      description: prodOff.description,
      lastUpdate: prodOff.lastUpdate,
      attachment: spec.attachment,
      productOfferingPrice: prices,
      productSpecification: prodOff.productSpecification,
      productOfferingTerm: prodOff.productOfferingTerm,
      serviceLevelAgreement: prodOff.serviceLevelAgreement,
      version: prodOff.version
    }

    console.log(this.selectedProduct)
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  async openModifyFromCard(inv: any) {
    await this.loadProductForModification(inv);
    this.isModifyDrawerOpen = true;
  }

  async onModifySubmit(orderItem: any) {
    this.pendingModifyPayload = orderItem;
    await this.getBilling();
    this.showBillingSelector = true;
  }

  async getBilling() {
    this.selectedBillingAddress = null;
    this.billingAddresses = [];
    let data = await this.accountService.getBillingAccount();
    for (let i = 0; i < data.length; i++) {
      let isBillSelected = false;
      let email = '';
      let phone = '';
      let phoneType = '';
      let address = {
        city: '',
        country: '',
        postCode: '',
        stateOrProvince: '',
        street: ''
      };
      if (data[i].contact) {
        for (let j = 0; j < data[i].contact[0].contactMedium.length; j++) {
          if (data[i].contact[0].contactMedium[j].mediumType == 'Email') {
            email = data[i].contact[0].contactMedium[j].characteristic.emailAddress;
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'PostalAddress') {
            address = {
              city: data[i].contact[0].contactMedium[j].characteristic.city,
              country: data[i].contact[0].contactMedium[j].characteristic.country,
              postCode: data[i].contact[0].contactMedium[j].characteristic.postCode,
              stateOrProvince: data[i].contact[0].contactMedium[j].characteristic.stateOrProvince,
              street: data[i].contact[0].contactMedium[j].characteristic.street1
            };
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'TelephoneNumber') {
            phone = data[i].contact[0].contactMedium[j].characteristic.phoneNumber;
            phoneType = data[i].contact[0].contactMedium[j].characteristic.contactType;
          }
          if (data[i].contact[0].contactMedium[j].preferred == true) {
            isBillSelected = true;
          }
        }
      }
      const baddr: billingAccountCart = {
        id: data[i].id,
        href: data[i].href,
        name: data[i].name,
        email: email ?? '',
        postalAddress: address ?? {},
        telephoneNumber: phone ?? '',
        telephoneType: phoneType ?? '',
        selected: isBillSelected
      };
      this.billingAddresses.push(baddr);
      if (isBillSelected) {
        this.selectedBillingAddress = baddr;
      }
    }
    this.cdr.detectChanges();
  }

  onBillingSelected(baddr: billingAccountCart) {
    this.selectedBillingAddress = baddr;
  }

  async confirmModify() {
    if (!this.pendingModifyPayload || !this.selectedBillingAddress) return;

    const productOrder = {
      productOrderItem: [this.pendingModifyPayload],
      relatedParty: [{ id: this.partyId, href: this.partyId, role: environment.BUYER_ROLE }],
      billingAccount: { id: this.selectedBillingAddress.id, href: this.selectedBillingAddress.id },
      priority: '4',
      notificationContact: this.selectedBillingAddress.email
    };

    try {
      const response = await firstValueFrom(this.orderService.postProductOrder(productOrder));
      const redirectUrl = response.headers.get('X-Redirect-URL');

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        this.showBillingSelector = false;
        this.pendingModifyPayload = null;
        this.router.navigate(['/product-orders']);
      }
    } catch (error: any) {
      console.error('Error submitting modify order:', error);
      if (error.error?.error) {
        this.errorMessage = 'Error: ' + error.error.error;
      } else {
        this.errorMessage = 'There was an error while modifying the product!';
      }
      this.showError = true;
      setTimeout(() => {
        this.showError = false;
      }, 3000);
    }
    this.showBillingSelector = false;
  }

}
