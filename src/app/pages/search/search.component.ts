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
import { PriceServiceService } from 'src/app/services/price-service.service';
import { availableFilters, searchCategoriesConfig } from 'src/app/data/availableFilters';
import { iconForCategory } from 'src/app/data/categoryIcons';

type ToolbarFilter = {
  key: string;
  label: string;
  source: 'configured' | 'categoryRoot';
  rootName?: string;
  options: Category[];
  selectedIds: string[];
  open: boolean;
};

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

  viewMode: 'grid' | 'list' = 'grid';
  activeCategoryName: string | null = null;
  activeCategoryId: string | null = null;
  showCategoryDropdown = false;
  rootCategories: Category[] = [];
  iconForCategory = iconForCategory;
  primaryCategoriesMode = searchCategoriesConfig.primaryCategoriesMode;
  primaryRootName = searchCategoriesConfig.primaryRootName;

  toolbarFilters: ToolbarFilter[] = [];
  procurementFilterKey = 'procurement_type';
  private procurementCache = new Map<string, boolean>();
  private productsRequestVersion = 0;
  private readonly activeCategoryStorageKey = 'search_active_category_id';

  showSortDropdown = false;
  sortOption: 'name' | 'date_new' | 'date_old' = 'name';
  sortOptions: { value: 'name' | 'date_new' | 'date_old'; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'date_new', label: 'Newest first' },
    { value: 'date_old', label: 'Oldest first' },
  ];

  get sortLabel(): string {
    return this.sortOptions.find(o => o.value === this.sortOption)?.label ?? 'Name';
  }


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
    private aiSearchService: AiSearchService,
    private priceService: PriceServiceService) {
    this.initToolbarFilters();
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(async ev => {
      if (ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        this.syncSelectionsFromStorage();
        this.checkPanel();
      }
      if (ev.type === 'FiltersCommitted') {
        this.syncSelectionsFromStorage();
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
    this.loadRootCategories();
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
      this.refreshProcurementFilter();

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
    if(this.showDrawer){
      this.showDrawer = false;
    }
    const anyOpen = this.showCategoryDropdown || this.showSortDropdown || this.toolbarFilters.some(filter => filter.open);
    if (anyOpen) {
      this.closeDropdownsExcept('none');
      this.cdr.detectChanges();
    }
  }

  get visibleProducts(): ProductOffering[] {
    let items = this.products;
    const selectedProcurementTypes = this.getSelectedFilterLabels(this.procurementFilterKey);
    if (selectedProcurementTypes.length > 0) {
      items = items.filter(p => {
        const key = (p as any).id;
        if (!key) return true;
        const isCustom = this.procurementCache.get(key);
        if (isCustom === undefined) return false;
        const label = isCustom ? 'Request Quote' : 'Ready to Buy';
        return selectedProcurementTypes.includes(label);
      });
    }
    return this.applySort(items);
  }

  private applySort(items: ProductOffering[]): ProductOffering[] {
    const sorted = [...items];
    switch (this.sortOption) {
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'date_new':
        sorted.sort((a, b) => this.getStartDate(b) - this.getStartDate(a));
        break;
      case 'date_old':
        sorted.sort((a, b) => this.getStartDate(a) - this.getStartDate(b));
        break;
    }
    return sorted;
  }

  private getStartDate(p: ProductOffering): number {
    const d = (p as any)?.validFor?.startDateTime;
    return d ? new Date(d).getTime() : 0;
  }

  private getSortParam(): string | undefined {
    switch (this.sortOption) {
      case 'name': return 'name';
      case 'date_new': return '-validFor.startDateTime';
      case 'date_old': return 'validFor.startDateTime';
      default: return undefined;
    }
  }

  private closeDropdownsExcept(keep: string): void {
    if (keep !== 'category') this.showCategoryDropdown = false;
    if (keep !== 'sort') this.showSortDropdown = false;
    for (const filter of this.toolbarFilters) {
      if (keep !== filter.key) {
        filter.open = false;
      }
    }
  }

  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
    this.closeDropdownsExcept('sort');
  }

  async selectSort(option: 'name' | 'date_new' | 'date_old', event: Event): Promise<void> {
    event.stopPropagation();
    this.showSortDropdown = false;
    if (this.sortOption === option) {
      return;
    }
    this.sortOption = option;
    if (this.aiSearchEnabled) {
      if (this.keywords) {
        await this.runAiSearch();
      } else {
        await this.runInitialAiSearch();
      }
    } else {
      await this.getProducts(false);
    }
  }

  private async resolveProcurementCache(products: ProductOffering[]): Promise<void> {
    const tasks = products
      .filter(p => (p as any).id && !this.procurementCache.has((p as any).id))
      .map(async p => {
        const key = (p as any).id as string;
        try {
          const isCustom = await this.priceService.isCustomOffering(p);
          this.procurementCache.set(key, isCustom);
        } catch {
          this.procurementCache.set(key, false);
        }
      });
    await Promise.all(tasks);
  }

  private refreshProcurementFilter(): void {
    if (this.getSelectedFilterLabels(this.procurementFilterKey).length === 0) return;
    this.resolveProcurementCache(this.products).then(() => this.cdr.detectChanges());
  }

  private initToolbarFilters(): void {
    this.toolbarFilters = availableFilters.map(filter => ({
      key: filter.name,
      label: filter.label ?? filter.name,
      source: filter.source ?? 'configured',
      rootName: filter.rootName,
      options: (filter.source ?? 'configured') === 'configured'
        ? (filter.children ?? []).map(child => ({ id: `${filter.name}::${child.name}`, name: child.name }))
        : [],
      selectedIds: [],
      open: false,
    }));
  }

  toggleToolbarFilterDropdown(filter: ToolbarFilter, event: Event): void {
    event.stopPropagation();
    filter.open = !filter.open;
    this.closeDropdownsExcept(filter.key);
  }

  isToolbarOptionSelected(filter: ToolbarFilter, option: Category): boolean {
    return !!option?.id && filter.selectedIds.includes(option.id);
  }

  async toggleToolbarOption(filter: ToolbarFilter, option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    if (!option?.id) return;

    const idx = filter.selectedIds.indexOf(option.id);
    if (idx > -1) {
      filter.selectedIds.splice(idx, 1);
      this.localStorage.removeCategoryFilter(option);
      this.eventMessage.emitRemovedFilter(option);
    } else {
      filter.selectedIds.push(option.id);
      this.localStorage.addCategoryFilter(option);
      this.eventMessage.emitAddedFilter(option);
    }

    if (filter.key === this.procurementFilterKey && filter.selectedIds.length > 0) {
      await this.resolveProcurementCache(this.products);
    }
    this.eventMessage.emitFiltersCommitted();
  }

  clearToolbarFilterSelection(filter: ToolbarFilter, event: Event): void {
    event.stopPropagation();
    const idsToRemove = [...filter.selectedIds];
    filter.selectedIds = [];
    for (const id of idsToRemove) {
      const option = filter.options.find(opt => opt.id === id);
      if (option) {
        this.localStorage.removeCategoryFilter(option);
        this.eventMessage.emitRemovedFilter(option);
      }
    }
    this.eventMessage.emitFiltersCommitted();
  }

  private getSelectedFilterLabels(filterKey: string): string[] {
    const filter = this.toolbarFilters.find(item => item.key === filterKey);
    if (!filter) return [];
    const selectedSet = new Set(filter.selectedIds);
    return filter.options
      .filter(option => !!option.id && selectedSet.has(option.id))
      .map(option => option.name);
  }

  ngOnDestroy(){
    this.productsRequestVersion = 0;

    if (this.navigatingToDetail) {
      return;
    }

    let storedFilters = this.localStorage.getObject('selected_categories') as Category[] || [];
    for(let i=0;i<storedFilters.length;i++){
      this.localStorage.removeCategoryFilter(storedFilters[i]);
      this.eventMessage.emitRemovedFilter(storedFilters[i]);
    }
    this.setPersistedActiveCategoryId(null);

    this.state.clear();

    this.destroy$.next();
    this.destroy$.complete();
  }

  async getProducts(next:boolean){
    const requestVersion = ++this.productsRequestVersion;
    const filters = this.localStorage.getObject('selected_categories') as Category[] || [];
    if(next==false){
      this.loading=true;
    }
    if (!next) {
      this.state.clear();
    }

    const options: any = {
      "keywords": this.keywords,
      "filters": filters
    }
    const sortParam = this.getSortParam();
    if (sortParam !== undefined) {
      options.sort = sortParam;
    }

    try {
      const data = await this.paginationService.getItemsPaginated(
        this.page,
        this.PRODUCT_LIMIT,
        next,
        this.products,
        this.nextProducts,
        options,
        this.paginationService.getProducts.bind(this.paginationService)
      );

      if (requestVersion !== this.productsRequestVersion) {
        return;
      }

      const [products, nextProducts] = await Promise.all([
        this.api.getProductsDetails(data.items),
        this.api.getProductsDetails(data.nextItems)
      ]);

      if (requestVersion !== this.productsRequestVersion) {
        return;
      }

      this.products = products;
      this.nextProducts = nextProducts;
      this.refreshProcurementFilter();

      this.page = data.page;
      this.page_check = data.page_check;

      // SAVE STATE
      this.state.save({
        products: this.products,
        nextProducts: this.nextProducts,
        page: this.page,
        page_check: this.page_check,
        keywords: this.keywords
      });
    } finally {
      if (requestVersion === this.productsRequestVersion) {
        this.loading = false;
        this.loading_more = false;
      }
    }
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

  clearFilters(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    for (const f of storedFilters) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    for (const filter of this.toolbarFilters) {
      filter.selectedIds = [];
    }
    this.activeCategoryName = null;
    this.activeCategoryId = null;
    this.setPersistedActiveCategoryId(null);
    this.eventMessage.emitFiltersCommitted();
  }

  clearSubcategoryFilters(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    const pillIds = new Set<string>(
      this.toolbarFilters
        .filter(filter => filter.source === 'categoryRoot')
        .flatMap(filter => filter.options.map(option => option.id))
        .filter((id): id is string => !!id)
    );
    for (const f of storedFilters) {
      if (!f?.id) continue;
      if (String(f.id).includes('::')) continue;
      if (pillIds.has(f.id)) continue;
      if (f.id === this.activeCategoryId) continue;
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    this.eventMessage.emitFiltersCommitted();
  }

  async selectCategory(cat: Category | null): Promise<void> {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    for (const f of storedFilters) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    if (cat) {
      this.activeCategoryName = cat.name;
      this.activeCategoryId = cat.id ?? null;
      this.setPersistedActiveCategoryId(this.activeCategoryId);

      if (cat.id) {
        const children = await this.api.getCategoriesByParentId(cat.id).catch(() => []);
        const childList: Category[] = Array.isArray(children) ? children : [];
        for (const child of childList) {
          if (!child?.id) continue;
          this.localStorage.addCategoryFilter(child);
          this.eventMessage.emitAddedFilter(child);
        }
      }
    } else {
      this.activeCategoryName = null;
      this.activeCategoryId = null;
      this.setPersistedActiveCategoryId(null);
    }
    this.syncSelectionsFromStorage();
    this.eventMessage.emitFiltersCommitted();
    this.showCategoryDropdown = false;
  }

  private async loadRootCategories(): Promise<void> {
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];

      let primaryCategories: Category[] = [];
      if (this.primaryCategoriesMode === 'catalogFirstLevel') {
        primaryCategories = list;
      } else {
        const primaryRoot = list.find((c: any) => c?.name === this.primaryRootName);
        if (primaryRoot?.id) {
          const children = await this.api.getCategoriesByParentId(primaryRoot.id).catch(() => []);
          primaryCategories = Array.isArray(children) ? children : [];
        }
      }

      await Promise.all(
        this.toolbarFilters
          .filter(filter => filter.source === 'categoryRoot')
          .map(async filter => {
            const root = list.find((c: any) => c?.name === filter.rootName);
            const children = root?.id ? await this.api.getCategoriesByParentId(root.id).catch(() => []) : [];
            filter.options = Array.isArray(children) ? children : [];
          })
      );

      this.rootCategories = primaryCategories;
      this.syncSelectionsFromStorage();
    } catch {
      this.rootCategories = [];
      for (const filter of this.toolbarFilters) {
        if (filter.source === 'categoryRoot') {
          filter.options = [];
        }
      }
    }
  }

  private syncSelectionsFromStorage(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const selected: Category[] = Array.isArray(raw) ? raw as Category[] : [];
    const ids = new Set(selected.map(c => c?.id).filter((id): id is string => !!id));
    for (const filter of this.toolbarFilters) {
      filter.selectedIds = filter.options
        .map(option => option.id)
        .filter((id): id is string => !!id && ids.has(id));
    }
    const activeRoot = selected.find(c => !!c?.id && this.rootCategories.some(r => r.id === c.id));
    if (activeRoot) {
      this.activeCategoryName = activeRoot.name ?? null;
      this.activeCategoryId = activeRoot.id ?? null;
      this.setPersistedActiveCategoryId(this.activeCategoryId);
    } else {
      const persistedRootId = this.getPersistedActiveCategoryId();
      const persistedRoot = persistedRootId
        ? this.rootCategories.find(root => root?.id === persistedRootId)
        : undefined;
      if (persistedRoot) {
        this.activeCategoryName = persistedRoot.name ?? null;
        this.activeCategoryId = persistedRoot.id ?? null;
      } else {
        this.activeCategoryName = null;
        this.activeCategoryId = null;
        this.setPersistedActiveCategoryId(null);
      }
    }
    this.cdr.detectChanges();
  }

  private setPersistedActiveCategoryId(id: string | null): void {
    if (id) {
      this.localStorage.setItem(this.activeCategoryStorageKey, id);
    } else {
      this.localStorage.removeItem(this.activeCategoryStorageKey);
    }
  }

  private getPersistedActiveCategoryId(): string | null {
    return this.localStorage.getItem(this.activeCategoryStorageKey);
  }

  toggleCategoryDropdown(event?: Event): void {
    event?.stopPropagation();
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.closeDropdownsExcept('category');
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
      this.refreshProcurementFilter();
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
      this.refreshProcurementFilter();
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
      this.refreshProcurementFilter();
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
