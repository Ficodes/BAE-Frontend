import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import {EventMessageService} from "src/app/services/event-message.service";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'seller-resource-spec',
  templateUrl: './seller-resource-spec.component.html',
  styleUrl: './seller-resource-spec.component.css'
})
export class SellerResourceSpecComponent implements OnInit, OnDestroy {
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  searchField = new FormControl();

  resSpecs:any[]=[];
  nextResSpecs:any[]=[];
  page:number=0;
  RES_SPEC_LIMIT: number = environment.RES_SPEC_LIMIT;
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
    private resSpecService: ResourceSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initResources();
      }
    })
  }

  ngOnInit() {
    this.initResources();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initResources(){
    this.loading=true;
    this.resSpecs=[];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(aux.logged_as==aux.id){
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.getResSpecs(false);
    this.loadStatusCounts();
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.filter=undefined;
          this.getResSpecs(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit(){
    initFlowbite();
  }


  goToCreate(){
    this.eventMessage.emitSellerCreateResourceSpec(true);
  }

  goToUpdate(res:any){
    this.eventMessage.emitSellerUpdateResourceSpec(res);
  }

  async getResSpecs(next:boolean){
    if(next==false){
      this.loading=true;
    }
    
    let options = {
      "filters": this.status,
      "partyId": this.partyId,
      "sort": this.sort
    }
    
    this.paginationService.getItemsPaginated(this.page, this.RES_SPEC_LIMIT, next, this.resSpecs,this.nextResSpecs, options,
      this.resSpecService.getResourceSpecByUser.bind(this.resSpecService)).then(data => {
      this.page_check=data.page_check;      
      this.resSpecs=data.items;
      this.nextResSpecs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getResSpecs(true);
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
    this.getResSpecs(false);
  }

  selectTab(tab: string) {
    if (tab === this.selectedTab) return;
    this.selectedTab = tab;
    this.status = [...this.tabStatusMap[tab]];
    this.page = 0;
    this.getResSpecs(false);
  }

  async loadStatusCounts() {
    try {
      const all: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const page = await this.resSpecService.getResourceSpecByUser(offset, [], this.partyId);
        const items = Array.isArray(page) ? page : [];
        all.push(...items);
        if (items.length < this.RES_SPEC_LIMIT) break;
        offset += this.RES_SPEC_LIMIT;
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

  rowStatusBadge(res: any): { text: string, bg: string, color: string } {
    const hasChars = (res?.resourceSpecCharacteristic && res.resourceSpecCharacteristic.length > 0);
    if(res?.lifecycleStatus === 'Launched'){
      return { text: 'Validated', bg: '#BBF7D0', color: '#052E16' };
    }
    if(res?.lifecycleStatus === 'Retired' || res?.lifecycleStatus === 'Obsolete'){
      return { text: 'Deleted', bg: '#FEE2E2', color: '#991B1B' };
    }
    if(hasChars){
      return { text: 'Ready to be validated', bg: '#DCFCE7', color: '#166534' };
    }
    return { text: 'Not completed', bg: '#FEF3C7', color: '#92400E' };
  }

  validateRes(res: any){
    if(!res?.id) return;
    this.resSpecService.updateResSpec({ lifecycleStatus: 'Launched' }, res.id).subscribe({
      next: () => {
        this.openMenuIdx = null;
        this.eventMessage.emitSpecCreated('Resource specification successfully validated');
        this.getResSpecs(false);
        this.loadStatusCounts();
      },
      error: () => {
        this.openMenuIdx = null;
      }
    });
  }

  deleteRes(res: any){
    if(!res?.id) return;
    this.openMenuIdx = null;
    const onSuccess = () => {
      this.eventMessage.emitSpecCreated('Resource specification deleted');
      this.getResSpecs(false);
      this.loadStatusCounts();
    };
    const onError = (err: any) => {
      console.error('Resource spec delete failed', err);
      this.eventMessage.emitSpecCreated('Could not delete this resource specification.', 'error');
    };
    if(res.lifecycleStatus === 'Active'){
      this.resSpecService.updateResSpec({ lifecycleStatus: 'Launched' }, res.id).subscribe({
        next: () => {
          this.resSpecService.updateResSpec({ lifecycleStatus: 'Retired' }, res.id).subscribe({
            next: onSuccess,
            error: onError
          });
        },
        error: onError
      });
    } else {
      this.resSpecService.updateResSpec({ lifecycleStatus: 'Retired' }, res.id).subscribe({
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
    this.getResSpecs(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }
}
