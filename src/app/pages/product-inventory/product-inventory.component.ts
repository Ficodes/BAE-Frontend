import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { initFlowbite } from 'flowbite';
import {EventMessageService} from "../../services/event-message.service";
import { ActivatedRoute, Router } from '@angular/router';
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
    private route: ActivatedRoute,
    private router: Router,
    private eventMessage: EventMessageService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'OpenServiceDetails') {
        this.openServiceId=(ev.value as any)?.serviceId;
        this.openProdId=(ev.value as any)?.prodId; 
        this.router.navigate(['/product-inventory/services', this.openServiceId], { queryParams: { source: 'specification', productId: this.openProdId } });
      }
      if(ev.type === 'OpenResourceDetails'){
        this.openResourceId=(ev.value as any)?.resourceId;
        this.openProdId=(ev.value as any)?.prodId;
        this.router.navigate(['/product-inventory/resources', this.openResourceId], { queryParams: { source: 'specification', productId: this.openProdId } });
      }
      if(ev.type === 'OpenProductInvDetails'){
        this.openProdId=ev.value;
        this.router.navigate(['/product-inventory', this.openProdId]);
      }
    })
  }

  ngOnInit() {
    const section = this.route.snapshot.queryParamMap.get('section');
    this.show_prods = section !== 'services' && section !== 'resources';
    this.show_serv = section === 'services';
    this.show_res = section === 'resources';
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
    this.show_serv=false;
    this.show_res=false;
    this.show_orders=false;
    this.show_prods=true;
  }  

  getServices(){    
    this.show_orders=false;    
    this.show_prods=false;
    this.show_res=false;
    this.show_serv=true;
    this.cdr.detectChanges();
    initFlowbite();
  }

  getResources(){  
    this.show_orders=false;    
    this.show_prods=false;    
    this.show_serv=false;  
    this.show_res=true;
    this.cdr.detectChanges();
    initFlowbite();
  }

}
