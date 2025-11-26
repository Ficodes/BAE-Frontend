import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, Input } from '@angular/core';
import { LoginInfo } from 'src/app/models/interfaces';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { Router } from '@angular/router';
import { PaginationService } from 'src/app/services/pagination.service';
import {EventMessageService} from "src/app/services/event-message.service";
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';

@Component({
  selector: 'inventory-resources',
  templateUrl: './inventory-resources.component.html',
  styleUrl: './inventory-resources.component.css'
})
export class InventoryResourcesComponent implements OnInit {

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  @Input() resourceId: any = undefined;
  @Input() prodId: any = undefined;

  partyId:any='';
  loading: boolean = false;
  resources:any[]=[];
  nextResources:any[]=[];
  status:any[]=[];
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  INVENTORY_LIMIT: number = environment.INVENTORY_RES_LIMIT;
  showDetails:boolean=false;
  selectedRes:any;

  constructor(
    private inventoryService: ProductInventoryServiceService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initInventory();
      }
    })
  }

  ngOnInit() {
    if(this.resourceId!=undefined){      
      this.api.getResourceSpec(this.resourceId).then(res => {
        this.selectResource(res)
        console.log('entre')
        console.log(res)
      })      
    }
    this.initInventory();
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
    
    this.paginationService.getItemsPaginated(this.page, this.INVENTORY_LIMIT, next, this.resources, this.nextResources, options,
      this.inventoryService.getResourceInventory.bind(this.inventoryService)).then(data => {
      this.page_check=data.page_check;      
      this.resources=data.items;
      this.nextResources=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
      console.log(this.resources)
    })
  }
  async next(){
    await this.getInventory(true);
  }

  selectResource(res:any){
    this.selectedRes=res;
    this.showDetails=true;
  }

  back(){
    if(this.prodId!=undefined){
      this.eventMessage.emitOpenProductInvDetails(this.prodId);
      this.showDetails=false;
    } else {
      this.showDetails=false;
    }    
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
    this.getInventory(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
