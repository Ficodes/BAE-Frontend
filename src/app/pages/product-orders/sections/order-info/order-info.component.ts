import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
import {Drawer, initFlowbite, Modal} from 'flowbite';
import {EventMessageService} from "src/app/services/event-message.service";
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {SharedModule} from "../../../../shared/shared.module";
import { v4 as uuidv4 } from 'uuid';
import { from, Observable } from 'rxjs';

@Component({
  selector: 'app-order-info',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, SharedModule],
  providers: [DatePipe],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.css'
})
export class OrderInfoComponent implements OnInit, AfterViewInit {
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
  showError: boolean = false;
  errorMessage: string = '';
  customerName$!: Observable<string>;

  page: number=0;
  ORDER_LIMIT: number = environment.ORDER_LIMIT;
  filters: any[]=[];
  check_custom:boolean=false;
  isSeller:boolean=false;
  role:any='Customer'

  // Confirm modal stuff
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  actionType: string = '';
  selectedItem: any = null;
  private modalInstance: any;

  // Note's drawer
  isDrawerOpen = false;
  drawerInstance: Drawer | null = null;
  selectedOrder: any = null;
  newNoteText = '';
  currentUser!: string;
  isLoading = false;
  isUpdating = false;

  @ViewChild('noteContainer') noteContainer!: ElementRef;

