import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import {
  faCartShopping
} from "@fortawesome/sharp-solid-svg-icons";
import {components} from "../../models/product-catalog";
import {LocalStorageService} from "../../services/local-storage.service";
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import {EventMessageService} from "../../services/event-message.service";
import { Drawer } from 'flowbite';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service'
import { cartProduct } from '../../models/interfaces';
import { TYPES } from 'src/app/models/types.const';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart-drawer',
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.css'
})
export class CartDrawerComponent implements OnInit{
  protected readonly faCartShopping = faCartShopping;
  items: any[] = [];
  totalPrice:any;
  showBackDrop:boolean=true;
  check_custom:boolean=false;
  loading:boolean=false;
  errorMessage:string='';
  showError:boolean=false;

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private priceService: PriceServiceService,
    private cartService: ShoppingCartServiceService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,) {

  }

  /*@HostListener('document:click')
  onClick() {
    document.querySelector("body > div[drawer-backdrop]")?.remove()
  }*/

  ngOnInit(): void {
    this.loading=true;
    this.showBackDrop=true;
    this.getCart();

    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'AddedCartItem') {
        console.log('Elemento añadido')
        this.loading=true;
        this.getCart();
      } else if(ev.type === 'RemovedCartItem') {
        this.loading=true;
        this.getCart();
      }
    })
    console.log('Elementos en el carrito....')
    console.log(this.items)
  }

  get objectKeys() {
    return Object.keys;
  }

  getCart(){
    try {
      this.cartService.getShoppingCart().then(async data => {
        console.log('---CARRITO API---')
        console.log(data)
        this.items=data;
        await this.getProviderInfo();
        this.groupItemsByOwner();
        this.loading=false;
        this.cdr.detectChanges();
        console.log('------------------')
      })
    } catch (error) {
      this.loading=false;
      this.handleError(error, 'There was an error while retrieving the cart!');
    }
  }

  private handleError(error: any, defaultMessage: string) {
    console.error(defaultMessage, error);
    this.errorMessage = error?.error?.error ? `Error: ${error.error.error}` : defaultMessage;
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  hasKey(obj: any, key: string): boolean {
    return key in obj;
  }

  async deleteProduct(product: cartProduct){
    await this.cartService.removeItemShoppingCart(product.id);
    console.log('deleted');
    this.eventMessage.emitRemovedCartItem(product as cartProduct);
  }

  goToProdDetails(product: cartProduct){
    this.hideCart();
    this.router.navigate(['/search/', product.id]);
  }

  hideCart(){
    this.eventMessage.emitToggleDrawer(false);
  }


  goToShoppingCart(id:any) {
    this.hideCart();
    this.router.navigate(['/checkout',id]);
  }

  async getProviderInfo(){
    for(let i=0; i < this.items.length; i++){
      try {  
        let offer = await this.api.getProductById(this.items[i].id);      
        let product = await this.api.getProductSpecification(offer.productSpecification.id)
        this.items[i]['relatedParty']=product.relatedParty
      } catch (error) {
        console.log('--- not found?')
        console.log(error)
        if((error as any).status==404){
          await this.cartService.removeItemShoppingCart(this.items[i].id);
          console.log('deleted');
          this.eventMessage.emitRemovedCartItem(this.items[i] as cartProduct);
        }
        this.loading=false;
        this.handleError(error, "There was an error while retrieving cart's product information!");
      }      
      
    }
  }

  groupItemsByOwner(){
    const groupedByOwner: any[][] = Object.values(
      this.items.reduce((groups: any, item: any) => {
        const owner = item.relatedParty
          ?.find((rp: any) => rp.role === 'Seller')
          ?.id;
    
        if (owner) {
          if (!groups[owner]) {
            groups[owner] = [];
          }
          groups[owner].push(item);
        }
        return groups;
      }, {})
    );
    console.log(groupedByOwner)
    this.items=groupedByOwner;    
  }

  isArray(value: any): value is any[] {
    return Array.isArray(value);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }
  
}
