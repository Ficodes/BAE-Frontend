import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { LoginInfo, billingAccountCart } from 'src/app/models/interfaces';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import {components} from "src/app/models/product-catalog";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
type ProductOffering = components["schemas"]["ProductOffering"];
import { phoneNumbers, countries } from 'src/app/models/country.const'
import { initFlowbite } from 'flowbite';
import {EventMessageService} from "src/app/services/event-message.service";
import * as moment from 'moment';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'billing-info',
  templateUrl: './billing-info.component.html',
  styleUrl: './billing-info.component.css'
})
export class BillingInfoComponent implements OnInit{
  loading: boolean = false;
  orders:any[]=[];
  profile:any;
  partyId:any='';
  partyInfo:any = {
    id: '',
    name: '',
    href: ''
  }
  billing_accounts: billingAccountCart[] =[];
  selectedBilling:any;
  billToDelete:any;
  billToUpdate:any;
  editBill:boolean=false;
  deleteBill:boolean=false;
  showOrderDetails:boolean=false;
  orderToShow:any;
  dateRange = new FormControl();
  selectedDate:any;
  countries: any[] = countries;
  preferred:boolean=false;
  isReadOnly:boolean=false;

  errorMessage:any='';
  showError:boolean=false;

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'BillAccChanged') {
        this.getBilling();
      }
      if(ev.value == false){
        this.editBill=false;
      }
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  @HostListener('document:click')
  onClick() {
    if(this.editBill==true){
      this.editBill=false;
      this.cdr.detectChanges();
    }
    if(this.deleteBill==true){
      this.deleteBill=false;
      this.cdr.detectChanges();
    }
    if(this.showOrderDetails==true){
      this.showOrderDetails=false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.loading=true;
    let today = new Date();
    today.setMonth(today.getMonth()-1);
    this.selectedDate = today.toISOString();
    this.initPartyInfo();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if (aux.logged_as !== aux.id) {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        console.log('loggedOrg info')
        console.log(loggedOrg)
        this.partyInfo = {
          id: this.partyId,
          name: loggedOrg.name,
          href : this.partyId,
          role: "Owner"
        }

        // Check if user has orgAdmin role for edit permission
        if(loggedOrg && loggedOrg.roles){
          const orgRoles = loggedOrg.roles.map((role: any) => role.name);
          const hasOrgAdminRole = orgRoles.some((role: any) => role === 'orgAdmin');
          this.isReadOnly = !hasOrgAdminRole;
        }
      } else {
        this.partyId = aux.partyId;
        console.log('init party info')
        console.log(aux)
        this.partyInfo = {
          id: this.partyId,
          name: aux.user,
          href : this.partyId,
          role: "Owner"
        }
        this.isReadOnly = false;
      }
      this.getBilling();
    }
    initFlowbite();
  }

  getBilling(){
    let isBillSelected=false;
    this.accountService.getBillingAccount().then(data => {
      this.billing_accounts=[];
      for(let i=0; i< data.length;i++){
        isBillSelected=false;
        let email =''
        let phone=''
        let phoneType = ''
        let address = {
          "city": '',
          "country": '',
          "postCode": '',
          "stateOrProvince": '',
          "street": ''
        }
        for(let j=0; j<data[i].contact[0].contactMedium.length;j++){
          if(data[i].contact[0].contactMedium[j].mediumType == 'Email'){
            email = data[i].contact[0].contactMedium[j].characteristic.emailAddress
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'PostalAddress'){
            address = {
              "city": data[i].contact[0].contactMedium[j].characteristic.city,
              "country": data[i].contact[0].contactMedium[j].characteristic.country,
              "postCode": data[i].contact[0].contactMedium[j].characteristic.postCode,
              "stateOrProvince": data[i].contact[0].contactMedium[j].characteristic.stateOrProvince,
              "street": data[i].contact[0].contactMedium[j].characteristic.street1
            }
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'TelephoneNumber'){
            phone = data[i].contact[0].contactMedium[j].characteristic.phoneNumber
            phoneType = data[i].contact[0].contactMedium[j].characteristic.contactType
          }
          if(data[i].contact[0].contactMedium[j].preferred==true){
            isBillSelected=true;
          }
        }
        console.log(data[i])
        this.billing_accounts.push({
          "id": data[i].id,
          "href": data[i].href,
          "name": data[i].name,
          "email": email,
          "postalAddress": address,
          "telephoneNumber": phone,
          "telephoneType": phoneType,
          "selected": isBillSelected
        })
        if(isBillSelected){
          this.selectedBilling={
            "id": data[i].id,
            "href": data[i].href,
            "name": data[i].name,
            "email": email,
            "postalAddress": address,
            "telephoneNumber": phone,
            "selected": true
          }
        }
      }
      this.loading=false;
      if(this.billing_accounts.length>0){
        this.preferred=false;
      }else{
        this.preferred=true;
      }
      console.log(this.billing_accounts)
      this.cdr.detectChanges();
    })
    
    this.cdr.detectChanges();
    initFlowbite();
  }

  selectBill(baddr: billingAccountCart){
    const index = this.billing_accounts.findIndex(item => item.id === baddr.id);
    for(let i=0; i < this.billing_accounts.length; i++){
      if(i==index){
        this.billing_accounts[i].selected=true;
        this.selectedBilling=this.billing_accounts[i];
      } else {
        this.billing_accounts[i].selected=false;
      }
      if(this.billing_accounts[i].selected==false){
        this.updateBilling(this.billing_accounts[i])
      }      
    }
    for(let i=0; i < this.billing_accounts.length; i++){
      if(this.billing_accounts[i].selected==true){
        this.updateBilling(this.billing_accounts[i])
      }      
    }
    this.cdr.detectChanges();
  }

  updateBilling(bill:billingAccountCart) {
      let bill_body = {
        name: bill.name,
        contact: [{
          contactMedium: [
            {
              mediumType: 'Email',
              preferred: bill.selected,
              characteristic: {
                contactType: 'Email',
                emailAddress: bill.email
              }
            },
            {
              mediumType: 'PostalAddress',
              preferred: bill.selected,
              characteristic: {
                contactType: 'PostalAddress',
                city: bill.postalAddress.city,
                country: bill.postalAddress.country,
                postCode: bill.postalAddress.postCode,
                stateOrProvince: bill.postalAddress.stateOrProvince,
                street1: bill.postalAddress.street
              }
            },
            {
              mediumType: 'TelephoneNumber',
              preferred: bill.selected,
              characteristic: {
                contactType: bill.telephoneType,
                phoneNumber: bill.telephoneNumber
              }
            }
          ]
        }],
        relatedParty: [this.partyInfo],
        state: "Defined"
      }
      this.accountService.updateBillingAccount(bill.id, bill_body).subscribe({
        next: data => {
          this.eventMessage.emitBillAccChange(false);
        },
        error: error => {
          console.error('There was an error while updating!', error);
          if(error.error.error){
            console.log(error)
            this.errorMessage='Error: '+error.error.error;
          } else {
            this.errorMessage='There was an error while updating billing account!';
          }
          this.showError=true;
          setTimeout(() => {
            this.showError = false;
          }, 3000);
        }
      });
  }

  onDeletedBill(baddr: billingAccountCart) {
    console.log('--- DELETE BILLING ADDRESS ---')
    //this.accountService.deleteBillingAccount(baddr.id).subscribe(() => this.getBilling());
    this.deleteBill=false;
    this.cdr.detectChanges();
  }

  toggleEditBill(bill:billingAccountCart){
    this.billToUpdate=bill;    
    this.editBill=true;
    this.cdr.detectChanges();
  }

  toggleDeleteBill(bill:billingAccountCart){
    this.deleteBill=true;
    this.billToDelete=bill;
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}