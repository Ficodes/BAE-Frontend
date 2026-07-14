import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
  tabStatusMap: { [k: string]: string[] } = {
    Draft: ['Active'],
    Published: ['Launched'],
    Unpublished: ['Retired'],
    Archived: ['Obsolete']
  };
  statusCounts: { [k: string]: number } = { Draft: 0, Published: 0, Unpublished: 0, Archived: 0 };
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
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
        return { text: 'Draft', bg: '#FEF3C7', color: '#92400E' };
      case 'Launched':
        return { text: 'Published', bg: '#BBF7D0', color: '#052E16' };
      case 'Retired':
        return { text: 'Unpublished', bg: '#FEF3C7', color: '#92400E' };
      case 'Obsolete':
        return { text: 'Archived', bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { text: cat?.lifecycleStatus || '-', bg: '#F3F4F6', color: '#374151' };
    }
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'Active':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'Launched':
        return 'border-green-200 bg-green-50 text-green-700';
      case 'Retired':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700';
      case 'Obsolete':
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
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
