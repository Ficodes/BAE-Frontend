import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'seller-service-spec',
  templateUrl: './seller-service-spec.component.html',
  styleUrl: './seller-service-spec.component.css'
})
export class SellerServiceSpecComponent implements OnInit, OnDestroy {
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  searchField = new FormControl();

  servSpecs:any[]=[];
  nextServSpecs:any[]=[];
  page:number=0;
  SERV_SPEC_LIMIT: number = environment.SERV_SPEC_LIMIT;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  filter:any=undefined;
  status:any[]=['Active'];
  selectedTab: string = 'Draft';
  tabStatusMap: { [k: string]: string[] } = {
    Draft: ['Active'],
    Validated: ['Launched'],
    Deleted: ['Retired', 'Obsolete']
  };
  statusCounts: { [k: string]: number } = { Draft: 0, Validated: 0, Deleted: 0 };
  openMenuIdx: number | null = null;
  partyId:any;
  sort:any=undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private servSpecService: ServiceSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initServices();
      }
    })
  }

  ngOnInit() {
    this.initServices();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initServices(){
    this.loading=true;
    this.servSpecs=[];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(aux.logged_as==aux.id){
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.getServSpecs(false);
    this.loadStatusCounts();
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.filter=undefined;
          this.getServSpecs(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit(){
    initFlowbite();
  }

  goToCreate(){
    this.eventMessage.emitSellerCreateServiceSpec(true);
  }

  goToUpdate(serv:any){
    this.eventMessage.emitSellerUpdateServiceSpec(serv);
  }

  async getServSpecs(next:boolean){
    if(next==false){
      this.loading=true;
    }

    let options = {
      "filters": this.status,
      "partyId": this.partyId,
      "sort": this.sort
    }

    this.paginationService.getItemsPaginated(this.page, this.SERV_SPEC_LIMIT, next, this.servSpecs,this.nextServSpecs, options,
      this.servSpecService.getServiceSpecByUser.bind(this.servSpecService)).then(data => {
      this.page_check=data.page_check;
      this.servSpecs=data.items;
      this.nextServSpecs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getServSpecs(true);
  }

  filterInventoryByKeywords(){

  }

  onStateFilterChange(filter:string){
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
    } else {
      this.status.push(filter)
    }
    this.getServSpecs(false);
  }

  selectTab(tab: string) {
    if (tab === this.selectedTab) return;
    this.selectedTab = tab;
    this.status = [...this.tabStatusMap[tab]];
    this.page = 0;
    this.getServSpecs(false);
  }

  async loadStatusCounts() {
    try {
      const all: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const page = await this.servSpecService.getServiceSpecByUser(offset, [], this.partyId, undefined);
        const items = Array.isArray(page) ? page : [];
        all.push(...items);
        if (items.length < this.SERV_SPEC_LIMIT) break;
        offset += this.SERV_SPEC_LIMIT;
      }
      const counts: { [k: string]: number } = {};
      for (const tab of Object.keys(this.tabStatusMap)) counts[tab] = 0;
      for (const item of all) {
        const status = item?.lifecycleStatus;
        for (const tab of Object.keys(this.tabStatusMap)) {
          if (this.tabStatusMap[tab].includes(status)) { counts[tab]++; break; }
        }
      }
      this.statusCounts = counts;
    } catch {
    }
    this.cdr.detectChanges();
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

  rowStatusBadge(serv: any): { text: string, bg: string, color: string } {
    const hasChars = (serv?.specCharacteristic && serv.specCharacteristic.length > 0);
    if(serv?.lifecycleStatus === 'Launched'){
      return { text: 'Validated', bg: '#BBF7D0', color: '#052E16' };
    }
    if(serv?.lifecycleStatus === 'Retired' || serv?.lifecycleStatus === 'Obsolete'){
      return { text: 'Deleted', bg: '#FEE2E2', color: '#991B1B' };
    }
    if(hasChars){
      return { text: 'Ready to be validated', bg: '#DCFCE7', color: '#166534' };
    }
    return { text: 'Not completed', bg: '#FEF3C7', color: '#92400E' };
  }

  validateServ(serv: any){
    if(!serv?.id) return;
    this.servSpecService.updateServSpec({ lifecycleStatus: 'Launched' }, serv.id).subscribe({
      next: () => {
        this.openMenuIdx = null;
        this.eventMessage.emitSpecCreated('Service specification successfully validated');
        this.getServSpecs(false);
        this.loadStatusCounts();
      },
      error: () => {
        this.openMenuIdx = null;
      }
    });
  }

  deleteServ(serv: any){
    if(!serv?.id) return;
    this.openMenuIdx = null;
    const onSuccess = () => {
      this.eventMessage.emitSpecCreated('Service specification deleted');
      this.getServSpecs(false);
      this.loadStatusCounts();
    };
    const onError = (err: any) => {
      console.error('Service spec delete failed', err);
      this.eventMessage.emitSpecCreated('Could not delete this service specification.', 'error');
    };
    if(serv.lifecycleStatus === 'Active'){
      this.servSpecService.updateServSpec({ lifecycleStatus: 'Launched' }, serv.id).subscribe({
        next: () => {
          this.servSpecService.updateServSpec({ lifecycleStatus: 'Retired' }, serv.id).subscribe({
            next: onSuccess,
            error: onError
          });
        },
        error: onError
      });
    } else {
      this.servSpecService.updateServSpec({ lifecycleStatus: 'Retired' }, serv.id).subscribe({
        next: onSuccess,
        error: onError
      });
    }
  }

  onSortChange(event: any) {
    if(event.target.value=='name'){
      this.sort='name'
    }else{
      this.sort=undefined
    }
    this.getServSpecs(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
