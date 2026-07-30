import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ElementRef, HostListener, ViewChild, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {EventMessageService} from "../../services/event-message.service";
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { availableFilters, searchCategoriesConfig } from 'src/app/data/availableFilters';
import { Category } from 'src/app/models/interfaces';
import { faEarthAmericas } from '@fortawesome/free-solid-svg-icons';
import { iconForCategory } from 'src/app/data/categoryIcons';
import { PaginationService } from 'src/app/services/pagination.service';

type ToolbarFilter = {
  key: string;
  label: string;
  source: 'configured' | 'categoryRoot';
  rootName?: string;
  options: Category[];
  selectedIds: string[];
  open: boolean;
  dropTop?: number | null;
};

type OrganizationDetailsMode = 'catalog' | 'organization';

@Component({
  selector: 'app-organization-details',
  templateUrl: './organization-details.component.html',
  styleUrl: './organization-details.component.css'
})
export class OrganizationDetailsComponent implements OnInit, AfterViewInit, OnDestroy {

  id:any;
  mode: OrganizationDetailsMode = 'organization';
  notFound = false;
  orgInfo:any;
  logo:any=undefined;
  readonly DEFAULT_LOGO = 'assets/images/Dome-Marketplace.svg';
  get isDefaultLogo(): boolean { return this.logo === this.DEFAULT_LOGO; }
  get hasContact(): boolean { return !!(this.email || this.website || this.address || this.phone); }
  get contactCount(): number { return [this.email, this.website, this.address, this.phone].filter(Boolean).length; }
  description:any=undefined;
  website:any;
  country:any;
  email:string='';
  phone:string='';
  address:string='';
  servicesCount:number=0;
  protected readonly faEarthAmericas = faEarthAmericas;
  protected readonly iconForCategory = iconForCategory;

  serviceSearch = new FormControl();
  serviceKeywords: string | undefined;
  toolbarFilters: ToolbarFilter[] = [];

