import { Component, Input, OnInit, ElementRef, ViewChild,ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {components} from "../../models/product-catalog";
import { PriceServiceService } from 'src/app/services/price-service.service';
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginInfo, cartProduct,productSpecCharacteristicValueCart } from '../../models/interfaces';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import {EventMessageService} from "../../services/event-message.service";

@Component({
  selector: 'cart-card',
  templateUrl: './cart-card.component.html',
  styleUrl: './cart-card.component.css'
})
export class CartCardComponent implements OnInit {
  @Input() productOff: any;
  @Input() prodSpec: any;
  @Input() images: AttachmentRefOrValue[]  = [];
  @Input() cartSelection: boolean  = true;

  check_prices:boolean=false;
  selected_price:any;
  check_char:boolean=false;
  check_terms:boolean=false;
  selected_terms:boolean=false;
  selected_chars:productSpecCharacteristicValueCart[]=[];
  formattedPrices:any[]=[];
  lastAddedProd:cartProduct | undefined;

  errorMessage:any='';
  showError:boolean=false;

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private api: ApiServiceService,
    private priceService: PriceServiceService,
    private router: Router,
    private elementRef: ElementRef,
    private localStorage: LocalStorageService,
    private cartService: ShoppingCartServiceService,
    private eventMessage: EventMessageService,
  ) {
  }

  @HostListener('document:click')
  onClick() {
    this.hideCartSelection();
  }

  ngOnInit() {
    this.toggleCartSelection();
  }

  toggleCartSelection(){
    console.log('Add to cart...')
    console.log(this.productOff)
    if (this.productOff?.productOfferingPrice != undefined){
      if(this.productOff?.productOfferingPrice.length > 1){
        this.check_prices=true;
        this.selected_price=this.productOff?.productOfferingPrice[this.productOff?.productOfferingPrice.length-1]
      } else if(this.productOff?.productOfferingPrice.length == 1){
        this.check_prices=true;
        this.selected_price=this.productOff?.productOfferingPrice[0]
      }

      this.cdr.detectChanges();
    }

    if(this.productOff?.productOfferingTerm != undefined){
      console.log('terms')
      console.log(this.productOff?.productOfferingTerm)
      this.check_terms=true;
      this.cdr.detectChanges();
      /*if(this.productOff.productOfferingTerm.length == 1 && this.productOff.productOfferingTerm[0].name == undefined){
        this.check_terms=false;
      } else {
        this.check_terms=true;
      }*/
    }

    if(this.prodSpec.productSpecCharacteristic != undefined){
      for(let i=0; i<this.prodSpec.productSpecCharacteristic.length; i++){
        let charvalue = this.prodSpec.productSpecCharacteristic[i].productSpecCharacteristicValue;
        if(charvalue != undefined){
          if(charvalue?.length>1){
            this.check_char = true;
          }
          for(let j=0; j<charvalue.length;j++){
            if(charvalue[j]?.isDefault == true){
              this.selected_chars.push(
                {
                "characteristic": this.prodSpec.productSpecCharacteristic[i],
                "value": charvalue[j]
              });
            }
          }
        }
      }
      console.log(this.selected_chars)
    }
  }

  async addProductToCart(productOff: Product | undefined, options: boolean) {
    if (!productOff || !productOff.productOfferingPrice) return;

    try {
      // Crear objeto prodOptions
      const prodOptions = this.createProdOptions(productOff, options);
      this.lastAddedProd = prodOptions;

      // Añadir el producto al carrito
      await this.cartService.addItemShoppingCart(prodOptions);
      console.log('Update successful');

      // Emitir eventos
      this.eventMessage.emitAddedCartItem(productOff as cartProduct);
      this.eventMessage.emitCloseCartCard(productOff as cartProduct);

      // Resetear las selecciones
      this.resetSelections();
    } catch (error) {
      this.handleError(error, 'There was an error while adding item to the cart!');
    }

    this.cdr.detectChanges();
  }

  private createProdOptions(productOff: Product, options: boolean) {
    return {
      id: productOff.id,
      name: productOff.name,
      image: this.getProductImage(),
      href: productOff.href,
      options: {
        characteristics: this.selected_chars,
        pricing: this.selected_price,
      },
      termsAccepted: options ? this.selected_terms : true,
    };
  }

  private handleError(error: any, defaultMessage: string) {
    console.error(defaultMessage, error);
    this.errorMessage = error?.error?.error ? `Error: ${error.error.error}` : defaultMessage;
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  private resetSelections() {
    this.check_char = false;
    this.check_terms = false;
    this.check_prices = false;
    this.selected_chars = [];
    this.selected_price = {};
    this.selected_terms = false;
    this.cdr.detectChanges();
  }


  hideCartSelection(){
    this.eventMessage.emitCloseCartCard(undefined);
    this.cartSelection=false;
    this.check_char=false;
    this.check_terms=false;
    this.check_prices=false;
    this.formattedPrices=[];
    this.selected_chars=[];
    this.selected_price={};
    this.selected_terms=false;
    this.cdr.detectChanges();
  }

  getProductImage() {
    return this.images.length > 0 ? this.images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  onPriceChange(price:any){
    this.selected_price=price;
    console.log('change price')
    console.log(this.selected_price)
    this.cdr.detectChanges;
  }

  onCharChange(idx:number,validx:number,char:any){
    let defaultChar = { "isDefault": true, "value": char.value}
    this.selected_chars[idx].value=defaultChar;
    let prodcharval = this.selected_chars[idx]['characteristic'].productSpecCharacteristicValue
    if( prodcharval != undefined){
      for(let i=0; i<prodcharval.length; i++){
        if(i==validx){
          prodcharval[i].isDefault=true;
        } else {
          prodcharval[i].isDefault=false;
        }
      }
    }

    console.log('change char')
    console.log(this.selected_chars)
    this.cdr.detectChanges();
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  unselectTag(elem:HTMLElement | null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        this.removeClass(elem,cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectTag(elem:HTMLElement| null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        console.log('already selected')
      } else {
        this.addClass(elem,cls)
      }
    }
  }

  //STEPS CSS EFFECTS:
  selectStep(step:string,stepCircle:string, stepText:string){

    this.unselectTag(document.getElementById(step),'text-gray-400 after:border-gray-400');
    this.selectTag(document.getElementById(step),'text-white after:border-primary-100');

    this.unselectTag(document.getElementById(stepCircle),'bg-white dark:bg-secondary-100 border-2 border-gray-400');
    this.selectTag(document.getElementById(stepCircle),'bg-primary-100');

    this.unselectTag(document.getElementById(stepText),'text-gray-400');
    this.selectTag(document.getElementById(stepText),'text-primary-100');
  }

  unselectStep(step:string,stepCircle:string, stepText:string){

    this.selectTag(document.getElementById(step),'text-gray-400 after:border-gray-400');
    this.unselectTag(document.getElementById(step),'text-white after:border-primary-100');

    this.selectTag(document.getElementById(stepCircle),'bg-white dark:bg-secondary-100 border-2 border-gray-400');
    this.unselectTag(document.getElementById(stepCircle),'bg-primary-100');

    this.selectTag(document.getElementById(stepText),'text-gray-400');
    this.unselectTag(document.getElementById(stepText),'text-primary-100');
  }

  clickShowPrice(back:boolean){
    this.selectStep('step-price','circle-price','text-price')
    let price_elem = document.getElementById('price')
    let char_elem = document.getElementById('char')
    let terms_elem = document.getElementById('terms')

    this.unselectTag(price_elem,'hidden')
    this.selectTag(char_elem,'hidden')
    this.selectTag(terms_elem,'hidden')
    if(back){
      this.selectStep('step-char','circle-char','text-char')
      this.unselectStep('step-terms','circle-terms','text-terms');
    }
  }

  clickShowChar(back:boolean){
    this.selectStep('step-char','circle-char','text-char')
    let price_elem = document.getElementById('price')
    let char_elem = document.getElementById('char')
    let terms_elem = document.getElementById('terms')

    this.unselectTag(char_elem,'hidden')
    this.selectTag(price_elem,'hidden')
    this.selectTag(terms_elem,'hidden')
    if(back){
      this.unselectStep('step-price','circle-price','text-price');
      this.unselectStep('step-terms','circle-terms','text-terms');
    }
  }

  clickShowTerms(back:boolean){
    this.selectStep('step-terms','circle-terms','text-terms')
    let price_elem = document.getElementById('price')
    let char_elem = document.getElementById('char')
    let terms_elem = document.getElementById('terms')

    this.unselectTag(terms_elem,'hidden')
    this.selectTag(price_elem,'hidden')
    this.selectTag(char_elem,'hidden')
    if(back){
      this.selectStep('step-price','circle-price','text-price');
      this.selectStep('step-char','circle-char','text-char');
    }

  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
