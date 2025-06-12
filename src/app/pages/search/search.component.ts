import { Component, OnInit, ChangeDetectorRef, SimpleChanges, OnChanges, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CategoriesFilterComponent} from "../../shared/categories-filter/categories-filter.component";
import {components} from "../../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service'
import {LocalStorageService} from "../../services/local-storage.service";
import {Category} from "../../models/interfaces";
import {EventMessageService} from "../../services/event-message.service";
import { LoginServiceService } from "src/app/services/login-service.service"
import { environment } from 'src/environments/environment';
import { ActivatedRoute } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';

@Component({
  selector: 'bae-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {

  products: ProductOffering[]=[];
  nextProducts: ProductOffering[]=[];
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  DFT_CATALOG: String = environment.DFT_CATALOG_ID;
  showDrawer:boolean=false;
  searchEnabled = environment.SEARCH_ENABLED;
  keywords:any=undefined;
  searchField = new FormControl();
  showPanel = false;
  feedback:boolean=false;

  constructor(
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private loginService: LoginServiceService,
    private paginationService: PaginationService) {
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

  async ngOnInit() {
    this.products=[];
    this.nextProducts=[];
    /*await this.api.slaCheck().then(data => {  
      console.log(data)
    })*/
    this.checkPanel();
    if(this.route.snapshot.paramMap.get('keywords')){
      this.keywords = this.route.snapshot.paramMap.get('keywords');
      this.searchField.setValue(this.keywords);
    }
    console.log('INIT')
    await this.getProducts(false);

    await this.eventMessage.messages$.subscribe(async ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        console.log('event filter')
        await this.getProducts(false);
      }
    })

    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', async e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.keywords=undefined;
          console.log('EVENT CLEAR')
          await this.getProducts(false);
        }
      });
    }
    setTimeout(() => {
      const userInfo = this.localStorage.getObject('login_items') as LoginInfo;

      // The user is logged in
      if ((JSON.stringify(userInfo) != '{}' && (((userInfo.expire - moment().unix())-4) > 0))) {
        this.feedback = true;
      }
    });
  }

  @HostListener('document:click')
  onClick() {
    if(this.showDrawer==true){
      this.showDrawer=false;
      this.cdr.detectChanges();
    }
  }

  async getProducts(next:boolean){
    let filters = this.localStorage.getObject('selected_categories') as Category[] || [];
    if(next==false){
      this.loading=true;
    }
    
    let options = {
      "keywords": this.keywords,
      "filters": filters
    }

    this.paginationService.getItemsPaginated(this.page, this.PRODUCT_LIMIT, next, this.products,this.nextProducts, options,
      this.paginationService.getProducts.bind(this.paginationService)).then(data => {
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

  async filterSearch(event: any) {
    event.preventDefault()
    if(this.searchField.value!='' && this.searchField.value != null){
      console.log('FILTER KEYWORDS')
      this.keywords=this.searchField.value;
      //let filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
      await this.getProducts(false);
    } else {
      console.log('EMPTY  FILTER KEYWORDS')
      this.keywords=undefined;
      //let filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
      await this.getProducts(false);
    }
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
