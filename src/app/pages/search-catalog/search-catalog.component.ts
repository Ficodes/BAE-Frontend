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
import {Category} from "../../models/interfaces";
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-catalog',
  templateUrl: './search-catalog.component.html',
  styleUrl: './search-catalog.component.css'
})
export class SearchCatalogComponent implements OnInit{
  constructor(
    private route: ActivatedRoute,
    private api: ApiServiceService,
    private priceService: PriceServiceService, 
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private router: Router,
    private paginationService: PaginationService
  ) {
  }

  id:any;
  catalog:any;
  products: ProductOffering[]=[];
  nextProducts: ProductOffering[]=[];
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  showDrawer:boolean=false;
  searchEnabled = environment.SEARCH_ENABLED;

  async ngOnInit() {
    initFlowbite();
    this.id = this.route.snapshot.paramMap.get('id');
    this.api.getCatalog(this.id).then(catalog => {
      this.catalog=catalog;
      this.cdr.detectChanges();
    })
    await this.getProducts(false);

    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        this.getProducts(false);
      }
    })
    console.log('Productos:')
    console.log(this.products)
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
}