  userCache = new Map<string, string>(); // Caching userId -> username


  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
  ) {
    this.eventMessage.messages$.subscribe(ev => {
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
    //initFlowbite();
  }

  openModal(action: string, item: any) {
    this.actionType = action;
    this.selectedItem = item;
    if (this.modalInstance) {
      this.modalInstance.show();
    } else {
      console.error("Modal instance is not initialized!");
    }  }

  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  handleError(msg: string) {
    this.errorMessage = msg;
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  async confirmAction() {
    return this.updateLifecycle(this.actionType, this.selectedItem);
  }

  async updateLifecycle(state: string, item: any) {
    if (!this.orderToShow) {
      console.error("No order selected! Is this possible?");
      return;
    }

    console.log('Transitioning to...', state, item);
    this.selectedItem = item;

    const prevState = this.selectedItem.productOrderItem['state']
    try {
      // Actualizar el estado en la UI antes de enviar el PATCH
      this.selectedItem.productOrderItem['state'] = state;

      // Crear objeto PATCH para actualizar el estado
      const statePatchData = {
        productOrderItem: this.orderToShow.productOrderItem
      };

      // Llamar al servicio para actualizar solo el estado
      const stateResponse: any = await this.orderService.updateOrder(this.orderToShow.id, statePatchData);
      console.log("Order state updated successfully:", stateResponse);

      this.orderToShow.state = stateResponse.state;
    } catch (error) {
      this.selectedItem.productOrderItem['state'] = prevState

      this.handleError("Error updating order state");
      console.error("Error updating order:", error);
    }

    try {
      // Ahora creamos la nota después de la actualización exitosa
      const newNote = {
        text: `Order state updated to ${state}`,
        id: `urn:ngsi-ld:note:${uuidv4()}`,
        author: this.partyId,
        date: new Date().toISOString()
      };

      // Asegurar que el array de notas existe
      if (!this.orderToShow.note) {
        this.orderToShow.note = [];
      }

      // Agregar la nueva nota localmente
      this.orderToShow.note.push(newNote);

      // Crear objeto PATCH para actualizar solo la nota
      const notePatchData = {
        note: this.orderToShow.note
      };

      // Llamar al servicio para actualizar solo la nota
      const noteResponse = await this.orderService.updateOrder(this.orderToShow.id, notePatchData);
      console.log("Order note added successfully:", noteResponse);
    } catch (error) {
      console.error("Error updating order notes:", error);
    }

    // Cerrar el modal después de completar ambas actualizaciones
    this.closeModal();
  }

  ngOnInit() {
    this.loading = true;
    let today = new Date();
    today.setMonth(today.getMonth()-1);
    this.selectedDate = today.toISOString();
    this.dateRange.setValue('month');
    this.initPartyInfo();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        this.currentUser = aux.user;
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
      this.page = 0;
      this.orders = [];
      this.getOrders(false);
    }
    initFlowbite();
  }

  ngAfterViewInit(): void{
    initFlowbite();
    const drawerElement = document.getElementById('drawer-notes');
    if (drawerElement) {
      this.drawerInstance = new Drawer(drawerElement, { placement: 'right', backdrop: false });
    }
    setTimeout(() => {
      if (this.confirmModal) {
        this.modalInstance = new Modal(this.confirmModal.nativeElement);
      }
    }, 100);
  }

  // Note's drawer functionality
  toggleDrawer(order: any): void {
    this.selectedOrder = order;
    if (this.drawerInstance) {
      this.isLoading = true;
      this.drawerInstance.show();
      // 1s before showing notes
      setTimeout(() => {
        this.isLoading = false;

        // Sorts notes (older before)
        if (this.selectedOrder?.note?.length) {
          this.selectedOrder.note.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        this.scrollToBottom();
      }, 1000);
    }
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    if (this.drawerInstance) {
      this.drawerInstance.hide();
      //Clear note's textarea
      this.newNoteText = '';
    }
    this.isDrawerOpen = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    this.closeDrawer();
  }

  private scrollToBottom(): void {
    if (this.noteContainer) {
      setTimeout(() => {
        this.noteContainer.nativeElement.scrollTop = this.noteContainer.nativeElement.scrollHeight;
      }, 100);
    }
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
      /*this.orders=[{
        id: '12345',
        quantity: 1,
        action: 'add',
        //billingAccount?: components["schemas"]["BillingAccountRef"];
        itemPrice: [],
        itemTerm: [],
        itemTotalPrice: [],
        payment: [],
        product: {},
        productOffering: {},
        productOrderItem: [],
        productOrderItemRelationship: [],
        state: 'acknowledged'
    }]*/
      this.nextOrders=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    console.log("-order-info-NEXT--")
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
    //console.log(order)
    this.showOrderDetails=true;
    this.orderToShow=order;
    this.customerName$ = from(this.getCustomerName());
  }

  async onRoleChange(role: any) {
    this.role = role;
    await this.getOrders(false);
  }

  hasProcurementAutomaticTerm(item: any): boolean {
    return item.productOfferingTerm?.some(
      (term: any) => term.name === "procurement" && term.description === "automatic"
    );
  }


  hasNotes(order: any): boolean{
    return !!order.note;
  }

  async addNote(): Promise<void> {
    if (!this.newNoteText.trim()) return;

    const newNote = {
      text: this.newNoteText,
      id: `urn:ngsi-ld:note:${uuidv4()}`,
      author: this.partyId,
      date: new Date().toISOString()
    };

    // Add the note to the UI immediately
    this.selectedOrder.note.push(newNote);
    this.newNoteText = ''; // Clear input field
    this.isUpdating = true;
    this.scrollToBottom();

    try {
      // Send update request to the backend
      const patchData = { note: this.selectedOrder.note };

      await this.orderService.updateOrder(this.selectedOrder.id, patchData);
      console.log('Order notes updated successfully');
    } catch (error) {
      this.handleError("Error updating order notes");
      console.error('Error updating order notes:', error);
      // Remove the note if update fails
      this.selectedOrder.note.pop();
    } finally {
      this.isUpdating = false;
    }
  }

  goToCustomerDeatils() {
    const customer = this.orderToShow.relatedParty.find(
      (party: any) => party.role?.toLowerCase() === 'customer'
    );

    window.open(this.router.serializeUrl(
      this.router.createUrlTree(['/org-details', customer?.id])
    ), '_blank');
  }

  private async getCustomerName(): Promise<string> {
    if (this.orderToShow?.relatedParty) {
      const customer = this.orderToShow.relatedParty.find(
        (party: any) => party.role?.toLowerCase() === 'customer'
      );
      if (customer?.id) {
        return this.getUsername(customer.id);
      }
    }
    return '';
  }

  async getUsername(partyId: string): Promise<string> {
    if (this.userCache.has(partyId)) {
      return this.userCache.get(partyId)!;
    }

    try {
      let username: string;

      if (partyId.startsWith('urn:ngsi-ld:individual:')) {
        // Get individual user info
        const userInfo = await this.accountService.getUserInfo(partyId);
        username = `${userInfo?.givenName || ''} ${userInfo?.familyName || ''}`.trim() || `Unknown (${partyId})`;
      } else if (partyId.startsWith('urn:ngsi-ld:organization:')) {
        // Get organization info
        const orgInfo = await this.accountService.getOrgInfo(partyId);
        username = orgInfo?.tradingName || `Unknown Organization (${partyId})`;
      } else {
        username = `Unknown (${partyId})`;
      }

      // Store in cache
      this.userCache.set(partyId, username);
      return username;
    } catch (error) {
      console.error('Error fetching name for', partyId, error);
      return `Unknown (${partyId})`;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  protected readonly JSON = JSON;
}
