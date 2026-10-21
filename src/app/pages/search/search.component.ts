import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeedbackInfo, LoginInfo } from 'src/app/models/interfaces';
import { LoginServiceService } from "src/app/services/login-service.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { Category } from "../../models/interfaces";
import { components } from "../../models/product-catalog";
import { EventMessageService } from "../../services/event-message.service";
import { LocalStorageService } from "../../services/local-storage.service";
import { SearchStateService } from "../../services/search-state.service";
type ProductOffering = components["schemas"]["ProductOffering"];

import { PriceServiceService } from 'src/app/services/price-service.service';
import { availableFilters, searchCategoriesConfig, SEARCH_ACTIVE_CATEGORY_STORAGE_KEY } from 'src/app/data/availableFilters';
import { iconForCategory } from 'src/app/data/categoryIcons';
import { ThemeService } from 'src/app/services/theme.service';

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

  products: ProductOffering[] = [];
  nextProducts: ProductOffering[] = [];
  loading: boolean = false;
  loading_more: boolean = false;
  page_check: boolean = true;
  page: number = 0;
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  DFT_CATALOG: String = environment.DFT_CATALOG_ID;
  showDrawer: boolean = false;
  searchEnabled = environment.SEARCH_ENABLED;
  keywords: any = undefined;
  searchField = new FormControl();
  showPanel = false;
  feedback: boolean = false;
  providerThemeName = environment.providerThemeName;
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
  private readonly activeCategoryStorageKey = SEARCH_ACTIVE_CATEGORY_STORAGE_KEY;

  showSortDropdown = false;
  sortOption: 'name' | 'date_new' | 'date_old' = 'date_new';
  sortOptions: { value: 'name' | 'date_new' | 'date_old'; label: string }[] = [
    { value: 'date_new', label: 'Newest first' },
    { value: 'date_old', label: 'Oldest first' },
    { value: 'name', label: 'Name' },
  ];

  get sortLabel(): string {
    return this.sortOptions.find(o => o.value === this.sortOption)?.label ?? 'Name';
  }
  marketplaceHomeUrl = '/search';


  constructor(
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private loginService: LoginServiceService,
    private paginationService: PaginationService,
    private state: SearchStateService,
    private priceService: PriceServiceService,
    private themeService: ThemeService) {
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
          await this.getProducts(false);
          this.checkPanel();
        }
      })
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'CloseFeedback') {
          this.feedback = false;
        }
      })
  }

  async ngOnInit() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.marketplaceHomeUrl = theme?.links?.marketplaceHomeUrl || '/search';
      });

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

    this.products = [];
    this.nextProducts = [];
    /*await this.api.slaCheck().then(data => {
      console.log(data)
    })*/
    this.checkPanel();
    this.loadRootCategories();
    if (this.route.snapshot.paramMap.get('keywords')) {
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
    await this.getProducts(false);


    /*await this.eventMessage.messages$.subscribe(async ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        console.log('event filter')
        await this.getProducts(false);
      }
    })*/

    let input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', async e => {
        if (this.searchField.value == '') {
          this.keywords = undefined;
          this.updateQueryParams(this.keywords)
          await this.getProducts(false);
        }
      });
    }
    setTimeout(() => {
      const userInfo = this.localStorage.getObject('login_items') as LoginInfo;
      //this.localStorage.setObject('feedback', {});

      // The user is logged in
      if ((JSON.stringify(userInfo) != '{}' && (((userInfo.expire - moment().unix()) - 4) > 0))) {
        if (environment.feedbackCampaign) {
          let feedbackInfo = this.localStorage.getObject('feedback') as FeedbackInfo;
          console.log('---------------------- feedbackInfo')
          console.log(feedbackInfo)

          if (JSON.stringify(feedbackInfo) === '{}') {
            let wantsFeedback = {
              "expire": environment?.feedbackCampaignExpiration ?? moment().add(1, 'week').unix(),
            }
            this.localStorage.setObject('feedback', wantsFeedback);
            this.feedback = true;
          } else {
            if ("expire" in feedbackInfo) {
              let expiration = feedbackInfo?.expire ?? 0
              if (((expiration - moment().unix()) - 4) < 0 && ((environment.feedbackCampaignExpiration - moment().unix()) - 4) > 0) {
                let wantsFeedback: FeedbackInfo = {
                  "expire": environment?.feedbackCampaignExpiration,
                }
                if ("approval" in feedbackInfo) {
                  wantsFeedback.approval = feedbackInfo.approval
                }
                this.localStorage.setObject('feedback', wantsFeedback)
              }
            } else {
              let wantsFeedback: FeedbackInfo = {
                "expire": environment?.feedbackCampaignExpiration,
              }
              if ("approval" in feedbackInfo) {
                wantsFeedback.approval = feedbackInfo.approval
              }
              this.localStorage.setObject('feedback', wantsFeedback)
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
    if (this.showDrawer) {
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
    // Local sort intentionally disabled to avoid client-side reordering
    // when new paginated batches are appended.
    // return this.applySort(items);
    return items;
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
      case 'date_new': return '-lastUpdate';
      case 'date_old': return 'lastUpdate';
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
    await this.getProducts(false);
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
        ? (filter.children ?? []).map(child => ({ id: `${filter.name}::${child.name}`, name: child.label ?? child.name }))
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

  ngOnDestroy() {
    this.productsRequestVersion = 0;

    if (this.navigatingToDetail) {
      return;
    }

    let storedFilters = this.localStorage.getObject('selected_categories') as Category[] || [];
    for (let i = 0; i < storedFilters.length; i++) {
      this.localStorage.removeCategoryFilter(storedFilters[i]);
      this.eventMessage.emitRemovedFilter(storedFilters[i]);
    }
    this.setPersistedActiveCategoryId(null);

    this.state.clear();

    this.destroy$.next();
    this.destroy$.complete();
  }

  async getProducts(next: boolean) {
    const requestVersion = ++this.productsRequestVersion;
    const filters = this.localStorage.getObject('selected_categories') as Category[] || [];
    if (next == false) {
      this.loading = true;
    }
    if (!next) {
      this.state.clear();
    }

    const options: any = {
      "keywords": this.keywords,
      "filters": filters
    }
    // const sortParam = this.searchEnabled ? this.getSortParam() : undefined;
    // if (sortParam !== undefined) {
    //   options.sort = sortParam;
    // }

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

      // On "load more", data.items is already enriched: it's this.products merged with the
      // previously-prefetched (and already-enriched) this.nextProducts. Only the freshly
      // fetched data.nextItems (the next prefetch page) is still raw and needs enriching -
      // re-enriching data.items too would redo work for every item ever loaded on each click.
      const [products, nextProducts] = await Promise.all([
        next ? Promise.resolve(data.items) : this.api.getProductsDetails(data.items),
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

  async next() {
    this.loading_more = true;
    await this.getProducts(true);
  }

  async filterSearch(event: any) {
    event.preventDefault()
    if (this.searchField.value != '' && this.searchField.value != null) {
      console.log('FILTER KEYWORDS')
      this.keywords = this.searchField.value;
      this.updateQueryParams(this.keywords)
      //let filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
      await this.getProducts(false);
    } else {
      console.log('EMPTY  FILTER KEYWORDS')
      this.keywords = undefined;
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
    const filters = this.localStorage.getObject('selected_categories') as Category[] || [];
    const oldState = this.showPanel;
    this.showPanel = filters.length > 0;
    if (this.showPanel != oldState) {
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

    // Keep current category scope after clearing subcategories.
    if (this.activeCategoryId) {
      const updatedRaw = this.localStorage.getObject('selected_categories');
      const updatedFilters: Category[] = Array.isArray(updatedRaw) ? updatedRaw : [];
      const hasParent = updatedFilters.some(f => f?.id === this.activeCategoryId);
      if (!hasParent) {
        const parentFilter: Category = {
          id: this.activeCategoryId,
          name: this.activeCategoryName || 'Category'
        };
        this.localStorage.addCategoryFilter(parentFilter);
        this.eventMessage.emitAddedFilter(parentFilter);
      }
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

  async onUnifiedSearch(event: any): Promise<void> {
    event.preventDefault();

    const keywords = this.searchField.value?.trim() || undefined;
    this.keywords = keywords;
    this.updateQueryParams(this.keywords);
    await this.getProducts(false);
  }

}
