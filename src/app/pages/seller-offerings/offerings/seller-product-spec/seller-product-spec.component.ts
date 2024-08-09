import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook, faSparkles} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'seller-product-spec',
  templateUrl: './seller-product-spec.component.html',
  styleUrl: './seller-product-spec.component.css'
})
export class SellerProductSpecComponent implements OnInit{
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;
  protected readonly faSparkles = faSparkles;

  searchField = new FormControl();

  prodSpecs:any[]=[];
  nextProdSpecs:any[]=[];
  page:number=0;
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  filter:any=undefined;
  status:any[]=['Active','Launched'];
  partyId:any;
  sort:any=undefined;
  isBundle:any=undefined;

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private prodSpecService: ProductSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initProdSpecs();
      }
    })
  }

  ngOnInit() {
    this.initProdSpecs();
  }

  initProdSpecs(){
    this.loading=true;
    this.prodSpecs=[];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(aux.logged_as==aux.id){
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.getProdSpecs(false);
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.filter=undefined;
          this.getProdSpecs(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit(){
    initFlowbite();
  }

  goToCreate(){
    this.eventMessage.emitSellerCreateProductSpec(true);
  }

  goToUpdate(prod:any){
    this.eventMessage.emitSellerUpdateProductSpec(prod);
  }

  async getProdSpecs(next:boolean){
    if(next==false){
      this.loading=true;
    }
    
    let options = {
      "filters": this.status,
      "partyId": this.partyId,
      "sort": this.sort,
      "isBundle": this.isBundle
    }

    this.paginationService.getItemsPaginated(this.page, this.PROD_SPEC_LIMIT, next, this.prodSpecs, this.nextProdSpecs, options,
      this.prodSpecService.getProdSpecByUser.bind(this.prodSpecService)).then(data => {
      this.page_check=data.page_check;      
      this.prodSpecs=data.items;
      this.nextProdSpecs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getProdSpecs(true);
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
    this.getProdSpecs(false);
  }

  onSortChange(event: any) {
    if(event.target.value=='name'){
      this.sort='name'
    }else{
      this.sort=undefined
    }
    this.getProdSpecs(false);
  }

  onTypeChange(event: any) {
    if(event.target.value=='simple'){
      this.isBundle=false
    }else if (event.target.value=='bundle'){
      this.isBundle=true
    }else{
      this.isBundle=undefined
    }
    this.getProdSpecs(false);
  }
}