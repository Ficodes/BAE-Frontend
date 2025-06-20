import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { initFlowbite } from 'flowbite';
import {components} from "../../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {EventMessageService} from "../../services/event-message.service";
import {LocalStorageService} from "../../services/local-storage.service";
import {AccountServiceService} from "src/app/services/account-service.service"
import {Category, LoginInfo} from "../../models/interfaces";
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import * as moment from 'moment';

@Component({
  selector: 'app-search-catalog',
  templateUrl: './search-catalog.component.html',
  styleUrl: './search-catalog.component.css'
})
export class SearchCatalogComponent implements OnInit{
  constructor(
    private route: ActivatedRoute,
    private api: ApiServiceService,
    private accService: AccountServiceService,
    private priceService: PriceServiceService, 
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private router: Router,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        this.checkPanel();
      }
    })
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'CloseFeedback') {
        this.feedback = false;
      }
    })
  }

  id:any;
  catalog:any;
  providerName:string='';
  providerDescription:string='';
  products: ProductOffering[]=[];
  nextProducts: ProductOffering[]=[];
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  showDrawer:boolean=false;
  searchEnabled = environment.SEARCH_ENABLED;
  showPanel = false;
  feedback:boolean=false;
  logo='';


  async ngOnInit() {
    initFlowbite();
    this.checkPanel();
    this.id = this.route.snapshot.paramMap.get('id');
    this.api.getCatalog(this.id).then(catalog => {
      this.catalog=catalog;
      this.cdr.detectChanges();
      const owner = this.catalog.relatedParty.find((item: { role: string; }) => item.role === 'Owner');
      if(owner.id.startsWith('urn:ngsi-ld:individual')){
        this.accService.getUserInfo(owner.id).then(info  => {
          console.log('info')
          console.log(info)
          this.providerName=info.givenName;
          const provdesc = info.partyCharacteristic.find((item: { name: string; }) => item.name === 'description')
          this.providerDescription=provdesc.value;
        })
        this.logo='assets/images/Dome-Marketplace.svg';
      } else {
        this.accService.getOrgInfo(owner.id).then(info  => {
          console.log('info')
          console.log(info)
          this.providerName=info.tradingName;
          if (Array.isArray(info?.partyCharacteristic) && info.partyCharacteristic.length > 0) {
            const provdesc = info.partyCharacteristic.find((item: { name: string; }) => item.name === 'description')
            if(provdesc?.value){
              this.providerDescription=provdesc.value;
            } else {
              this.providerDescription=''
            }
            const logo = info.partyCharacteristic.find((item: { name: string; }) => item.name === 'logo')
            if(logo?.value){
              this.logo=logo.value
            } else {
              this.logo='assets/images/Dome-Marketplace.svg'
            }
          } else {
            this.logo='assets/images/Dome-Marketplace.svg'
          }
        })
      }      
      console.log('--- catalogo')
      console.log(this.catalog)
    })

    await this.getProducts(false);

    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        this.getProducts(false);
      }
    })
    console.log('Productos:')
    console.log(this.products)
    const userInfo = this.localStorage.getObject('login_items') as LoginInfo;

    // The user is logged in
    if ((JSON.stringify(userInfo) != '{}' && (((userInfo.expire - moment().unix())-4) > 0))) {
      this.feedback=true;
    }
  }

  @HostListener('document:click')
  onClick() {
    if(this.showDrawer==true){
      this.showDrawer=false;
      this.cdr.detectChanges();
    }
  }

  goTo(path:string) {
    this.router.navigate([path]);
  }


  async getProducts(next:boolean){
    let filters = this.localStorage.getObject('selected_categories') as Category[] || [];
    if(next==false){
      this.loading=true;
    }
    
    let options = {
      "keywords": undefined,
      "filters": filters,
      "catalogId": this.id
    }
    this.paginationService.getItemsPaginated(this.page, this.PRODUCT_LIMIT, next, this.products,this.nextProducts, options,
      this.paginationService.getProductsByCatalog.bind(this.paginationService)).then(data => {
      this.page_check=data.page_check;      
      this.products=data.items;
      this.nextProducts=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getProducts(true);
  }

  checkPanel() {
    const filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
    const oldState = this.showPanel;
    this.showPanel = filters.length > 0;
    if(this.showPanel != oldState) {
      this.eventMessage.emitFilterShown(this.showPanel);
      this.localStorage.setItem('is_filter_panel_shown', this.showPanel.toString())
    }
  }
}
