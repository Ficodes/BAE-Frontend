import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, Input } from '@angular/core';
import { LoginInfo } from 'src/app/models/interfaces';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {EventMessageService} from "src/app/services/event-message.service";
import { FastAverageColor } from 'fast-average-color';
import {components} from "src/app/models/product-catalog";
import { Router } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';
type ProductOffering = components["schemas"]["ProductOffering"];
import * as moment from 'moment';
import { FormControl } from '@angular/forms';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";

@Component({
  selector: 'inventory-products',
  templateUrl: './inventory-products.component.html',
  styleUrl: './inventory-products.component.css'
})
export class InventoryProductsComponent implements OnInit {

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  @Input() prodId: any = undefined;

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
  filters: any[]=['active','created'];
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  INVENTORY_LIMIT: number = environment.INVENTORY_LIMIT;
  searchField = new FormControl();
  keywordFilter:any=undefined;
  selectedProduct:any;
  selectedInv:any;
  selectedResources:any[]=[];
  selectedServices:any[]=[];
  productOff:any;

  errorMessage:any='';
  showError:boolean=false;
  showDetails:boolean=false;
  checkCustom:boolean=false;
  checkFrom:boolean=true;

  constructor(
    private inventoryService: ProductInventoryServiceService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private priceService: PriceServiceService,
    private router: Router,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initInventory();
      }
    })
  }

  ngOnInit() {
    if(this.prodId==undefined){
      this.checkFrom=false;
    }
    this.initInventory();
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
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.keywordFilter=undefined;
          this.getInventory(false);
        }
      });
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

  goToProductDetails(productOff:ProductOffering| undefined) {
    document.querySelector("body > div[modal-backdrop]")?.remove()
    //this.router.navigate(['/search', productOff?.id]);
    console.log('info')
    console.log(productOff)
    this.router.navigate(['product-inventory', productOff?.id]);
    //this.router.navigate(['product-inventory', productOff?.id]);
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
        if(this.prodId!=undefined && this.checkFrom){
          let idx = this.inventory.findIndex(element => element.id == this.prodId)
          this.selectProduct(this.inventory[idx])
          this.checkFrom=false;
        }
    })
  }

  onStateFilterChange(filter:string){
    const index = this.filters.findIndex(item => item === filter);
    if (index !== -1) {
      this.filters.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.filters)
    } else {
      console.log('añade filtro')
      console.log(this.filters)
      this.filters.push(filter)
    }
    this.getInventory(false);
  }

  async next(){
    await this.getInventory(true);
  }

  filterInventoryByKeywords(){
    this.keywordFilter=this.searchField.value;
    this.getInventory(false);
  }

  unsubscribeProduct(id:any){
    this.inventoryService.updateProduct({status: "suspended"},id).subscribe({
      next: data => {
        this.unsubscribeModal=false;
        this.getInventory(false);
      },
      error: error => {
          console.error('There was an error while updating!', error);
          if(error.error.error){
            console.log(error)
            this.errorMessage='Error: '+error.error.error;
          } else {
            this.errorMessage='There was an error while unsubscribing!';
          }
          this.showError=true;
          setTimeout(() => {
            this.showError = false;
          }, 3000);
      }
    });
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

  async selectProduct(prod:any){
    this.selectedProduct=prod;
    console.log('selecting prod')
    console.log(this.selectedProduct)
    this.selectedResources=[];
    this.selectedServices=[];
    /*for(let i=0; i<this.selectedProduct.productPrice?.length;i++){
      if(this.selectedProduct.productPrice[i].priceType == 'custom'){
        this.checkCustom=true;
      }
    }*/

    console.log('is prod spec undefined?')
    console.log(this.selectedProduct.product)
    let spec = await this.api.getProductSpecification(this.selectedProduct.product.productSpecification.id)
    if(spec.serviceSpecification != undefined){
      for(let j=0; j < spec.serviceSpecification.length; j++){
        let serv = await this.api.getServiceSpec(spec.serviceSpecification[j].id);
        this.selectedServices.push(serv);
      }
    }
    if(spec.resourceSpecification != undefined){
      for(let j=0; j < spec.resourceSpecification.length; j++){
        let res = await this.api.getResourceSpec(spec.resourceSpecification[j].id);
        this.selectedResources.push(res);
      }
    }
    console.log('--- spec')
    console.log(spec)

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

    this.showDetails=true;
    console.log(this.selectedProduct)
  }

  back(){
    this.showDetails=false;
  }

  selectService(id:any){
    this.eventMessage.emitOpenServiceDetails({serviceId: id, prodId: this.selectedProduct.id});
  }

  selectResource(id:any){
    this.eventMessage.emitOpenResourceDetails({resourceId: id, prodId: this.selectedProduct.id});
  }

}
