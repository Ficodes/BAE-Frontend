import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
type Catalog = components["schemas"]["Catalog"];
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';
import {EventMessageService} from "../../services/event-message.service";
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { ThemeService } from 'src/app/services/theme.service';
import { WorkspaceHelpConfig } from 'src/app/themes';

type SellerWorkspaceSection = 'catalogs' | 'offers' | 'productspec' | 'servicespec' | 'resourcespec' | 'usagespec';
type SellerWorkspaceView =
  | SellerWorkspaceSection
  | 'createProductSpec'
  | 'updateProductSpec'
  | 'createServiceSpec'
  | 'updateServiceSpec'
  | 'createResourceSpec'
  | 'updateResourceSpec'
  | 'createOffer'
  | 'updateOffer'
  | 'createCatalog'
  | 'updateCatalog'
  | 'createCustomOffer'
  | 'createUsage'
  | 'updateUsage';

@Component({
  selector: 'app-seller-offerings',
  templateUrl: './seller-offerings.component.html',
  styleUrl: './seller-offerings.component.css'
})
export class SellerOfferingsComponent implements OnInit, OnDestroy {

  catalogManagementEnabled: boolean = environment.CATALOG_MANAGEMENT_ENABLED;
  activeView: SellerWorkspaceView = this.catalogManagementEnabled ? 'catalogs' : 'offers';
  usage_to_update:any;
  prod_to_update:any;
  serv_to_update:any;
  res_to_update:any;
  offer_to_update:any;
  custom_offer_partyId:any=null;
  catalog_to_update:any;
  userInfo:any;
  productOffersCount: number = 0;
  catalogsCount: number = 0;
  productSpecsCount: number = 0;
  serviceSpecsCount: number = 0;
  resourceSpecsCount: number = 0;
  usageSpecsCount: number = 0;
  workspaceLogoUrl: string | null = null;
  workspaceThemeName: string = 'DOME';
  workspaceHelpAction?: WorkspaceHelpConfig;
  userInitials: string = '';
  activeSection: SellerWorkspaceSection = this.catalogManagementEnabled ? 'catalogs' : 'offers';
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';
  sectionActions : Record<SellerWorkspaceSection, () => void> = {
    catalogs: this.goToCatalogs,
    offers: this.goToOffers,
    productspec: this.goToProdSpec,
    servicespec: this.goToServiceSpec,
    resourcespec: this.goToResourceSpec,
    usagespec: this.goToUsageSpec
  };
  //partyIdCustom:string='urn:ngsi-ld:organization:02922d6d-2e7e-4235-a1aa-4f393a75bc52'
  //partyIdCustom:any=null
  private destroy$ = new Subject<void>();

  get show_catalogs(): boolean { return this.activeView === 'catalogs'; }
  get show_prod_specs(): boolean { return this.activeView === 'productspec'; }
  get show_service_specs(): boolean { return this.activeView === 'servicespec'; }
  get show_resource_specs(): boolean { return this.activeView === 'resourcespec'; }
  get show_usage_specs(): boolean { return this.activeView === 'usagespec'; }
  get show_offers(): boolean { return this.activeView === 'offers'; }
  get show_create_prod_spec(): boolean { return this.activeView === 'createProductSpec'; }
  get show_create_res_spec(): boolean { return this.activeView === 'createResourceSpec'; }
  get show_create_serv_spec(): boolean { return this.activeView === 'createServiceSpec'; }
  get show_create_offer(): boolean { return this.activeView === 'createOffer'; }
  get show_create_catalog(): boolean { return this.activeView === 'createCatalog'; }
  get show_update_prod_spec(): boolean { return this.activeView === 'updateProductSpec'; }
  get show_update_serv_spec(): boolean { return this.activeView === 'updateServiceSpec'; }
  get show_update_res_spec(): boolean { return this.activeView === 'updateResourceSpec'; }
  get show_update_offer(): boolean { return this.activeView === 'updateOffer'; }
  get show_update_catalog(): boolean { return this.activeView === 'updateCatalog'; }
  get show_create_custom_offer(): boolean { return this.activeView === 'createCustomOffer'; }
  get show_create_usage(): boolean { return this.activeView === 'createUsage'; }
  get show_update_usage(): boolean { return this.activeView === 'updateUsage'; }

