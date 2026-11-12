import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoginInfo } from 'src/app/models/interfaces';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { Router } from '@angular/router';
import { PaginationService } from 'src/app/services/pagination.service';
import {EventMessageService} from "src/app/services/event-message.service";
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'inventory-resources',
  templateUrl: './inventory-resources.component.html',
  styleUrl: './inventory-resources.component.css'
})
export class InventoryResourcesComponent implements OnInit, OnDestroy {



  partyId:any='';
  loading: boolean = false;
  resources:any[]=[];
  nextResources:any[]=[];
  readonly statusTabs = [
    { value: 'reserved', label: 'PRODUCT_INVENTORY._reserved' },
    { value: 'available', label: 'PRODUCT_INVENTORY._available' },
    { value: 'suspended', label: 'PRODUCT_INVENTORY._suspended' },
  ];
  selectedStatus = this.statusTabs[0].value;
  status: string[] = [this.selectedStatus];
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  INVENTORY_LIMIT: number = environment.INVENTORY_RES_LIMIT;
  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: ProductInventoryServiceService,
    private localStorage: LocalStorageService,
    private router: Router,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initInventory();
      }
    })
  }

  ngOnInit() {
    this.selectedStatus = this.statusTabs[0].value;
    this.status = [this.selectedStatus];
    this.initInventory();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initInventory(){
    this.loading=true;

    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
      this.getInventory(false);
      
    }
    initFlowbite();
  }

  async getInventory(next:boolean){
    if(next==false){
      this.loading=true;
    }

    let options = {
      "partyId": this.partyId,
      "filters": this.status
    }
    
    try {
      const data = await this.paginationService.getItemsPaginated(this.page, this.INVENTORY_LIMIT, next, this.resources, this.nextResources, options,
        this.inventoryService.getResourceInventory.bind(this.inventoryService));
      this.page_check=data.page_check;
      this.resources=data.items;
      this.nextResources=data.nextItems;
      this.page=data.page;
      console.log(this.resources)
    } finally {
      this.loading=false;
      this.loading_more=false;
    }
  }
  async next(){
    this.loading_more = true;
    await this.getInventory(true);
  }

  selectResource(item: any) {
    return this.router.navigate(['/product-inventory/resources', item.id]);
  }

  selectStatusTab(status: string) {
    if (this.loading || this.loading_more || this.selectedStatus === status || !this.statusTabs.some(tab => tab.value === status)) return;

    this.selectedStatus = status;
    this.status = [status];
    this.page = 0;
    this.resources = [];
    this.nextResources = [];
    return this.getInventory(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
