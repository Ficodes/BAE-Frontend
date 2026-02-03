import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, NgModule, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { LoginInfo, billingAccountCart } from 'src/app/models/interfaces';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { InvoicesService } from 'src/app/services/invoices-service';
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
import {faIdCard, faSort, faSwatchbook, faEdit, faSave} from "@fortawesome/pro-solid-svg-icons";
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-invoices-info',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './invoices-info.component.html',
  styleUrl: './invoices-info.component.css'
})
export class InvoicesInfoComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  invoices:any[]=[];
  nextInvoices:any[]=[];
  profile:any;
  partyId:any='';
  showInvoiceDetails:boolean=false;
  invoiceToShow:any;
  appliedCustomerBillingRates: any[] = [];
  loadingACBRs: boolean = false;
  dateRange = new FormControl();
  selectedDate:any;
  preferred:boolean=false;
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  INVOICE_LIMIT: number = environment.INVOICE_LIMIT;

  sellerRole: string = environment.SELLER_ROLE;
  buyerRole: string = environment.BUYER_ROLE;

  filters: any[] = [];
  check_custom:boolean = false;
  isSeller:boolean = false;
  role:any = this.buyerRole;
  name:any = ''

  show_orders: boolean = true;
  show_billing: boolean = false;

  editingIndex: number | null = null;
  editableInvoiceName: string = '';

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;
  protected readonly faEdit = faEdit;
  protected readonly faSave = faSave;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private invoicesService: InvoicesService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
    private router: Router
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
    if(this.showInvoiceDetails==true){
      this.showInvoiceDetails=false;
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
        if (userRoles.includes(this.sellerRole)) {
          this.isSeller = true;
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
        let orgRoles = loggedOrg.roles.map((elem: any) => {
          return elem.name
        })
        if (orgRoles.includes(this.sellerRole)) {
          this.isSeller = true;
        }
      }
      //this.partyId = aux.partyId;
      this.page = 0;
      this.invoices = [];
      this.getInvoices(false);
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

  async getInvoices(next:boolean){
    console.log("-getOrders--")
    if(next==false){
      this.loading=true;
    }

    let options = {
      "filters": this.filters,
      "partyId": this.partyId,
      "selectedDate": this.selectedDate,
      "invoices": this.invoices,
      "role": this.role,
      "name": this.name
    }

    this.paginationService.getItemsPaginated(this.page, this.INVOICE_LIMIT, next, this.invoices, this.nextInvoices, options,
      this.paginationService.getInvoices.bind(this.paginationService)).then(data => {
      console.log('--pag')
      console.log(data)
      console.log(this.invoices)
      this.page_check = data.page_check;
      this.invoices = data.items;
      this.name = data.name;
      this.nextInvoices = data.nextItems;
      this.page = data.page;
      this.loading = false;
      this.loading_more = false;
    })
  }

  async next(){
    console.log("-invoice-info-NEXT--")
    await this.getInvoices(true);
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
    this.getInvoices(false);
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
    this.getInvoices(false);
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

  async toggleShowDetails(invoice: any){
    console.log(invoice)
    this.showInvoiceDetails = true;
    this.invoiceToShow = invoice;
    this.appliedCustomerBillingRates = [];
    this.loadingACBRs = true;

    try {
      this.appliedCustomerBillingRates = await this.invoicesService.getAppliedCustomerBillingRates(invoice.id);
      console.log('Applied Customer Billing Rates:', this.appliedCustomerBillingRates);
    } catch (error) {
      console.error('Error fetching applied customer billing rates:', error);
    } finally {
      this.loadingACBRs = false;
    }
  }

  async onRoleChange(role: any) {
    this.role = role;
    console.log('ROLE', this.role);
    await this.getInvoices(false);
  }

  goToProduct(prodId: any) {
    this.router.navigate(['/product-inventory/', prodId]);
  }

  editInvoice(index: number, invoice: any) {
    this.editingIndex = index;
    this.editableInvoiceName = invoice.billNo;
  }

  saveInvoice(index: number, invoice: any) {
    let oldName = invoice.billNo;
    invoice.billNo = this.editableInvoiceName;
    this.invoicesService.updateInvoice({
      billNo: this.editableInvoiceName
    }, invoice.id).subscribe({
      next: data => {
        console.log('actualizado invoice')
      },
      error: error => {
        invoice.billNo = oldName;
        console.error('There was an error while updating!', error);
      }
    });   
    this.editingIndex = null;
  }

  downloadInvoice(invoice: any) {
    console.log('Downloading invoice')
    let url = `${environment.BASE_URL}/invoicing/invoices/${invoice.id}?format=xml-html`

    window.open(url, '_blank');
  }
}
