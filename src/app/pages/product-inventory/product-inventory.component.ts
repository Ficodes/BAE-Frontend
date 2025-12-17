import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import {components} from "../../models/product-catalog";
import { initFlowbite } from 'flowbite';
type ProductOffering = components["schemas"]["ProductOffering"];
import {EventMessageService} from "../../services/event-message.service";
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-product-inventory',
  templateUrl: './product-inventory.component.html',
  styleUrl: './product-inventory.component.css'
})
export class ProductInventoryComponent implements OnInit, AfterViewInit, OnDestroy {
  show_prods:boolean = true;
  show_serv:boolean = false;
  show_res:boolean = false;
  show_orders:boolean = false;
  openServiceId:any=undefined;
  openResourceId:any=undefined;
  openProdId:any=undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'OpenServiceDetails') {
        this.openServiceId=(ev.value as any)?.serviceId;
        this.openProdId=(ev.value as any)?.prodId; 
        this.getServices();
      }
      if(ev.type === 'OpenResourceDetails'){
        this.openResourceId=(ev.value as any)?.resourceId;
        this.openProdId=(ev.value as any)?.prodId;
        this.getResources();
      }
      if(ev.type === 'OpenProductInvDetails'){
        this.openProdId=ev.value;
        this.goToOffers();
      }
    })
  }

  ngOnInit() {
    initFlowbite();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  goToOffers(){
    initFlowbite();
    this.selectProd();       
    this.show_serv=false;
    this.show_res=false;
    this.show_orders=false;
    this.show_prods=true;
  }  

  getServices(){    
    this.selectServ();
    this.show_orders=false;    
    this.show_prods=false;
    this.show_res=false;
    this.show_serv=true;
    this.cdr.detectChanges();
    initFlowbite();
  }

  getResources(){  
    this.selectRes();  
    this.show_orders=false;    
    this.show_prods=false;    
    this.show_serv=false;  
    this.show_res=true;
    this.cdr.detectChanges();
    initFlowbite();
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  unselectMenu(elem:HTMLElement | null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        this.removeClass(elem,cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectMenu(elem:HTMLElement| null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        console.log('already selected')
      } else {
        this.addClass(elem,cls)
      }
    }
  }

  selectProd(){
    let prod_button = document.getElementById('prod-button')
    let serv_button = document.getElementById('serv-button')
    let res_button = document.getElementById('res-button')
    let order_button = document.getElementById('order-button')

    this.selectMenu(prod_button,'text-white bg-primary-100');
    this.unselectMenu(serv_button,'text-white bg-primary-100');
    this.unselectMenu(res_button,'text-white bg-primary-100');
    this.unselectMenu(order_button,'text-white bg-primary-100');
  }

  selectServ(){
    let prod_button = document.getElementById('prod-button')
    let serv_button = document.getElementById('serv-button')
    let res_button = document.getElementById('res-button')
    let order_button = document.getElementById('order-button')

    this.selectMenu(serv_button,'text-white bg-primary-100');
    this.unselectMenu(prod_button,'text-white bg-primary-100');
    this.unselectMenu(res_button,'text-white bg-primary-100');
    this.unselectMenu(order_button,'text-white bg-primary-100');
  }

  selectRes(){
    let prod_button = document.getElementById('prod-button')
    let serv_button = document.getElementById('serv-button')
    let res_button = document.getElementById('res-button')
    let order_button = document.getElementById('order-button')

    this.selectMenu(res_button,'text-white bg-primary-100');
    this.unselectMenu(prod_button,'text-white bg-primary-100');
    this.unselectMenu(serv_button,'text-white bg-primary-100');
    this.unselectMenu(order_button,'text-white bg-primary-100');
  }

}
