import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'seller-service-spec',
  templateUrl: './seller-service-spec.component.html',
  styleUrl: './seller-service-spec.component.css'
})
export class SellerServiceSpecComponent implements OnInit {
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
  status:any[]=['Active','Launched'];
  partyId:any;
  sort:any=undefined;

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private servSpecService: ServiceSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initServices();
      }
    })
  }

  ngOnInit() {
    this.initServices();
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
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
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
    this.getServSpecs(false);
  }

  async next(){
    await this.getServSpecs(true);
  }

  onSortChange(event: any) {
    if(event.target.value=='name'){
      this.sort='name'
    }else{
      this.sort=undefined
    }
    this.getServSpecs(false);
  }
}