  private allServices: any[] = [];
  private nextServices: any[] = [];
  services: any[] = [];
  serviceCount = 0;
  servicesLoading = false;
  loading_more = false;
  page_check = false;
  private servicesPage = 0;
  rootCategories: Category[] = [];
  activeCategoryName: string | null = null;
  activeCategoryId: string | null = null;
  showCategoryDropdown = false;
  showSummaryBar = false;
  @ViewChild('providerHero') providerHero?: ElementRef<HTMLElement>;
  @ViewChild('summaryBar') summaryBar?: ElementRef<HTMLElement>;
  @ViewChild('servicesSection') servicesSection?: ElementRef<HTMLElement>;
  @ViewChild('descPara') descPara?: ElementRef<HTMLElement>;
  descTruncated = false;
  showDescModal = false;
  showCategoriesOverlay = false;
  private overlaySnapshot: Category[] = [];
  get selectedCategoryCount(): number {
    const raw = this.localStorage.getObject('selected_categories');
    return Array.isArray(raw) ? raw.length : 0;
  }
  private readonly HEADER_HEIGHT = 88;
  serviceSort: 'relevance' | 'name' | 'date' = 'relevance';
  showServiceSort = false;
  serviceSortOptions: { value: 'relevance' | 'name' | 'date'; label: string }[] = [
    { value: 'relevance', label: 'ORGANIZATION._sort_relevance' },
    { value: 'name',      label: 'ORGANIZATION._sort_name' },
    { value: 'date',      label: 'ORGANIZATION._sort_date' },
  ];
  get serviceSortLabel() { return this.serviceSortOptions.find(o => o.value === this.serviceSort)?.label ?? ''; }

  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private elementRef: ElementRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private accService: AccountServiceService,
    private location: Location,
    private api: ApiServiceService,
    private paginationService: PaginationService,
    private renderer: Renderer2
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'FiltersCommitted') {
        this.reloadServices();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.serviceSearch.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => { if (!v) { this.serviceKeywords = undefined; this.reloadServices(); } });
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.id = params.get('id');
      this.mode = this.route.snapshot.data['mode'] === 'catalog' ? 'catalog' : 'organization';
      this.resetPageState();
      this.loadPage();
    });
  }

  private resetPageState(): void {
    this.notFound = false;
    this.orgInfo = undefined;
    this.logo = undefined;
    this.description = undefined;
    this.website = undefined;
    this.country = undefined;
    this.email = '';
    this.phone = '';
    this.address = '';
    this.servicesCount = 0;
    this.allServices = [];
    this.nextServices = [];
    this.services = [];
    this.serviceCount = 0;
    this.loading_more = false;
    this.page_check = false;
    this.servicesPage = 0;
    this.activeCategoryName = null;
    this.activeCategoryId = null;
    this.showCategoryDropdown = false;
    this.showSummaryBar = false;
    this.descTruncated = false;
    this.showDescModal = false;
    this.showCategoriesOverlay = false;
    this.serviceKeywords = undefined;
    this.serviceSearch.reset(undefined, { emitEvent: false });
    this.localStorage.setObject('selected_categories', []);
    this.initToolbarFilters();
  }

  private loadPage(): void {
    if (this.mode === 'catalog') {
      this.loadCatalogPage();
    } else {
      this.loadOrganizationPage();
    }
  }

  private async loadCatalogPage(): Promise<void> {
    const catalogId = this.id;
    const requestKey = this.currentRequestKey();
    let owner: any;
    try {
      const catalog = await this.api.getCatalog(catalogId);
      if (this.currentRequestKey() !== requestKey) { return; }
      const parties: any[] = catalog?.relatedParty ?? [];
      owner = parties.find((p: any) => p?.role === environment.SELLER_ROLE)
        ?? parties.find((p: any) => p?.id && String(p.id).includes('organization'));
    } catch (err) {
      console.warn('Catalog unavailable:', err);
    }
    if (this.currentRequestKey() !== requestKey) { return; }
    if (!owner?.id) {
      this.notFound = true;
      return;
    }
    await this.loadOwnerInfo(owner.id, requestKey);
    if (this.currentRequestKey() !== requestKey) { return; }
    await this.loadServicesPage(false, requestKey);
    if (this.currentRequestKey() !== requestKey) { return; }
    this.loadRootCategories();
  }

  private async loadOrganizationPage(): Promise<void> {
    const orgId = this.id;
    const requestKey = this.currentRequestKey();

    if (!orgId) {
      this.notFound = true;
      return;
    }

    await this.loadOwnerInfo(orgId, requestKey);
    if (this.currentRequestKey() !== requestKey || this.notFound) { return; }
    await this.loadServicesPage(false, requestKey);
    if (this.currentRequestKey() !== requestKey) { return; }
    this.loadRootCategories();
  }

  private currentRequestKey(): string {
    return `${this.mode}:${this.id ?? ''}`;
  }

  private loadOwnerInfo(ownerId: string, requestKey: string): Promise<void> {
    return this.accService.getOrgInfo(ownerId).then(org => {
      if (this.currentRequestKey() !== requestKey) { return; }
      this.orgInfo=org;
      console.log(this.orgInfo)
      const chars = this.orgInfo?.partyCharacteristic ?? [];
      for(let i=0; i<chars.length;i++){
        if(chars[i].name=='logo'){
          this.logo=chars[i].value
        }
        if(chars[i].name=='website'){
          this.website=chars[i].value
        }
        if(chars[i].name=='description'){
          this.description=chars[i].value
        }
      }
      if (!this.logo) {
        this.logo = this.DEFAULT_LOGO;
      }
      this.email = ''; this.phone = ''; this.address = ''; this.country = '';
      for (const m of (org?.contactMedium ?? [])) {
        const c = m?.characteristic ?? {};
        if (m?.mediumType === 'Email') this.email = c.emailAddress ?? '';
        if (m?.mediumType === 'TelephoneNumber' || m?.mediumType === 'Phone') this.phone = c.phoneNumber ?? this.phone;
        if (m?.mediumType === 'PostalAddress') {
          this.country = c.country ?? '';
          this.address = [c.street1, [c.postCode, c.city].filter(Boolean).join(' '), c.stateOrProvince, c.country].filter(Boolean).join(', ');
        }
      }
      this.cdr.detectChanges();
      setTimeout(() => {
        const el = this.descPara?.nativeElement;
        this.descTruncated = !!el && el.scrollHeight > el.clientHeight + 1;
        this.cdr.detectChanges();
      });
    }).catch(err => {
      if (this.currentRequestKey() !== requestKey) { return; }
      console.warn('Organization unavailable:', err);
      this.notFound = true;
    })
  }

  ngAfterViewInit(): void {
    const el = this.summaryBar?.nativeElement;
    const nav = document.querySelector('bae-header nav');
    if (el && nav) {
      this.renderer.appendChild(nav, el);
    }
  }

  ngOnDestroy(): void {
    const el = this.summaryBar?.nativeElement;
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
    const stored = this.localStorage.getObject('selected_categories') as Category[] || [];
    for (const f of (Array.isArray(stored) ? stored : [])) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  back(){
    this.location.back();
  }

  openDescModal(event: Event){
    event.stopPropagation();
    this.showDescModal = true;
  }

  openCategoriesOverlay(event: Event): void {
    event.stopPropagation();
    const raw = this.localStorage.getObject('selected_categories');
    this.overlaySnapshot = Array.isArray(raw) ? [...raw] : [];
    this.showCategoriesOverlay = true;
  }

  clearOverlayCategories(): void {
    const raw = this.localStorage.getObject('selected_categories');
    for (const f of (Array.isArray(raw) ? raw : []) as Category[]) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    this.eventMessage.emitFiltersCommitted();
  }

  applyCategoriesOverlay(): void {
    this.showCategoriesOverlay = false;
  }

  cancelCategoriesOverlay(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const current: Category[] = Array.isArray(raw) ? raw : [];
    const snapIds = new Set(this.overlaySnapshot.map(c => c?.id).filter(Boolean));
    const currIds = new Set(current.map(c => c?.id).filter(Boolean));
    for (const f of current) {
      if (f?.id && !snapIds.has(f.id)) { this.localStorage.removeCategoryFilter(f); this.eventMessage.emitRemovedFilter(f); }
    }
    for (const f of this.overlaySnapshot) {
      if (f?.id && !currIds.has(f.id)) { this.localStorage.addCategoryFilter(f); this.eventMessage.emitAddedFilter(f); }
    }
    this.showCategoriesOverlay = false;
    this.eventMessage.emitFiltersCommitted();
  }

  closeDescModal(){
    this.showDescModal = false;
  }

  browseServices(){
    const target = this.servicesSection?.nativeElement;
    if (!target) { return; }
    const barHeight = this.summaryBar?.nativeElement?.offsetHeight ?? 0;
    const offset = this.HEADER_HEIGHT + barHeight;
    const y = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
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
    const willOpen = !filter.open;
    for (const f of this.toolbarFilters) f.open = false;
    filter.dropTop = window.innerWidth < 640
      ? Math.round((event.currentTarget as HTMLElement).getBoundingClientRect().bottom)
      : null;
    filter.open = willOpen;
  }

  filterServices(): void {
    this.serviceKeywords = this.serviceSearch.value || undefined;
    this.reloadServices();
  }

  clearServiceFilters(): void {
    for (const f of this.toolbarFilters) { f.selectedIds = []; f.open = false; }
    this.serviceKeywords = undefined;
    this.serviceSearch.reset();
    this.reloadServices();
  }

  private async loadRootCategories(): Promise<void> {
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];
      let primaryCategories: Category[] = [];
      if (searchCategoriesConfig.primaryCategoriesMode === 'catalogFirstLevel') {
        primaryCategories = list;
      } else {
        const primaryRoot = list.find((c: any) => c?.name === searchCategoriesConfig.primaryRootName);
        if (primaryRoot?.id) {
          const children = await this.api.getCategoriesByParentId(primaryRoot.id).catch(() => []);
          primaryCategories = Array.isArray(children) ? children : [];
        }
      }
      await Promise.all(
        this.toolbarFilters
          .filter(f => f.source === 'categoryRoot')
          .map(async f => {
            const root = list.find((c: any) => c?.name === f.rootName);
            const children = root?.id ? await this.api.getCategoriesByParentId(root.id).catch(() => []) : [];
            f.options = Array.isArray(children) ? children : [];
          })
      );
      this.rootCategories = primaryCategories;
    } catch {
      this.rootCategories = [];
    }
  }

  isToolbarOptionSelected(filter: ToolbarFilter, option: Category): boolean {
    return !!option?.id && filter.selectedIds.includes(option.id);
  }

  toggleToolbarOption(filter: ToolbarFilter, option: Category, event: Event): void {
    event.stopPropagation();
    if (!option?.id) return;
    const idx = filter.selectedIds.indexOf(option.id);
    if (idx > -1) filter.selectedIds.splice(idx, 1);
    else filter.selectedIds.push(option.id);
    this.reloadServices();
  }

  clearToolbarFilterSelection(filter: ToolbarFilter, event: Event): void {
    event.stopPropagation();
    filter.selectedIds = [];
    this.reloadServices();
  }

  toggleCategoryDropdown(event: Event): void {
    event.stopPropagation();
    this.showCategoryDropdown = !this.showCategoryDropdown;
    for (const f of this.toolbarFilters) f.open = false;
    this.showServiceSort = false;
  }

  async selectCategory(cat: Category | null): Promise<void> {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    for (const f of storedFilters) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    if (cat) {
      this.activeCategoryName = cat.name ?? null;
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
    this.eventMessage.emitFiltersCommitted();
  }

  get categoryFilterCatalogId(): string | undefined {
    return this.mode === 'catalog' ? this.id : undefined;
  }

  async next(): Promise<void> {
    await this.loadServicesPage(true, this.currentRequestKey());
  }

  private reloadServices(): void {
    if (!this.id) { return; }
    this.loadServicesPage(false, this.currentRequestKey());
  }

  private async loadServicesPage(next: boolean, requestKey: string): Promise<void> {
    if (next && (!this.page_check || this.loading_more)) { return; }
    if (next) {
      this.loading_more = true;
    } else {
      this.servicesLoading = true;
      this.loading_more = false;
      this.page_check = false;
      this.allServices = [];
      this.nextServices = [];
      this.servicesPage = 0;
      this.applyServiceView();
    }

    try {
      const data = await this.paginationService.getItemsPaginated(
        this.servicesPage,
        environment.PRODUCT_LIMIT,
        next,
        this.allServices,
        this.nextServices,
        this.getServicePaginationOptions(),
        this.getServicePaginationHandler()
      );
      if (this.currentRequestKey() !== requestKey) { return; }

      this.allServices = await this.api.getProductsDetails(data.items ?? []);
      this.nextServices = await this.api.getProductsDetails(data.nextItems ?? []);
      this.servicesPage = data.page;
      this.page_check = data.page_check;
    } catch (err) {
      if (this.currentRequestKey() !== requestKey) { return; }
      console.warn('Offers unavailable:', err);
      if (!next) {
        this.allServices = [];
        this.nextServices = [];
        this.page_check = false;
      }
    } finally {
      if (this.currentRequestKey() !== requestKey) { return; }
      this.applyServiceView();
      this.servicesLoading = false;
      this.loading_more = false;
      this.cdr.detectChanges();
    }
  }

  private getSelectedServiceFilters(): Category[] {
    const selected: Category[] = [];
    const byId = new Set<string>();
    const stored = this.localStorage.getObject('selected_categories') as Category[] || [];

    const add = (cat: Category | undefined) => {
      if (!cat?.id || byId.has(cat.id)) { return; }
      byId.add(cat.id);
      selected.push(cat);
    };

    for (const cat of (Array.isArray(stored) ? stored : [])) {
      add(cat);
    }

    for (const filter of this.toolbarFilters) {
      for (const id of filter.selectedIds) {
        const option = filter.options.find(opt => opt.id === id);
        add(option);
      }
    }

    return selected;
  }

  private getServicePaginationOptions(): any {
    if (this.mode === 'catalog') {
      return {
        keywords: this.serviceKeywords,
        filters: this.getSelectedServiceFilters(),
        catalogId: this.id
      };
    }

    return {
      keywords: this.serviceKeywords,
      filters: this.getSelectedServiceFilters(),
      partyId: this.id
    };
  }

  private getServicePaginationHandler(): (...params: any[]) => Promise<any> {
    return this.mode === 'catalog'
      ? this.paginationService.getProductsByCatalog.bind(this.paginationService)
      : this.api.getLaunchedProductOffersByOwnerAndCategory.bind(this.api);
  }

  private applyServiceView(): void {
    let list = [...this.allServices];
    const q = (this.serviceKeywords ?? '').toLowerCase();
    if (q) {
      list = list.filter(o => (o?.name ?? '').toLowerCase().includes(q) || (o?.description ?? '').toLowerCase().includes(q));
    }
    if (this.serviceSort === 'name') {
      list.sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''));
    } else if (this.serviceSort === 'date') {
      list.sort((a, b) => this.serviceDate(b) - this.serviceDate(a));
    }
    this.services = list;
    this.serviceCount = list.length;
    this.servicesCount = this.allServices.length;
  }

  private serviceDate(o: any): number {
    const d = o?.validFor?.startDateTime || o?.lastUpdate;
    return d ? new Date(d).getTime() : 0;
  }

  toggleServiceSort(event: Event): void {
    event.stopPropagation();
    this.showServiceSort = !this.showServiceSort;
  }

  selectServiceSort(v: 'relevance' | 'name' | 'date', event: Event): void {
    event.stopPropagation();
    this.serviceSort = v;
    this.showServiceSort = false;
    this.applyServiceView();
  }

  @HostListener('window:scroll') onScroll(): void {
    const bottom = this.providerHero?.nativeElement.getBoundingClientRect().bottom;
    const next = bottom !== undefined && bottom <= this.HEADER_HEIGHT;
    if (next !== this.showSummaryBar) {
      this.showSummaryBar = next;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:click') onDocClick(): void {
    let changed = false;
    if (this.toolbarFilters.some(f => f.open)) { for (const f of this.toolbarFilters) f.open = false; changed = true; }
    if (this.showServiceSort) { this.showServiceSort = false; changed = true; }
    if (this.showCategoryDropdown) { this.showCategoryDropdown = false; changed = true; }
    if (changed) this.cdr.detectChanges();
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
