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
import { availableFilters } from 'src/app/data/availableFilters';
import { iconForCategory } from 'src/app/data/categoryIcons';

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

  showComplianceDropdown = false;
  complianceFilterKey = 'compliance_profile';
  complianceLevels: string[] = [];
  selectedComplianceLevels: string[] = [];

  showProcurementDropdown = false;
  procurementFilterKey = 'procurement_type';
  procurementTypes: string[] = [];
  selectedProcurementTypes: string[] = [];
  private procurementCache = new Map<string, boolean>();

  showDeliveryModelDropdown = false;
  deliveryModelOptions: Category[] = [];
  selectedDeliveryModelIds: string[] = [];

  showSectorDropdown = false;
  sectorOptions: Category[] = [];
  selectedSectorIds: string[] = [];

  showFrameworkDropdown = false;
  frameworkOptions: Category[] = [];
  selectedFrameworkIds: string[] = [];

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
    const complianceFilter = availableFilters.find(f => f.name === this.complianceFilterKey);
    this.complianceLevels = (complianceFilter?.children ?? []).map(c => c.name);
    const procurementFilter = availableFilters.find(f => f.name === this.procurementFilterKey);
    this.procurementTypes = (procurementFilter?.children ?? []).map(c => c.name);
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
    const anyOpen = this.showCategoryDropdown || this.showComplianceDropdown ||
      this.showProcurementDropdown || this.showSortDropdown ||
      this.showDeliveryModelDropdown || this.showSectorDropdown || this.showFrameworkDropdown;
    if (anyOpen) {
      this.closeDropdownsExcept('none');
      this.cdr.detectChanges();
    }
  }

  get visibleProducts(): ProductOffering[] {
    let items = this.products;
    if (this.selectedProcurementTypes.length > 0) {
      items = items.filter(p => {
        const key = (p as any).id;
        if (!key) return true;
        const isCustom = this.procurementCache.get(key);
        if (isCustom === undefined) return false;
        const label = isCustom ? 'Request Quote' : 'Ready to Buy';
        return this.selectedProcurementTypes.includes(label);
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

  private closeDropdownsExcept(keep: 'category' | 'compliance' | 'procurement' | 'sort' | 'delivery' | 'sector' | 'framework' | 'none'): void {
    if (keep !== 'category') this.showCategoryDropdown = false;
    if (keep !== 'compliance') this.showComplianceDropdown = false;
    if (keep !== 'procurement') this.showProcurementDropdown = false;
    if (keep !== 'sort') this.showSortDropdown = false;
    if (keep !== 'delivery') this.showDeliveryModelDropdown = false;
    if (keep !== 'sector') this.showSectorDropdown = false;
    if (keep !== 'framework') this.showFrameworkDropdown = false;
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

  toggleProcurementDropdown(event: Event): void {
    event.stopPropagation();
    this.showProcurementDropdown = !this.showProcurementDropdown;
    this.closeDropdownsExcept('procurement');
  }

  isProcurementTypeSelected(type: string): boolean {
    return this.selectedProcurementTypes.includes(type);
  }

  async toggleProcurementType(type: string, event: Event): Promise<void> {
    event.stopPropagation();
    const idx = this.selectedProcurementTypes.indexOf(type);
    if (idx > -1) {
      this.selectedProcurementTypes.splice(idx, 1);
    } else {
      this.selectedProcurementTypes.push(type);
    }
    if (this.selectedProcurementTypes.length > 0) {
      await this.resolveProcurementCache(this.products);
    }
    this.cdr.detectChanges();
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
    if (this.selectedProcurementTypes.length === 0) return;
    this.resolveProcurementCache(this.products).then(() => this.cdr.detectChanges());
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
    
    let options: any = {
      "keywords": this.keywords,
      "filters": filters
    }
    const sortParam = this.getSortParam();
    if (sortParam !== undefined) {
      options.sort = sortParam;
    }

    this.paginationService.getItemsPaginated(this.page, this.PRODUCT_LIMIT, next, this.products,this.nextProducts, options,
      this.paginationService.getProducts.bind(this.paginationService)).then(async data => {
        this.products = await this.api.getProductsDetails(data.items);
        this.nextProducts = await this.api.getProductsDetails(data.nextItems);
        this.refreshProcurementFilter();
      
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

  clearFilters(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    for (const f of storedFilters) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    this.selectedComplianceLevels = [];
    this.selectedProcurementTypes = [];
    this.selectedDeliveryModelIds = [];
    this.selectedSectorIds = [];
    this.selectedFrameworkIds = [];
    this.activeCategoryName = null;
    this.activeCategoryId = null;
  }

  clearSubcategoryFilters(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    const pillIds = new Set<string>([
      ...this.deliveryModelOptions.map(o => o.id).filter((id): id is string => !!id),
      ...this.sectorOptions.map(o => o.id).filter((id): id is string => !!id),
      ...this.frameworkOptions.map(o => o.id).filter((id): id is string => !!id),
    ]);
    for (const f of storedFilters) {
      if (!f?.id) continue;
      if (String(f.id).includes('::')) continue;
      if (pillIds.has(f.id)) continue;
      if (f.id === this.activeCategoryId) continue;
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
  }

  async selectCategory(cat: Category | null): Promise<void> {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    for (const f of storedFilters) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    if (cat) {
      this.localStorage.addCategoryFilter(cat);
      this.eventMessage.emitAddedFilter(cat);
      this.activeCategoryName = cat.name;
      this.activeCategoryId = cat.id ?? null;

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
    }
    this.showCategoryDropdown = false;
  }

  private async loadRootCategories(): Promise<void> {
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];

      const domeRoot = list.find((c: any) => c?.name === 'DOME Categories');
      const deliveryRoot = list.find((c: any) => c?.name === 'Delivery Model');
      const sectorRoot = list.find((c: any) => c?.name === 'Sector');
      const frameworkRoot = list.find((c: any) => c?.name === 'Framework');

      const [domeChildren, deliveryChildren, sectorChildren, frameworkChildren] = await Promise.all([
        domeRoot?.id ? this.api.getCategoriesByParentId(domeRoot.id).catch(() => []) : Promise.resolve([]),
        deliveryRoot?.id ? this.api.getCategoriesByParentId(deliveryRoot.id).catch(() => []) : Promise.resolve([]),
        sectorRoot?.id ? this.api.getCategoriesByParentId(sectorRoot.id).catch(() => []) : Promise.resolve([]),
        frameworkRoot?.id ? this.api.getCategoriesByParentId(frameworkRoot.id).catch(() => []) : Promise.resolve([]),
      ]);

      this.rootCategories = Array.isArray(domeChildren) ? domeChildren : [];
      this.deliveryModelOptions = Array.isArray(deliveryChildren) ? deliveryChildren : [];
      this.sectorOptions = Array.isArray(sectorChildren) ? sectorChildren : [];
      this.frameworkOptions = Array.isArray(frameworkChildren) ? frameworkChildren : [];
      this.syncSelectionsFromStorage();
    } catch {
      this.rootCategories = [];
      this.deliveryModelOptions = [];
      this.sectorOptions = [];
      this.frameworkOptions = [];
    }
  }

  private syncSelectionsFromStorage(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const selected: Category[] = Array.isArray(raw) ? raw as Category[] : [];
    this.syncPillSelectionsFromStorage(selected);
    const activeRoot = selected.find(c => !!c?.id && this.rootCategories.some(r => r.id === c.id));
    if (activeRoot) {
      this.activeCategoryName = activeRoot.name ?? null;
      this.activeCategoryId = activeRoot.id ?? null;
    }
    this.cdr.detectChanges();
  }

  toggleCategoryDropdown(event?: Event): void {
    event?.stopPropagation();
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.closeDropdownsExcept('category');
  }

  toggleComplianceDropdown(event: Event): void {
    event.stopPropagation();
    this.showComplianceDropdown = !this.showComplianceDropdown;
    this.closeDropdownsExcept('compliance');
  }

  isComplianceLevelSelected(level: string): boolean {
    return this.selectedComplianceLevels.includes(level);
  }

  toggleComplianceLevel(level: string, event: Event): void {
    event.stopPropagation();
    const cat: Category = { id: `${this.complianceFilterKey}::${level}`, name: level };
    const idx = this.selectedComplianceLevels.indexOf(level);
    if (idx > -1) {
      this.selectedComplianceLevels.splice(idx, 1);
      this.localStorage.removeCategoryFilter(cat);
      this.eventMessage.emitRemovedFilter(cat);
    } else {
      this.selectedComplianceLevels.push(level);
      this.localStorage.addCategoryFilter(cat);
      this.eventMessage.emitAddedFilter(cat);
    }
  }

  toggleDeliveryModelDropdown(event: Event): void {
    event.stopPropagation();
    this.showDeliveryModelDropdown = !this.showDeliveryModelDropdown;
    this.closeDropdownsExcept('delivery');
  }

  toggleSectorDropdown(event: Event): void {
    event.stopPropagation();
    this.showSectorDropdown = !this.showSectorDropdown;
    this.closeDropdownsExcept('sector');
  }

  toggleFrameworkDropdown(event: Event): void {
    event.stopPropagation();
    this.showFrameworkDropdown = !this.showFrameworkDropdown;
    this.closeDropdownsExcept('framework');
  }

  isDeliveryModelSelected(option: Category): boolean {
    return !!option?.id && this.selectedDeliveryModelIds.includes(option.id);
  }

  isSectorSelected(option: Category): boolean {
    return !!option?.id && this.selectedSectorIds.includes(option.id);
  }

  isFrameworkSelected(option: Category): boolean {
    return !!option?.id && this.selectedFrameworkIds.includes(option.id);
  }

  toggleDeliveryModel(option: Category, event: Event): void {
    this.togglePillOption(option, event, this.selectedDeliveryModelIds);
  }

  toggleSector(option: Category, event: Event): void {
    this.togglePillOption(option, event, this.selectedSectorIds);
  }

  toggleFramework(option: Category, event: Event): void {
    this.togglePillOption(option, event, this.selectedFrameworkIds);
  }

  private togglePillOption(option: Category, event: Event, selectedIds: string[]): void {
    event.stopPropagation();
    if (!option?.id) return;
    const idx = selectedIds.indexOf(option.id);
    if (idx > -1) {
      selectedIds.splice(idx, 1);
      this.localStorage.removeCategoryFilter(option);
      this.eventMessage.emitRemovedFilter(option);
    } else {
      selectedIds.push(option.id);
      this.localStorage.addCategoryFilter(option);
      this.eventMessage.emitAddedFilter(option);
    }
  }

  clearDeliveryModelSelection(event: Event): void {
    this.clearPillSelection(event, this.selectedDeliveryModelIds, this.deliveryModelOptions);
  }

  clearSectorSelection(event: Event): void {
    this.clearPillSelection(event, this.selectedSectorIds, this.sectorOptions);
  }

  clearFrameworkSelection(event: Event): void {
    this.clearPillSelection(event, this.selectedFrameworkIds, this.frameworkOptions);
  }

  private clearPillSelection(event: Event, selectedIds: string[], options: Category[]): void {
    event.stopPropagation();
    const idsToRemove = [...selectedIds];
    selectedIds.length = 0;
    for (const id of idsToRemove) {
      const option = options.find(o => o.id === id);
      if (option) {
        this.localStorage.removeCategoryFilter(option);
        this.eventMessage.emitRemovedFilter(option);
      }
    }
  }

  private syncPillSelectionsFromStorage(selected: Category[]): void {
    const ids = new Set(selected.map(c => c?.id).filter((id): id is string => !!id));
    this.selectedDeliveryModelIds = this.deliveryModelOptions
      .map(o => o.id)
      .filter((id): id is string => !!id && ids.has(id));
    this.selectedSectorIds = this.sectorOptions
      .map(o => o.id)
      .filter((id): id is string => !!id && ids.has(id));
    this.selectedFrameworkIds = this.frameworkOptions
      .map(o => o.id)
      .filter((id): id is string => !!id && ids.has(id));
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
