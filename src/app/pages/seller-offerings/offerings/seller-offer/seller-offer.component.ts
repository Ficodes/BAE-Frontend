import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook, faSparkles} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import {EventMessageService} from "src/app/services/event-message.service";
import { initFlowbite } from 'flowbite';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'seller-offer',
  templateUrl: './seller-offer.component.html',
  styleUrl: './seller-offer.component.css'
})
export class SellerOfferComponent implements OnInit, OnDestroy {
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;
  protected readonly faSparkles = faSparkles;

  searchField = new FormControl();

  offers:any[]=[];
  nextOffers:any[]=[];
  page:number=0;
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  filter:any=undefined;
  status:any[]=['Active'];
  selectedTab: string = 'Draft';
  tabStatusMap: { [k: string]: string[] } = {
    Draft: ['Active'],
    Published: ['Launched'],
    Unpublished: ['Retired'],
    Archived: ['Obsolete']
  };
  statusCounts: { [k: string]: number } = { Draft: 0, Published: 0, Unpublished: 0, Archived: 0 };
  totalViewsCount: number = 0;
  offersDelta: number = 0;
  publishedDelta: number = 2;
  viewsDelta: number = 18;
  openMenuIdx: number | null = null;

  get totalOffersCount(): number {
    return Object.values(this.statusCounts).reduce((sum, n) => sum + (n || 0), 0);
  }
  partyId:any;
  sort:any='name';
  isBundle:any=undefined;
  customMap: Record<string, boolean> = {};
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
    private priceService: PriceServiceService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initOffers();
      }
    })
  }

  ngOnInit() {
    this.initOffers();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initOffers(){
    this.loading=true;
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(aux.logged_as==aux.id){
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }
    this.offers=[];
    this.nextOffers=[];
    this.getOffers(false);
    this.loadStatusCounts();
    this.loadOffersDelta();
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        if(this.searchField.value==''){
          this.filter=undefined;
          this.getOffers(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit(){
    initFlowbite();
  }

  goToCreate(){
    this.eventMessage.emitSellerCreateOffer(true);
  }

  goToUpdate(offer:any){
    this.eventMessage.emitSellerUpdateOffer(offer);
  }

  goToCreateCustom(offer:any){
    this.eventMessage.emitSellerCreateCustomOffer(offer);
  }

  async getOffers(next:boolean){
    if(next == false){
      this.loading=true;
    }

    let options = {
      "filters": this.status,
      "partyId": this.partyId,
      "sort": this.sort,
      "isBundle": this.isBundle
    }

    this.paginationService.getItemsPaginated(this.page, this.PROD_SPEC_LIMIT, next, this.offers,this.nextOffers, options,
      this.api.getProductOfferByOwner.bind(this.api)).then(async data => {
      this.page_check=data.page_check;
      this.offers=this.sortByName(data.items);
      this.nextOffers=this.sortByName(data.nextItems);
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;

      this.customMap={}
      for (const offer of this.offers) {
        this.customMap[offer.id] = await this.priceService.isCustomOffering(offer);
      }
    })

  }

  private sortByName(items: any[]): any[] {
    if (!Array.isArray(items)) return items;
    return [...items].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }

  async next(){
    await this.getOffers(true);
  }

  selectTab(tab: string) {
    if (tab === this.selectedTab) return;
    this.selectedTab = tab;
    this.status = [...this.tabStatusMap[tab]];
    this.page = 0;
    this.getOffers(false);
  }

  async loadStatusCounts() {
    try {
      const all = await this.fetchAllOffers([]);
      const counts: { [k: string]: number } = { Draft: 0, Published: 0, Unpublished: 0, Archived: 0 };
      for (const offer of all) {
        const status = offer?.lifecycleStatus;
        for (const tab of Object.keys(this.tabStatusMap)) {
          if (this.tabStatusMap[tab].includes(status)) { counts[tab]++; break; }
        }
      }
      this.statusCounts = counts;
    } catch {
    }
    this.cdr.detectChanges();
  }

  async loadOffersDelta() {
    try {
      const all = await this.fetchAllOffers([]);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      this.offersDelta = all.filter(o => this.offerCreatedAt(o) >= startOfMonth).length;
    } catch {
      this.offersDelta = 0;
    }
    this.cdr.detectChanges();
  }

  private offerCreatedAt(offer: any): number {
    const date = offer?.validFor?.startDateTime || offer?.lastUpdate;
    return date ? new Date(date).getTime() : 0;
  }

  private async fetchAllOffers(status: string[]): Promise<any[]> {
    const limit = environment.PRODUCT_LIMIT;
    const all: any[] = [];
    let offset = 0;
    while (offset < 10000) {
      const page = await this.api.getProductOfferByOwner(offset, status, this.partyId, undefined, undefined);
      const items = Array.isArray(page) ? page : [];
      all.push(...items);
      if (items.length < limit) break;
      offset += limit;
    }
    return all;
  }

  toggleMenu(idx: number, event: Event){
    event.stopPropagation();
    this.openMenuIdx = this.openMenuIdx === idx ? null : idx;
  }

  @HostListener('document:click')
  onDocClick(){
    if(this.openMenuIdx !== null){
      this.openMenuIdx = null;
      this.cdr.detectChanges();
    }
  }

  rowStatusBadge(offer: any): { text: string, bg: string, color: string } {
    if(offer?.lifecycleStatus === 'Launched'){
      return { text: 'Published', bg: '#BBF7D0', color: '#052E16' };
    }
    if(offer?.lifecycleStatus === 'Retired'){
      return { text: 'Unpublished', bg: '#FEF3C7', color: '#92400E' };
    }
    if(offer?.lifecycleStatus === 'Obsolete'){
      return { text: 'Archived', bg: '#FEE2E2', color: '#991B1B' };
    }
    if(this.isOfferComplete(offer)){
      return { text: 'Ready to be published', bg: '#DCFCE7', color: '#166534' };
    }
    return { text: 'Not completed', bg: '#FEF3C7', color: '#92400E' };
  }

  isOfferComplete(offer: any): boolean {
    if (!offer?.name) return false;
    const hasSpec = !!(offer?.productSpecification?.id || (Array.isArray(offer?.bundledProductOffering) && offer.bundledProductOffering.length > 0));
    if (!hasSpec) return false;
    if (!Array.isArray(offer?.category) || offer.category.length === 0) return false;
    const terms = Array.isArray(offer?.productOfferingTerm) ? offer.productOfferingTerm : [];
    const hasProcurement = terms.some((t: any) => t?.name === 'procurement' && (t?.description || '').trim().length > 0);
    return hasProcurement;
  }

  publishOffer(offer: any){
    if(!offer?.id) return;
    this.openMenuIdx = null;
    if(!this.isOfferComplete(offer)){
      this.eventMessage.emitSpecCreated('Cannot publish: the offer is incomplete. Please fill in all required fields first.', 'error');
      return;
    }
    this.api.updateProductOffering({ lifecycleStatus: 'Launched' }, offer.id).subscribe({
      next: () => {
        this.eventMessage.emitSpecCreated('Product offer successfully published');
        this.getOffers(false);
        this.loadStatusCounts();
      },
      error: () => {
        this.eventMessage.emitSpecCreated('Could not publish this product offer.', 'error');
      }
    });
  }

  unpublishOffer(offer: any){
    if(!offer?.id) return;
    this.openMenuIdx = null;
    this.api.updateProductOffering({ lifecycleStatus: 'Retired' }, offer.id).subscribe({
      next: () => {
        this.eventMessage.emitSpecCreated('Product offer unpublished');
        this.getOffers(false);
        this.loadStatusCounts();
      },
      error: () => {
        this.eventMessage.emitSpecCreated('Could not unpublish this product offer.', 'error');
      }
    });
  }

  duplicateOffer(offer: any){
    if(!offer?.id) return;
    this.openMenuIdx = null;
    const copy: any = {
      name: 'Copy of ' + (offer.name || 'offer'),
      description: offer.description,
      lifecycleStatus: 'Active',
      isBundle: offer.isBundle ?? false,
      version: offer.version,
      place: offer.place ?? [],
      validFor: { startDateTime: new Date().toISOString() },
      category: (offer.category || []).map((c: any) => ({ id: c.id, href: c.href || c.id })),
      productOfferingPrice: (offer.productOfferingPrice || []).map((p: any) => ({ id: p.id, href: p.href || p.id })),
      productOfferingTerm: (offer.productOfferingTerm || []).map((t: any) => ({ name: t.name, description: t.description })),
    };
    if (offer.bundledProductOffering) {
      copy.bundledProductOffering = offer.bundledProductOffering;
    }
    if (offer.productSpecification?.id) {
      copy.productSpecification = {
        id: offer.productSpecification.id,
        href: offer.productSpecification.href || offer.productSpecification.id
      };
    }
    if (Array.isArray(offer.pricingLogicAlgorithm) && offer.pricingLogicAlgorithm.length > 0) {
      copy.pricingLogicAlgorithm = offer.pricingLogicAlgorithm.map((p: any) => ({ name: p.name, plaSpecId: p.plaSpecId }));
    }
    const catalogId = Array.isArray(offer.catalog) && offer.catalog.length > 0 ? offer.catalog[0].id : null;
    this.api.postProductOffering(copy, catalogId).subscribe({
      next: () => {
        this.eventMessage.emitSpecCreated('Product offer duplicated');
        this.getOffers(false);
        this.loadStatusCounts();
      },
      error: () => {
        this.eventMessage.emitSpecCreated('Could not duplicate this product offer.', 'error');
      }
    });
  }

  restoreOffer(offer: any){
    if(!offer?.id) return;
    this.openMenuIdx = null;
    const onSuccess = () => {
      this.eventMessage.emitSpecCreated('Product offer restored');
      this.getOffers(false);
      this.loadStatusCounts();
    };
    const onError = (err: any) => {
      console.error('Product offer restore failed', err);
      this.eventMessage.emitSpecCreated('Could not restore this product offer.', 'error');
    };
    this.api.updateProductOffering({ lifecycleStatus: 'Retired' }, offer.id).subscribe({
      next: () => {
        this.api.updateProductOffering({ lifecycleStatus: 'Active' }, offer.id).subscribe({
          next: onSuccess,
          error: onError
        });
      },
      error: onError
    });
  }

  deleteOfferPermanent(offer: any){
    if(!offer?.id) return;
    this.openMenuIdx = null;
    this.api.deleteProductOffering(offer.id).subscribe({
      next: () => {
        this.eventMessage.emitSpecCreated('Product offer deleted permanently');
        this.getOffers(false);
        this.loadStatusCounts();
      },
      error: (err: any) => {
        console.error('Permanent delete failed', err);
        this.eventMessage.emitSpecCreated('Could not delete this product offer permanently.', 'error');
      }
    });
  }

  deleteOffer(offer: any){
    if(!offer?.id) return;
    this.openMenuIdx = null;
    const onSuccess = () => {
      this.eventMessage.emitSpecCreated('Product offer deleted');
      this.getOffers(false);
      this.loadStatusCounts();
    };
    const onError = (err: any) => {
      console.error('Product offer delete failed', err);
      this.eventMessage.emitSpecCreated('Could not delete this product offer.', 'error');
    };
    if(offer.lifecycleStatus === 'Active'){
      this.api.updateProductOffering({ lifecycleStatus: 'Launched' }, offer.id).subscribe({
        next: () => {
          this.api.updateProductOffering({ lifecycleStatus: 'Retired' }, offer.id).subscribe({
            next: () => {
              this.api.updateProductOffering({ lifecycleStatus: 'Obsolete' }, offer.id).subscribe({
                next: onSuccess,
                error: onError
              });
            },
            error: onError
          });
        },
        error: onError
      });
    } else if(offer.lifecycleStatus === 'Launched'){
      this.api.updateProductOffering({ lifecycleStatus: 'Retired' }, offer.id).subscribe({
        next: () => {
          this.api.updateProductOffering({ lifecycleStatus: 'Obsolete' }, offer.id).subscribe({
            next: onSuccess,
            error: onError
          });
        },
        error: onError
      });
    } else {
      this.api.updateProductOffering({ lifecycleStatus: 'Obsolete' }, offer.id).subscribe({
        next: onSuccess,
        error: onError
      });
    }
  }

  onStateFilterChange(filter:string){
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
    } else {
      this.status.push(filter)
    }
    this.getOffers(false);
  }

  onSortChange(event: any) {
    if(event.target.value=='name'){
      this.sort='name'
    }else{
      this.sort=undefined
    }
    this.getOffers(false);
  }

  onTypeChange(event: any) {
    if(event.target.value=='simple'){
      this.isBundle=false
    }else if (event.target.value=='bundle'){
      this.isBundle=true
    }else{
      this.isBundle=undefined
    }
    this.getOffers(false);
  }


  filterInventoryByKeywords(){

  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
