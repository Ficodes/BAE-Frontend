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

import { AiSearchService } from 'src/app/services/ai-search.service';

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

  // AI Search properties
  aiSearchEnabled = environment.AI_SEARCH_ENABLED;
  aiAnswer: string = '';
  aiSearchLoading: boolean = false;
  aiTotalItems: number = 0;
  aiCurrentPage: number = 1;
  aiPageSize: number = environment.PRODUCT_LIMIT;

  get aiTotalPages(): number {
    return Math.ceil(this.aiTotalItems / this.aiPageSize);
  }

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
    ,
    private aiSearchService: AiSearchService) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(async ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        // Use AI search if enabled, otherwise use standard search
        if (this.aiSearchEnabled) {
          await this.runInitialAiSearch();
        } else {
          await this.getProducts(false);
        }
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
    // If AI search is enabled, use AI search for initial load to get products and facets
    if (this.aiSearchEnabled) {
      if (this.keywords) {
        // If we have keywords from URL, run the search
        await this.runAiSearch();
      } else {
        // Otherwise show all products
        await this.runInitialAiSearch();
      }
    } else {
      await this.getProducts(false);
    }


    /*await this.eventMessage.messages$.subscribe(async ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        console.log('event filter')
        await this.getProducts(false);
      }
    })*/

    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', async e => {
        if(this.searchField.value==''){
          this.keywords=undefined;
          this.updateQueryParams(this.keywords)
          // Clear AI search state and restore categories
          this.aiAnswer = '';
          this.eventMessage.emitAiSearchCleared();
          if (this.aiSearchEnabled) {
            await this.runInitialAiSearch();
          } else {
            await this.getProducts(false);
          }
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

  // Unified Search - triggers both standard search and AI answer
  async onUnifiedSearch(event: any): Promise<void> {
    event.preventDefault();

    // If AI is enabled and there's a query, use AI search for products and answer
    if (this.aiSearchEnabled && this.searchField.value?.trim()) {
      this.keywords = this.searchField.value;
      this.updateQueryParams(this.keywords);
      await this.runAiSearch();
    } else if (this.aiSearchEnabled) {
      // AI enabled but empty query — reload all products via AI search
      this.keywords = undefined;
      this.updateQueryParams(this.keywords);
      this.aiAnswer = '';
      this.eventMessage.emitAiSearchCleared();
      await this.runInitialAiSearch();
    } else {
      // Use standard search if AI is disabled
      this.keywords = this.searchField.value || undefined;
      this.updateQueryParams(this.keywords);
      this.aiAnswer = '';
      this.eventMessage.emitAiSearchCleared();
      await this.getProducts(false);
    }
  }

  // Initial AI search for page load (with empty query to get all products and facets)
  private async runInitialAiSearch(): Promise<void> {
    this.loading = true;
    this.aiCurrentPage = 1;
    // Only reset search field if there's no keywords (user intentionally cleared search)
    if (!this.keywords) {
      this.searchField.reset();
    }
    this.cdr.detectChanges();

    try {
      const filters = this.localStorage.getObject('selected_categories') as Category[] || [];
      const aiFilters = this.convertCategoriesToAiFilters(filters);

      // Search with empty text to get all products
      const searchResponse = await this.aiSearchService.search(
        '',
        aiFilters,
        false, // auto_filter = false for initial load
        this.aiPageSize,
        0
      );

      this.products = this.mapAiSearchToProducts(searchResponse.items || []);
      this.nextProducts = [];
      this.aiTotalItems = searchResponse.total_count;
      this.page_check = false; // Disable "load more" for AI search

      // Emit facets for categories filter
      if (searchResponse.facets) {
        this.eventMessage.emitAiSearchFacets(searchResponse.facets);
      }

      // SAVE STATE
      this.state.save({
        products: this.products,
        nextProducts: this.nextProducts,
        page: this.page,
        page_check: this.page_check,
        keywords: this.keywords
      });
    } catch (error) {
      console.error('Initial AI Search error:', error);
      // Fallback to standard search
      await this.getProducts(false);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // AI Search methods
  private async runAiSearch(): Promise<void> {
    const query = this.searchField.value?.trim();
    if (!query) {
      return;
    }

    this.aiSearchLoading = true;
    this.aiAnswer = '';
    this.loading = true;
    this.aiCurrentPage = 1; // Reset page for new AI search
    this.cdr.detectChanges();

    try {
      // Get both search results and answer in parallel
      const filters = this.localStorage.getObject('selected_categories') as Category[] || [];
      const aiFilters = this.convertCategoriesToAiFilters(filters);

      const { searchResponse, answer } = await this.aiSearchService.searchWithAnswer(
        query,
        aiFilters,
        this.aiPageSize,
        0 // Always start from offset 0 for new searches
      );

      // Map AI search results to ProductOffering format
      this.products = this.mapAiSearchToProducts(searchResponse.items || []);
      this.aiTotalItems = searchResponse.total_count;
      // Emit facets for categories filter
      if (searchResponse.facets) {
        this.eventMessage.emitAiSearchFacets(searchResponse.facets);
      }

      this.nextProducts = [];
      this.page_check = false; // Disable "load more" for AI search
      this.aiAnswer = answer;

      // SAVE STATE
      this.state.save({
        products: this.products,
        nextProducts: this.nextProducts,
        page: this.page,
        page_check: this.page_check,
        keywords: this.keywords
      });
    } catch (error) {
      console.error('AI Search error:', error);
      this.aiAnswer = '';
      this.products = [];
    } finally {
      this.aiSearchLoading = false;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async changeAiPage(page: number): Promise<void> {
    this.aiCurrentPage = page;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const filters = this.localStorage.getObject('selected_categories') as Category[] || [];
      const aiFilters = this.convertCategoriesToAiFilters(filters);
      const offset = (this.aiCurrentPage - 1) * this.aiPageSize;

      const searchResponse = await this.aiSearchService.search(
        this.keywords || '',
        aiFilters,
        false,
        this.aiPageSize,
        offset
      );

      this.products = this.mapAiSearchToProducts(searchResponse.items || []);
      this.aiTotalItems = searchResponse.total_count;

      if (searchResponse.facets) {
        this.eventMessage.emitAiSearchFacets(searchResponse.facets);
      }
    } catch (error) {
      console.error('AI Search page change error:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Convert selected categories to AI search filters
  private convertCategoriesToAiFilters(categories: any): any[] {
    // Ensure categories is an array
    if (!Array.isArray(categories)) {
      return [];
    }

    // Group filters by their key
    const filterMap = new Map<string, string[]>();

    categories.forEach(cat => {
      let filterKey: string;
      let filterValue: string;

      // Check if this is a static filter (format: "filterKey::filterValue")
      if (cat.id?.includes('::')) {
        const parts = cat.id.split('::');
        filterKey = parts[0];
        filterValue = parts.slice(1).join('::'); // Rejoin in case value contains ::
      }
      // Check if this is an AI facet category (format: "ai-facet-{key}-{value}")
      else if (cat.id?.startsWith('ai-facet-')) {
        const parts = cat.id.split('-');
        if (parts.length >= 4) {
          parts.shift(); // remove 'ai'
          parts.shift(); // remove 'facet'
          filterKey = parts.shift() || '';
          filterValue = parts.join('-');
        } else {
          return; // Skip invalid format
        }
      }
      // Fallback for old category format
      else {
        filterKey = cat.id || '';
        filterValue = cat.name || '';
      }

      // Add to filter map
      if (!filterMap.has(filterKey)) {
        filterMap.set(filterKey, []);
      }
      filterMap.get(filterKey)!.push(filterValue);
    });

    // Convert map to API filter format
    return Array.from(filterMap.entries()).map(([key, values]) => ({
      key,
      value: values
    }));
  }

  // Map AI search results to ProductOffering format for card component compatibility
  private mapAiSearchToProducts(aiItems: any[]): ProductOffering[] {
    return aiItems.map(item => ({
      id: item.id,
      href: item.id,
      name: item.offeringName || item.specificationName,
      description: item.offeringDescription || item.specificationDescription,
      lifecycleStatus: item.lifecycleStatus || 'Launched',
      category: item.categories || [],
      attachment: item.imageUrl ? [{
        id: 'ai-image',
        name: 'Profile Picture',
        attachmentType: 'Picture',
        url: item.imageUrl,
        mimeType: 'image/png'
      }] : [],
      productSpecification: {
        id: item.id,
        name: item.specificationName,
        description: item.specificationDescription,
        brand: item.brand,
        productSpecCharacteristic: item.complianceProfiles ? [{
          name: 'complianceProfiles',
          productSpecCharacteristicValue: item.complianceProfiles.map((cp: any) => ({
            value: cp.name
          }))
        }] : []
      },
      productOfferingPrice: [],
      // Preserve original AI search data for reference
      _aiSearchData: item
    } as any));
  }

}