  get showWorkspaceNav(): boolean {
    return ['catalogs', 'offers', 'productspec', 'servicespec', 'resourcespec', 'usagespec'].includes(this.activeView);
  }

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
    private router: Router,
    private quoteService: QuoteService,
    private api: ApiServiceService,
    private http: HttpClient,
    private themeService: ThemeService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'SellerProductSpec') {
        this.goToProdSpec();
      }
      if(ev.type === 'SellerCreateProductSpec' && ev.value == true) {
        this.goToCreateProdSpec();
      }
      if(ev.type === 'SellerServiceSpec' && ev.value == true) {
        this.goToServiceSpec();
      }
      if(ev.type === 'SellerCreateServiceSpec' && ev.value == true) {
        this.goToCreateServSpec();
      }
      if(ev.type === 'SellerResourceSpec' && ev.value == true) {
        this.goToResourceSpec();
      }
      if(ev.type === 'SellerCreateResourceSpec' && ev.value == true) {
        this.goToCreateResSpec();
      }
      if(ev.type === 'UsageSpecList' && ev.value == true) {
        this.goToUsageSpec();
      }
      if(ev.type === 'CreateUsageSpec' && ev.value == true) {
        this.goToCreateUsage();
      }
      if(ev.type === 'UpdateUsageSpec' && ev.value) {
        this.usage_to_update = ev.value;
        this.goToUpdateUsage();
      }
      if(ev.type === 'SellerOffer' && ev.value == true) {
        this.goToOffers();
      }
      if(ev.type == 'SellerCatalog' && ev.value == true && this.catalogManagementEnabled){
        this.goToCatalogs();
      }
      if(ev.type === 'SellerCreateOffer' && ev.value == true) {
        this.goToCreateOffer();
      }
      if(ev.type === 'SellerCatalogCreate' && ev.value == true && this.catalogManagementEnabled) {
        this.goToCreateCatalog();
      }
      if(ev.type === 'SellerUpdateProductSpec') {
        this.prod_to_update=ev.value;
        this.goToUpdateProdSpec();
      }
      if(ev.type === 'SellerUpdateServiceSpec') {
        this.serv_to_update=ev.value;
        this.goToUpdateServiceSpec();
      }
      if(ev.type === 'SellerUpdateResourceSpec') {
        this.res_to_update=ev.value;
        this.goToUpdateResourceSpec();
      }
      if(ev.type === 'SellerUpdateOffer') {
        this.offer_to_update=ev.value;
        this.goToUpdateOffer();
      }
      if(ev.type === 'SellerCreateCustomOffer') {
        const evValue = ev.value as {offer: any, partyId?: string};
        this.offer_to_update = evValue.offer;
        this.custom_offer_partyId = evValue.partyId || null;
        this.goToCreateCustomOffer();
      }
      if(ev.type === 'SellerCatalogUpdate' && this.catalogManagementEnabled) {
        this.catalog_to_update=ev.value;
        this.goToUpdateCatalog();
      }
      if(ev.type === 'SpecCreated' && ev.text) {
        this.toastMessage = ev.text;
        this.toastType = ev.toastType ?? 'success';
        this.loadCounts();
        setTimeout(() => { this.toastMessage = null; this.cdr.detectChanges(); }, 4000);
      }
    })
  }

  dismissToast(){
    this.toastMessage = null;
  }

  goToResources() {
    const targetUrl = environment.KNOWLEDGE_BASE_URL || environment.KB_GUIDELNES_URL;
    if (!targetUrl) return;

    window.open(targetUrl, '_blank', 'noopener');
  }

  async ngOnInit() {
    this.userInfo = this.localStorage.getObject('login_items') as LoginInfo;
    const theme = this.themeService.getCurrentThemeConfig();
    this.workspaceLogoUrl = theme?.assets?.logoUrl ?? null;
    this.workspaceThemeName = theme?.displayName ?? 'DOME';
    this.workspaceHelpAction = theme?.workspace?.sellerOfferingsHelp;
    this.userInitials = this.computeInitials(this.userInfo);
    const saved = localStorage.getItem('activeSection') as SellerWorkspaceSection | null;
    const initialSection = this.normalizeSection(saved) || this.activeSection;
    this.activeSection = initialSection;
    if (this.sectionActions[initialSection]) {
      this.sectionActions[initialSection].call(this);
    }

    this.loadCounts();

    const state = history.state as { quoteId?: string };
    console.log('Checking state')
    console.log(state)

    if (state && state.quoteId) {
      // If there's a quoteId in the state, open the offers section
      const quote = await firstValueFrom(this.quoteService.getQuoteById(state.quoteId));
      const offerId = quote?.quoteItem?.[0]?.productOffering?.id;
      let offer:any = null;
      if (offerId) {
        offer = await this.api.getProductById(offerId);
      }

      const quoteBuyer = quote?.relatedParty?.find((party: any) => party.role.toLowerCase() === environment.BUYER_ROLE.toLowerCase());
      this.eventMessage.emitSellerCreateCustomOffer(offer, quoteBuyer?.id);
    }
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  private computeInitials(info: any): string {
    if (!info || JSON.stringify(info) === '{}') return '';
    let label = '';
    if (info.logged_as && info.id && info.logged_as !== info.id) {
      const org = info.organizations?.find((o: any) => o.id === info.logged_as);
      label = org?.name ?? '';
    } else {
      label = info.user ?? '';
    }
    return (label.slice(0, 2) || '').toUpperCase();
  }

  backToMarketplace() {
    this.router.navigate(['/dashboard']);
  }

  async loadCounts() {
    const aux = this.userInfo as LoginInfo;
    if (!aux) return;
    let partyId: string;
    if (aux.logged_as == aux.id) {
      partyId = aux.partyId;
    } else {
      const loggedOrg = aux.organizations?.find((e: any) => e.id == aux.logged_as);
      if (!loggedOrg) return;
      partyId = loggedOrg.partyId;
    }

    const limit = 1000;
    const base = environment.BASE_URL;
    const partyParam = `relatedParty.id=${partyId}`;
    const offersUrl = `${base}${environment.PRODUCT_CATALOG}/productOffering?limit=${limit}&${partyParam}`;
    const catalogsUrl = `${base}${environment.PRODUCT_CATALOG}/catalog?limit=${limit}&${partyParam}`;
    const prodSpecUrl = `${base}${environment.PRODUCT_CATALOG}${environment.PRODUCT_SPEC}?limit=${limit}&${partyParam}`;
    const servSpecUrl = `${base}${environment.SERVICE}${environment.SERVICE_SPEC}?limit=${limit}&${partyParam}`;
    const resSpecUrl = `${base}${environment.RESOURCE}${environment.RESOURCE_SPEC}?limit=${limit}&${partyParam}`;
    const usageSpecUrl = `${base}/usage/usageSpecification?limit=${limit}&${partyParam}`;

    const safeCount = async (url: string) => {
      try {
        const items = await firstValueFrom(this.http.get<any[]>(url));
        return Array.isArray(items) ? items.length : 0;
      } catch {
        return 0;
      }
    };

    const [offers, catalogs, prods, servs, ress, usages] = await Promise.all([
      safeCount(offersUrl),
      this.catalogManagementEnabled ? safeCount(catalogsUrl) : Promise.resolve(0),
      safeCount(prodSpecUrl),
      safeCount(servSpecUrl),
      safeCount(resSpecUrl),
      safeCount(usageSpecUrl),
    ]);

    this.productOffersCount = offers;
    this.catalogsCount = catalogs;
    this.productSpecsCount = prods;
    this.serviceSpecsCount = servs;
    this.resourceSpecsCount = ress;
    this.usageSpecsCount = usages;
    this.cdr.detectChanges();
  }

  private normalizeSection(section: string | null | undefined): SellerWorkspaceSection | null {
    if (!section) return null;
    if (section === 'catalogs' && !this.catalogManagementEnabled) return 'offers';
    return ['catalogs', 'offers', 'productspec', 'servicespec', 'resourcespec', 'usagespec'].includes(section)
      ? section as SellerWorkspaceSection
      : null;
  }

  private activateView(view: SellerWorkspaceView, section?: SellerWorkspaceSection) {
    if ((view === 'catalogs' || view === 'createCatalog' || view === 'updateCatalog') && !this.catalogManagementEnabled) {
      this.goToOffers();
      return;
    }
    this.activeView = view;
    if (section) {
      this.setActiveSection(section);
    }
    this.cdr.detectChanges();
  }

  setActiveSection(section: SellerWorkspaceSection) {
    this.activeSection = section;
    localStorage.setItem('activeSection', section);
    console.log('Saved to localStorage:', section);
  }

  goToCreateProdSpec(){
    this.activateView('createProductSpec');
  }

  goToUpdateProdSpec(){
    this.activateView('updateProductSpec');
  }

  goToCreateCatalog(){
    this.activateView('createCatalog');
  }

  goToUpdateCatalog(){
    this.activateView('updateCatalog');
  }

  goToUpdateOffer(){
    this.activateView('updateOffer');
  }

  goToCreateCustomOffer(){
    this.activateView('createCustomOffer');
  }

  goToUpdateServiceSpec(){
    this.activateView('updateServiceSpec');
  }

  goToUpdateResourceSpec(){
    this.activateView('updateResourceSpec');
  }

  goToCreateServSpec(){
    this.activateView('createServiceSpec');
  }

  goToCreateResSpec(){
    this.activateView('createResourceSpec');
  }

  goToCreateOffer(){
    this.activateView('createOffer');
  }

  goToCatalogs(){
    this.activateView('catalogs', 'catalogs');
  }

  selectCatalogs(){
    let catalog_button = document.getElementById('catalogs-button')
    let prodSpec_button = document.getElementById('prod-spec-button')
    let serviceSpec_button = document.getElementById('sev-spec-button')
    let resourceSpec_button = document.getElementById('res-spec-button')
    let offer_button = document.getElementById('offers-button')

    this.selectMenu(catalog_button,'text-white bg-primary-100');
    this.unselectMenu(prodSpec_button,'text-white bg-primary-100');
    this.unselectMenu(serviceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(resourceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(offer_button,'text-white bg-primary-100');
  }

  goToProdSpec(){
    this.activateView('productspec', 'productspec');
  }

  selectProdSpec(){
    let catalog_button = document.getElementById('catalogs-button')
    let prodSpec_button = document.getElementById('prod-spec-button')
    let serviceSpec_button = document.getElementById('sev-spec-button')
    let resourceSpec_button = document.getElementById('res-spec-button')
    let offer_button = document.getElementById('offers-button')

    this.selectMenu(prodSpec_button,'text-white bg-primary-100');
    this.unselectMenu(catalog_button,'text-white bg-primary-100');
    this.unselectMenu(serviceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(resourceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(offer_button,'text-white bg-primary-100');
  }

  goToServiceSpec(){
    this.activateView('servicespec', 'servicespec');
  }

  selectServiceSpec(){
    let catalog_button = document.getElementById('catalogs-button')
    let prodSpec_button = document.getElementById('prod-spec-button')
    let serviceSpec_button = document.getElementById('sev-spec-button')
    let resourceSpec_button = document.getElementById('res-spec-button')
    let offer_button = document.getElementById('offers-button')

    this.selectMenu(serviceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(catalog_button,'text-white bg-primary-100');
    this.unselectMenu(prodSpec_button,'text-white bg-primary-100');
    this.unselectMenu(resourceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(offer_button,'text-white bg-primary-100');
  }

  goToResourceSpec(){
    this.activateView('resourcespec', 'resourcespec');
  }

  selectResourceSpec(){
    let catalog_button = document.getElementById('catalogs-button')
    let prodSpec_button = document.getElementById('prod-spec-button')
    let serviceSpec_button = document.getElementById('sev-spec-button')
    let resourceSpec_button = document.getElementById('res-spec-button')
    let offer_button = document.getElementById('offers-button')

    this.selectMenu(resourceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(catalog_button,'text-white bg-primary-100');
    this.unselectMenu(prodSpec_button,'text-white bg-primary-100');
    this.unselectMenu(serviceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(offer_button,'text-white bg-primary-100');
  }

  goToUsageSpec(){
    this.activateView('usagespec', 'usagespec');
  }

  goToCreateUsage(){
    this.activateView('createUsage');
  }

  goToUpdateUsage(){
    this.activateView('updateUsage');
  }

  goToOffers(){
    this.activateView('offers', 'offers');
  }

  selectOffers(){
    let catalog_button = document.getElementById('catalogs-button')
    let prodSpec_button = document.getElementById('prod-spec-button')
    let serviceSpec_button = document.getElementById('sev-spec-button')
    let resourceSpec_button = document.getElementById('res-spec-button')
    let offer_button = document.getElementById('offers-button')

    this.selectMenu(offer_button,'text-white bg-primary-100');
    this.unselectMenu(catalog_button,'text-white bg-primary-100');
    this.unselectMenu(prodSpec_button,'text-white bg-primary-100');
    this.unselectMenu(serviceSpec_button,'text-white bg-primary-100');
    this.unselectMenu(resourceSpec_button,'text-white bg-primary-100');
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  unselectMenu(elem:HTMLElement | null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        this.removeClass(elem,cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectMenu(elem:HTMLElement| null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        console.log('already selected')
      } else {
        this.addClass(elem,cls)
      }
    }
  }

}
