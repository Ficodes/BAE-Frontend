import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
type Catalog = components["schemas"]["Catalog"];
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import {EventMessageService} from "src/app/services/event-message.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { formatApiErrorMessage } from 'src/app/shared/error-message/api-error-message';

@Component({
  selector: 'seller-catalogs',
  templateUrl: './seller-catalogs.component.html',
  styleUrl: './seller-catalogs.component.css'
})
export class SellerCatalogsComponent implements OnInit, OnDestroy {

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  searchField = new FormControl();
  catalogs:Catalog[]=[];
  nextCatalogs:Catalog[]=[];
  page:number=0;
  CATALOG_LIMIT: number = environment.CATALOG_LIMIT;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  filter:any=undefined;
  partyId:any;
  status:any[]=['Active'];
  selectedTab: string = 'Draft';
  readonly tabs: string[] = ['Draft', 'Published', 'Retired', 'Deleted'];
  tabStatusMap: { [k: string]: string[] } = {
    Draft: ['Active'],
    Published: ['Launched'],
    Retired: ['Retired'],
    Deleted: ['Obsolete']
  };
  statusCounts: { [k: string]: number } = { Draft: 0, Published: 0, Retired: 0, Deleted: 0 };
  openMenuIdx: number | null = null;
  openMenuCatalog: Catalog | null = null;
  menuPosition = { top: 0, left: 0 };
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
    private translate: TranslateService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initCatalogs();
      }
    })
  }

  ngOnInit() {
    this.initCatalogs();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCreate(){
    this.eventMessage.emitSellerCreateCatalog(true);
  }

  goToUpdate(cat:any){
    this.eventMessage.emitSellerUpdateCatalog(cat);
  }

  toggleMenu(idx: number, cat: Catalog, event: MouseEvent){
    event.stopPropagation();
    if (this.openMenuIdx === idx) {
      this.closeMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 176;
    this.menuPosition = {
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - menuWidth)
    };
    this.openMenuCatalog = cat;
    this.openMenuIdx = idx;
  }

  @HostListener('document:click')
  onDocClick(){
    if(this.openMenuIdx !== null){
      this.closeMenu();
      this.cdr.detectChanges();
    }
  }

  private closeMenu() {
    this.openMenuIdx = null;
    this.openMenuCatalog = null;
  }

  initCatalogs(){
    this.loading=true;
    this.catalogs=[];
    this.nextCatalogs=[];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(aux.logged_as==aux.id){
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.getCatalogs(false);
    this.loadStatusCounts();
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.filter=undefined;
          this.getCatalogs(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit(){
    initFlowbite();
  }

  async getCatalogs(next:boolean){
    if(next==false){
      this.loading=true;
    }

    //async getItemsPaginated(page:number, pageSize:any, next:boolean, items:any[], nextItems:any[], options:any
    let options = {
      "keywords": this.filter,
      "filters": this.status,
      "partyId": this.partyId
    }

    this.paginationService.getItemsPaginated(this.page, this.CATALOG_LIMIT, next, this.catalogs, this.nextCatalogs, options,
      this.api.getCatalogsByUser.bind(this.api)).then(data => {
      this.page_check=data.page_check;
      this.catalogs=data.items;
      this.nextCatalogs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getCatalogs(true);
  }

  filterInventoryByKeywords(){

  }

  onStateFilterChange(filter:string){
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.status)
    } else {
      console.log('añade filtro')
      console.log(this.status)
      this.status.push(filter)
    }
    this.loading=true;
    this.page=0;
    this.catalogs=[];
    this.nextCatalogs=[];
    this.getCatalogs(false);
  }

  selectTab(tab: string) {
    if (tab === this.selectedTab) return;
    this.selectedTab = tab;
    this.status = [...this.tabStatusMap[tab]];
    this.loading=true;
    this.page=0;
    this.catalogs=[];
    this.nextCatalogs=[];
    this.getCatalogs(false);
  }

  async loadStatusCounts() {
    try {
      const all: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const page = await this.api.getCatalogsByUser(offset, undefined, [], this.partyId);
        const items = Array.isArray(page) ? page : [];
        all.push(...items);
        if (items.length < this.CATALOG_LIMIT) break;
        offset += this.CATALOG_LIMIT;
      }
      const counts: { [k: string]: number } = {};
      for (const tab of Object.keys(this.tabStatusMap)) counts[tab] = 0;
      for (const item of all) {
        const status = item?.lifecycleStatus;
        for (const tab of Object.keys(this.tabStatusMap)) {
          if (this.tabStatusMap[tab].includes(status)) {
            counts[tab]++;
            break;
          }
        }
      }
      this.statusCounts = counts;
    } catch {
    }
    this.cdr.detectChanges();
  }

  rowStatusBadge(cat: any): { text: string, bg: string, color: string } {
    switch (cat?.lifecycleStatus) {
      case 'Active':
        return { text: 'Draft', bg: 'rgb(var(--theme-status-warning-bg))', color: 'rgb(var(--theme-status-warning-text))' };
      case 'Launched':
        return { text: 'Published', bg: 'rgb(var(--theme-status-success-bg))', color: 'rgb(var(--theme-status-success-text))' };
      case 'Retired':
        return { text: 'Unpublished', bg: 'rgb(var(--theme-status-warning-bg))', color: 'rgb(var(--theme-status-warning-text))' };
      case 'Obsolete':
        return { text: 'Archived', bg: 'rgb(var(--theme-status-danger-bg))', color: 'rgb(var(--theme-status-danger-text))' };
      default:
        return { text: cat?.lifecycleStatus || '-', bg: 'rgb(var(--theme-status-neutral-bg))', color: 'rgb(var(--theme-status-neutral-text))' };
    }
  }

  publishCatalog(cat: any) {
    this.updateCatalogLifecycle(cat, 'Launched', 'OFFERINGS._catalog_publish_success', 'OFFERINGS._catalog_publish_error');
  }

  unpublishCatalog(cat: any) {
    this.updateCatalogLifecycle(cat, 'Retired', 'OFFERINGS._catalog_unpublish_success', 'OFFERINGS._catalog_unpublish_error');
  }

  archiveCatalog(cat: any) {
    this.updateCatalogLifecycle(cat, 'Obsolete', 'OFFERINGS._catalog_archive_success', 'OFFERINGS._catalog_archive_error');
  }

  private updateCatalogLifecycle(cat: any, lifecycleStatus: string, successKey: string, errorKey: string) {
    if(!cat?.id) return;
    this.closeMenu();
    this.api.updateCatalog({ lifecycleStatus }, cat.id).subscribe({
      next: () => {
        this.eventMessage.emitSpecCreated(this.translate.instant(successKey));
        this.getCatalogs(false);
        this.loadStatusCounts();
      },
      error: (error: any) => {
        this.eventMessage.emitSpecCreated(
          formatApiErrorMessage(this.translate, errorKey, error),
          'error'
        );
      }
    });
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'Active':
        return 'border-secondary-50 bg-secondary-50 text-primary-100';
      case 'Launched':
        return 'border-status-success-bg bg-offerings-metric-success text-status-success-text';
      case 'Retired':
        return 'border-status-warning-bg bg-status-warning-bg text-status-warning-text';
      case 'Obsolete':
        return 'border-status-danger-bg bg-status-danger-bg text-status-danger-text';
      default:
        return 'border-offerings-border bg-offerings-page text-offerings-body';
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
