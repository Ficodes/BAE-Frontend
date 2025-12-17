import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { LoginInfo, billingAccountCart } from 'src/app/models/interfaces';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { FastAverageColor } from 'fast-average-color';
import {components} from "src/app/models/product-catalog";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
type ProductOffering = components["schemas"]["ProductOffering"];
import { phoneNumbers, countries } from 'src/app/models/country.const'
import { initFlowbite } from 'flowbite';
import {EventMessageService} from "src/app/services/event-message.service";
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'order-info',
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.css'
})

export class OrderInfoComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  orders:any[]=[];
  nextOrders:any[]=[];
  profile:any;
  partyId:any='';
  showOrderDetails:boolean=false;
  orderToShow:any;
  dateRange = new FormControl();
  selectedDate:any;
  countries: any[] = countries;
  preferred:boolean=false;
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  ORDER_LIMIT: number = environment.ORDER_LIMIT;
  filters: any[]=[];
  check_custom:boolean=false;
  isSeller:boolean=false;
  role:any='Customer'

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  @HostListener('document:click')
  onClick() {
    if(this.showOrderDetails==true){
      this.showOrderDetails=false;
      this.cdr.detectChanges();
    }
    initFlowbite();  
  }

  ngOnInit() {    
    this.loading=true;
    let today = new Date();
    today.setMonth(today.getMonth()-1);
    this.selectedDate = today.toISOString();
    this.dateRange.setValue('month');
    this.initPartyInfo();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        let userRoles = aux.roles.map((elem: any) => {
          return elem.name
        })
        if (userRoles.includes("seller")) {
          this.isSeller=true;
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
        let orgRoles = loggedOrg.roles.map((elem: any) => {
          return elem.name
        })
        if (orgRoles.includes("seller")) {
          this.isSeller=true;
        }
      }
      //this.partyId = aux.partyId;
      this.page=0;
      this.orders=[];
      this.getOrders(false);
    }
    initFlowbite();
  }

  ngAfterViewInit(){
    initFlowbite();
  }

  getProductImage(prod:ProductOffering) {
    let profile = prod?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
    let images = prod.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
    if(profile.length!=0){
      images = profile;
    } 
    return images.length > 0 ? images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  async getOrders(next:boolean){
    if(next==false){
      this.loading=true;
    }
    
    let options = {
      "filters": this.filters,
      "partyId": this.partyId,
      "selectedDate": this.selectedDate,
      "orders": this.orders,
      "role": this.role
    }

    this.paginationService.getItemsPaginated(this.page, this.ORDER_LIMIT, next, this.orders,this.nextOrders, options,
      this.paginationService.getOrders.bind(this.paginationService)).then(data => {
        console.log('--pag')
        console.log(data)
        console.log(this.orders)
      this.page_check=data.page_check;      
      this.orders=data.items;
      this.nextOrders=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getOrders(true);
  }

  onStateFilterChange(filter:string){
    const index = this.filters.findIndex(item => item === filter);
    if (index !== -1) {
      this.filters.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.filters)
    } else {
      console.log('añade filtro')
      this.filters.push(filter)
      console.log(this.filters)
    }
    this.getOrders(false);
  }

  isFilterSelected(filter:any){
    const index = this.filters.findIndex(item => item === filter);
    if (index !== -1) {
      return true
    } else {
      return false;
    } 
  }

  filterOrdersByDate(){
    if(this.dateRange.value == 'month'){
      let today = new Date();
      today.setDate(1);
      today.setMonth(today.getMonth()-1);
      this.selectedDate = today.toISOString();
    } else if (this.dateRange.value == 'months'){
      let today = new Date();
      today.setDate(1);
      today.setMonth(today.getMonth()-3);
      this.selectedDate = today.toISOString();
    } else if(this.dateRange.value == 'year'){
      let today = new Date();
      today.setDate(1);
      today.setMonth(0);
      today.setFullYear(today.getFullYear()-1);
      this.selectedDate = today.toISOString();
    } else {
      this.selectedDate = undefined
    }
    this.getOrders(false);
  }

  getTotalPrice(items:any[]){
    let totalPrice = [];
    let insertCheck = false;
    this.check_custom=false;
    for(let i=0; i<items.length; i++){
      insertCheck = false;
      if(totalPrice.length == 0 && items[i].productOfferingPrice != undefined){
        if(items[i].productOfferingPrice.priceType != 'custom'){
          totalPrice.push(items[i].productOfferingPrice);
        } else {
          this.check_custom=true;
        }     
      } else {
        for(let j=0; j<totalPrice.length; j++){
          if(items[i].productOfferingPrice != undefined){
            if(items[i].productOfferingPrice.priceType != 'custom'){
              if(items[i].productOfferingPrice.priceType == totalPrice[j].priceType && items[i].productOfferingPrice.unit == totalPrice[j].unit && items[i].productOfferingPrice.text == totalPrice[j].text){
                totalPrice[j].price=totalPrice[j].price+items[i].productOfferingPrice.price;
                insertCheck=true;
              }
            } else {
              this.check_custom=true;
            }
          }
        }
        if(insertCheck==false){
          if(items[i].productOfferingPrice != undefined){
            if(items[i].productOfferingPrice.priceType != 'custom'){
              totalPrice.push(items[i].productOfferingPrice);
              insertCheck=true;
            } else {
              this.check_custom=true;
            }
          }
        }
      }
    }
    return totalPrice
  }

  toggleShowDetails(order:any){
    console.log(order)
    this.showOrderDetails=true;
    this.orderToShow=order;
  }

  async onRoleChange(event: any) {
    this.role=event.target.value;
    await this.getOrders(false);
  }

}
