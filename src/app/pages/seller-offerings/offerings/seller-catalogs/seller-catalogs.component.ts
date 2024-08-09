import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'seller-catalogs',
  templateUrl: './seller-catalogs.component.html',
  styleUrl: './seller-catalogs.component.css'
})
export class SellerCatalogsComponent {

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
  status:any[]=['Active','Launched'];

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initCatalogs();
      }
    })
  }

  ngOnInit() {
    this.initCatalogs();
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
    //this.loading_more=true;
    this.page=this.page+this.CATALOG_LIMIT;
    this.cdr.detectChanges;
    console.log(this.page)
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
}
