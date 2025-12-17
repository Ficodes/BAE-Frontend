import { Component, OnInit, ChangeDetectorRef, SimpleChanges, OnChanges, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CategoriesFilterComponent} from "../../shared/categories-filter/categories-filter.component";
import {components} from "../../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service'
import {LocalStorageService} from "../../services/local-storage.service";
import {Category} from "../../models/interfaces";
import {EventMessageService} from "../../services/event-message.service";
import { SearchStateService } from "../../services/search-state.service"
import { LoginServiceService } from "src/app/services/login-service.service"
import { environment } from 'src/environments/environment';
import { ActivatedRoute, NavigationStart } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginInfo, FeedbackInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'bae-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit, OnDestroy {

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
  providerThemeName=environment.providerThemeName;
  private navigatingToDetail = false;
  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private loginService: LoginServiceService,
    private paginationService: PaginationService,
    private state: SearchStateService
    ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(async ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        console.log('event filter')
        await this.getProducts(false);
        this.checkPanel();        
      }
    })
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'CloseFeedback') {
        this.feedback = false;
      }
    })
  } 

  async ngOnInit() {

    this.router.events
    .pipe(takeUntil(this.destroy$))
    .subscribe(event => {
      if (event instanceof NavigationStart) {
        // Detecta navegación al detalle del producto
        if (event.url.startsWith('/search/urn:ngsi-ld:product-offering')) {
          this.navigatingToDetail = true;
        } else {
          this.navigatingToDetail = false;
        }
      }
    });
    
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

    // 1. Restaurar estado
    if (this.state.hasState()) {
      console.log("Restoring state…");

      this.products = this.state.products;
      this.nextProducts = this.state.nextProducts;
      this.page = this.state.page;
      this.page_check = this.state.page_check;
      this.keywords = this.state.keywords;

      // restaurar campo de búsqueda
      this.searchField.setValue(this.keywords);

      return; // <-- IMPORTANTE: evitar volver a cargar desde cero
    }

    // Si no hay estado, entonces sí iniciar búsqueda normal
    await this.getProducts(false);


    /*await this.eventMessage.messages$.subscribe(async ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        console.log('event filter')
        await this.getProducts(false);
      }
    })*/

    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', async e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.keywords=undefined;
          this.updateQueryParams(this.keywords)
          console.log('EVENT CLEAR')
          await this.getProducts(false);
        }
      });
    }
    setTimeout(() => {
      const userInfo = this.localStorage.getObject('login_items') as LoginInfo;
      //this.localStorage.setObject('feedback', {});

      // The user is logged in
      if ((JSON.stringify(userInfo) != '{}' && (((userInfo.expire - moment().unix())-4) > 0))) {
        if(environment.feedbackCampaign){
          let feedbackInfo = this.localStorage.getObject('feedback') as FeedbackInfo;
          console.log('---------------------- feedbackInfo')
          console.log(feedbackInfo)
    
          if(JSON.stringify(feedbackInfo) === '{}'){
            let wantsFeedback = {
              "expire": environment?.feedbackCampaignExpiration ?? moment().add(1, 'week').unix(),
            }
            this.localStorage.setObject('feedback',wantsFeedback);
            this.feedback=true;
          } else {
            if ("expire" in feedbackInfo) {
              let expiration = feedbackInfo?.expire ?? 0
              if(((expiration - moment().unix())-4) < 0 && ((environment.feedbackCampaignExpiration - moment().unix())-4) > 0){
                let wantsFeedback : FeedbackInfo = {
                  "expire": environment?.feedbackCampaignExpiration,
                }
                if("approval" in feedbackInfo){
                  wantsFeedback.approval=feedbackInfo.approval
                }
                this.localStorage.setObject('feedback',wantsFeedback)
              }
            } else {
              let wantsFeedback : FeedbackInfo = {
                "expire": environment?.feedbackCampaignExpiration,
              }
              if("approval" in feedbackInfo){
                wantsFeedback.approval=feedbackInfo.approval
              }
              this.localStorage.setObject('feedback',wantsFeedback)
            }
    
            if ("approval" in feedbackInfo) {
              /*if (feedbackInfo.approval === true) {
                this.feedback = true;
              } else {
                this.feedback = false;
              }*/
              this.feedback = false;
            } else {
              this.feedback = true; 
            }
            
          }
          
        }
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

  ngOnDestroy(){
    if (this.navigatingToDetail) {
      return;
    }

    let storedFilters = this.localStorage.getObject('selected_categories') as Category[] || [];
    for(let i=0;i<storedFilters.length;i++){
      this.localStorage.removeCategoryFilter(storedFilters[i]);
      this.eventMessage.emitRemovedFilter(storedFilters[i]);
    }

    this.state.clear();

    this.destroy$.next();
    this.destroy$.complete();
  }

  async getProducts(next:boolean){
    let filters = this.localStorage.getObject('selected_categories') as Category[] || [];
    if(next==false){
      this.loading=true;
    }
    if (!next) {
      this.state.clear();
    }    
    
    let options = {
      "keywords": this.keywords,
      "filters": filters
    }

    this.paginationService.getItemsPaginated(this.page, this.PRODUCT_LIMIT, next, this.products,this.nextProducts, options,
      this.paginationService.getProducts.bind(this.paginationService)).then(async data => {
        this.products = await this.api.getProductsDetails(data.items);
        this.nextProducts = await this.api.getProductsDetails(data.nextItems);
      
        this.page = data.page;
        this.page_check = data.page_check;
      
        this.loading = false;
        this.loading_more = false;
      
        // SAVE STATE
        this.state.save({
          products: this.products,
          nextProducts: this.nextProducts,
          page: this.page,
          page_check: this.page_check,
          keywords: this.keywords
        });
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
      this.updateQueryParams(this.keywords)
      //let filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
      await this.getProducts(false);
    } else {
      console.log('EMPTY  FILTER KEYWORDS')
      this.keywords=undefined;
      this.updateQueryParams(this.keywords)
      //let filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
      await this.getProducts(false);
    }
  }

  updateQueryParams(keywords: string | null) {
    if (keywords) {
      // Add/update the matrix param
      this.router.navigate(
        ['/search', { keywords }],
        { replaceUrl: true }
      );
    } else {
      // Navigate without the param
      this.router.navigate(['/search'], { replaceUrl: true });
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
