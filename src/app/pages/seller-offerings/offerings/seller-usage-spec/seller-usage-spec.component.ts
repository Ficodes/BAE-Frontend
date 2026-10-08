import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { environment } from 'src/environments/environment';
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from 'src/app/services/event-message.service';
import { initFlowbite } from 'flowbite';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { formatApiErrorMessage } from 'src/app/shared/error-message/api-error-message';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LifecycleStatus, ProviderStats, tabCountsFromProviderStats } from 'src/app/models/provider-stats.model';

@Component({
  selector: 'seller-usage-spec',
  templateUrl: './seller-usage-spec.component.html',
  styleUrl: './seller-usage-spec.component.css'
})
export class SellerUsageSpecComponent implements OnInit, OnDestroy {

  usageSpecs:any[]=[];
  nextUsageSpecs:any[]=[];
  loading:boolean=false;
  loading_more:boolean=false;
  partyId:any='';
  page:number=0;
  page_check:boolean = true;
  USAGE_SPEC_LIMIT: number = environment.USAGE_SPEC_LIMIT;
  status:any[]=['Active'];
  selectedTab: string = 'Draft';
  tabStatusMap: { [k: string]: LifecycleStatus[] } = {
    Draft: ['Active'],
    Validated: ['Launched'],
    Deleted: ['Retired', 'Obsolete']
  };
  statusCounts: { [k: string]: number } = { Draft: 0, Validated: 0, Deleted: 0 };
  openMenuIdx: number | null = null;
  deleteConfirmation: any | null = null;
  deleteLoading: boolean = false;
  deleteEligibilityLoading: boolean = false;
  deleteEligibilityError: boolean = false;
  deleteBlockingOffers: any[] = [];
  private destroy$ = new Subject<void>();
  private deleteEligibilityRequestId = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
    private usageService: UsageServiceService,
    private localStorage: LocalStorageService,
    private paginationService: PaginationService,
    private translate: TranslateService,
    private api: ApiServiceService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initUsageSpecs();
      }
      if(ev.type === 'ProviderStatsTransition' && (ev.value as any)?.entity === 'usageSpecification') {
        const transition = ev.value as any;
        if (transition.previousLifecycleStatus !== null || this.selectedTab === 'Draft') {
          this.getUsageSpecs(false);
        }
      }
      if(ev.type === 'ProviderStatsLoaded') {
        this.applyProviderStats(ev.value as ProviderStats);
      }
    })
  }

  async ngOnInit() {
    await this.initUsageSpecs();
    initFlowbite();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initUsageSpecs(){
    this.initPartyInfo();
    await this.getUsageSpecs(false);
    await this.loadStatusCounts();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  async getUsageSpecs(next:boolean){
    if(next==false){
      this.loading=true;
    }

    let options = {
      "filters": this.status,
      "partyId": this.partyId
    }

    return this.paginationService.getItemsPaginated(this.page, this.USAGE_SPEC_LIMIT, next, this.usageSpecs,this.nextUsageSpecs, options,
      this.usageService.getUsageSpecs.bind(this.usageService)).then(data => {
      this.page_check=data.page_check;
      this.usageSpecs=data.items;
      this.nextUsageSpecs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
      this.cdr.detectChanges();
    })
  }

  async next(){
    await this.getUsageSpecs(true);
  }

  selectTab(tab: string) {
    if (tab === this.selectedTab) return;
    this.selectedTab = tab;
    this.status = [...this.tabStatusMap[tab]];
    this.page = 0;
    this.getUsageSpecs(false);
  }

  loadStatusCounts() {
    this.applyProviderStats((this.eventMessage as any).getLatestProviderStats?.() ?? null);
  }

  private applyProviderStats(stats: ProviderStats | null): void {
    this.statusCounts = tabCountsFromProviderStats(stats, 'usageSpecification', this.tabStatusMap);
    this.cdr.detectChanges();
  }

  private applyStatusChangeToCurrentTab(usageSpec: any, nextStatus: string): void {
    this.eventMessage.emitProviderStatsTransition({
      entity: 'usageSpecification',
      previousLifecycleStatus: usageSpec.lifecycleStatus as LifecycleStatus,
      nextLifecycleStatus: nextStatus as LifecycleStatus
    });
  }

  goToCreate(){
    this.eventMessage.emitCreateUsageSpec(true);
  }

  goToUpdate(usageSpec:any){
    this.eventMessage.emitUpdateUsageSpec(usageSpec);
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

  rowStatusBadge(usage: any): { text: string, bg: string, color: string } {
    const hasMetrics = (usage?.specCharacteristic && usage.specCharacteristic.length > 0);
    if(usage?.lifecycleStatus === 'Launched'){
      return { text: 'Validated', bg: 'rgb(var(--theme-status-success-bg))', color: 'rgb(var(--theme-status-success-text))' };
    }
    if(usage?.lifecycleStatus === 'Retired' || usage?.lifecycleStatus === 'Obsolete'){
      return { text: 'Deleted', bg: 'rgb(var(--theme-status-danger-bg))', color: 'rgb(var(--theme-status-danger-text))' };
    }
    if(hasMetrics){
      return { text: 'Ready to be validated', bg: 'rgb(var(--theme-status-ready-bg))', color: 'rgb(var(--theme-status-ready-text))' };
    }
    return { text: 'Not completed', bg: 'rgb(var(--theme-status-warning-bg))', color: 'rgb(var(--theme-status-warning-text))' };
  }

  validateUsageSpec(usageSpec: any){
    if(!usageSpec?.id) return;
    this.usageService.updateUsageSpec({ lifecycleStatus: 'Launched' }, usageSpec.id).subscribe({
      next: () => {
        this.openMenuIdx = null;
        this.eventMessage.emitSpecCreated(this.translate.instant('USAGE_SPECS._validate_success'), 'success', false);
        this.applyStatusChangeToCurrentTab(usageSpec, 'Launched');
      },
      error: (error: any) => {
        this.openMenuIdx = null;
        this.eventMessage.emitSpecCreated(
          formatApiErrorMessage(this.translate, 'USAGE_SPECS._validate_error', error),
          'error',
          false
        );
      }
    });
  }

  deleteUsageSpec(usageSpec: any){
    if(!usageSpec?.id) return;
    this.openMenuIdx = null;
    this.deleteConfirmation = usageSpec;
    this.loadDeleteEligibility(usageSpec);
  }

  cancelDeleteUsageSpec(): void {
    if (this.deleteLoading) return;
    this.deleteEligibilityRequestId++;
    this.deleteConfirmation = null;
  }

  confirmDeleteUsageSpec(): void {
    if (!this.canConfirmDeleteUsageSpec) return;
    const usageSpec = this.deleteConfirmation;
    this.deleteLoading = true;
    this.performDeleteUsageSpec(usageSpec);
  }

  get deleteUsageSpecName(): string {
    return this.deleteConfirmation?.name || '';
  }

  private clearDeleteConfirmation(): void {
    this.deleteEligibilityRequestId++;
    this.deleteLoading = false;
    this.deleteConfirmation = null;
    this.deleteEligibilityLoading = false;
    this.deleteEligibilityError = false;
    this.deleteBlockingOffers = [];
  }

  get canConfirmDeleteUsageSpec(): boolean {
    return !!this.deleteConfirmation
      && !this.deleteLoading
      && !this.deleteEligibilityLoading
      && !this.deleteEligibilityError
      && this.deleteBlockingOffers.length === 0;
  }

  get deleteBlockingOfferNames(): string {
    return this.deleteBlockingOffers
      .map(offer => offer?.name || offer?.id)
      .filter(value => !!value)
      .join(', ');
  }

  private async loadDeleteEligibility(usageSpec: any): Promise<void> {
    const requestId = ++this.deleteEligibilityRequestId;
    this.deleteEligibilityLoading = true;
    this.deleteEligibilityError = false;
    this.deleteBlockingOffers = [];
    this.cdr.detectChanges();

    try {
      const offers = await this.getProductOfferingsUsingUsageSpec(usageSpec.id);
      if (requestId !== this.deleteEligibilityRequestId || this.deleteConfirmation?.id !== usageSpec.id) {
        return;
      }

      this.deleteBlockingOffers = offers.filter(offer => !this.isDeletableOfferStatus(offer?.lifecycleStatus));
    } catch (error) {
      if (requestId !== this.deleteEligibilityRequestId || this.deleteConfirmation?.id !== usageSpec.id) {
        return;
      }

      console.error('Usage spec delete eligibility check failed', error);
      this.deleteEligibilityError = true;
      this.deleteBlockingOffers = [];
    } finally {
      if (requestId === this.deleteEligibilityRequestId && this.deleteConfirmation?.id === usageSpec.id) {
        this.deleteEligibilityLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  private async getProductOfferingsUsingUsageSpec(usageSpecId: string): Promise<any[]> {
    const priceComponents = await this.api.getOfferingPricesByUsageSpecId(usageSpecId);
    const pricePlanMap = new Map<string, any>();

    for (const component of priceComponents) {
      if (!component?.id) continue;
      const pricePlans = await this.api.getOfferingPricesByBundledPopRelationshipId(component.id);
      for (const pricePlan of pricePlans) {
        if (pricePlan?.id) {
          pricePlanMap.set(pricePlan.id, pricePlan);
        }
      }
    }

    const offerMap = new Map<string, any>();
    for (const pricePlan of pricePlanMap.values()) {
      const offers = await this.api.getProductOfferingsByPricePlanId(pricePlan.id);
      for (const offer of offers) {
        if (offer?.id) {
          offerMap.set(offer.id, offer);
        }
      }
    }

    return [...offerMap.values()];
  }

  private isDeletableOfferStatus(status: string | undefined): boolean {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'retired' || normalized === 'obsolete';
  }

  private performDeleteUsageSpec(usageSpec: any){
    const onSuccess = (lifecycleStatus: string) => {
      this.clearDeleteConfirmation();
      this.eventMessage.emitSpecCreated(this.translate.instant('OFFERINGS._usage_spec_delete_success'), 'success', false);
      this.applyStatusChangeToCurrentTab(usageSpec, lifecycleStatus);
    };
    const onError = (err: any) => {
      this.clearDeleteConfirmation();
      console.error('Usage spec delete failed', err);
      this.eventMessage.emitSpecCreated(
        formatApiErrorMessage(this.translate, 'OFFERINGS._usage_spec_delete_error', err),
        'error',
        false
      );
    };
    const lifecycleStatus = usageSpec.lifecycleStatus === 'Active' ? 'Obsolete' : 'Retired';
    this.usageService.updateUsageSpec({ lifecycleStatus }, usageSpec.id).subscribe({
      next: () => onSuccess(lifecycleStatus),
      error: onError
    });
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
