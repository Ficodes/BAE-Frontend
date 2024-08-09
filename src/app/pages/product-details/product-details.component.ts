import { Component, OnInit, ElementRef, ViewChild,ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {components} from "../../models/product-catalog";
import { initFlowbite } from 'flowbite';
import { PriceServiceService } from 'src/app/services/price-service.service';
import {faScaleBalanced, faArrowProgress, faArrowRightArrowLeft, faObjectExclude, faSwap, faGlobe, faBook, faShieldHalved, faAtom, faDownload} from "@fortawesome/pro-solid-svg-icons";
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
//type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
import { certifications } from 'src/app/models/certification-standards.const'
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginInfo, cartProduct,productSpecCharacteristicValueCart } from '../../models/interfaces';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import {EventMessageService} from "../../services/event-message.service";
import { jwtDecode } from "jwt-decode";
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {

  @ViewChild('relationshipsContent')
  relationshipsContent: ElementRef | undefined;
  @ViewChild('detailsContent')
  detailsContent: ElementRef | undefined;
  @ViewChild('charsContent')
  charsContent: ElementRef | undefined;
  @ViewChild('attachContent')
  attachContent: ElementRef | undefined;
  @ViewChild('agreementsContent')
  agreementsContent: ElementRef | undefined;
  @ViewChild('textDiv') textDiv!: ElementRef;

  id:any;
  productOff: Product | undefined;
  category: string = 'none';
  categories: any[] | undefined  = [];
  price: string = '';
  images: AttachmentRefOrValue[]  = [];
  attatchments: AttachmentRefOrValue[]  = [];
  prodSpec:ProductSpecification = {};
  complianceProf:any[] = [];
  complianceLevel:number=1;
  serviceSpecs:any[] = [];
  resourceSpecs:any[]=[];
  check_logged:boolean=false;
  cartSelection:boolean=false;
  check_prices:boolean=false;
  selected_price:any;
  check_char:boolean=false;
  check_terms:boolean=false;
  selected_terms:boolean=false;
  selected_chars:productSpecCharacteristicValueCart[]=[];
  toastVisibility: boolean = false;
  lastAddedProd:any | undefined;
  checkCustom:boolean=false;
  textDivHeight:any;
  prodChars:any[]=[];

  errorMessage:any='';
  showError:boolean=false;
  showTermsMore:boolean=false;
  PURCHASE_ENABLED: boolean = environment.PURCHASE_ENABLED;

  protected readonly faScaleBalanced = faScaleBalanced;
  protected readonly faArrowProgress = faArrowProgress;
  protected readonly faArrowRightArrowLeft = faArrowRightArrowLeft;
  protected readonly faObjectExclude = faObjectExclude;
  protected readonly faSwap = faSwap;
  protected readonly faGlobe = faGlobe;
  protected readonly faBook = faBook;
  protected readonly faShieldHalved = faShieldHalved;
  protected readonly faAtom = faAtom;
  protected readonly faDownload = faDownload;

  stepsElements:string[]=['step-chars','step-price','step-terms','step-checkout'];
  stepsText:string[]=['text-chars','text-price','text-terms','text-checkout'];
  stepsCircles:string[]=['circle-chars','circle-price','circle-terms','circle-checkout'];


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
    private location: Location
  ) {
    this.showTermsMore=false;
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'CloseCartCard') {
        this.hideCartSelection();
        //TOGGLE TOAST
        if(ev.value!=undefined){
          this.lastAddedProd=ev.value;
          this.toastVisibility=true;
  
          this.cdr.detectChanges();
          //document.getElementById("progress-bar")?.classList.toggle("hover:w-100");
          let element = document.getElementById("progress-bar")
          let parent = document.getElementById("toast-add-cart")
          if (element != null && parent != null) {
            element.style.width = '0%'
            element.offsetWidth
            element.style.width = '100%'
            setTimeout(() => {
              this.toastVisibility=false
            }, 3500);
          }
        }

        this.cdr.detectChanges();
      }
    })
  }

  @HostListener('window:scroll', ['$event']) 
  updateTabs(event:any) {
    let tabs_container = document.getElementById('tabs-container');
    let tabsOffset = 0;
    if(tabs_container){
      tabsOffset=tabs_container.offsetHeight
    }
    let details_container = document.getElementById('details-container')    
    let chars_container = document.getElementById('chars-container')
    let attach_container = document.getElementById('attach-container')
    let agreements_container = document.getElementById('agreements-container')
    let relationships_container = document.getElementById('agreements-container')

    let detailsOffset=tabsOffset
    if(details_container && (details_container.getBoundingClientRect().bottom <= window.innerHeight)){
      this.goToDetails(false)
      detailsOffset=details_container.getBoundingClientRect().bottom
    }
    let charsOffset=detailsOffset;
    if(this.charsContent!=undefined && chars_container && (chars_container.getBoundingClientRect().top >= detailsOffset && chars_container.getBoundingClientRect().bottom <= window.innerHeight)){
      this.goToChars(false)
      charsOffset=chars_container.getBoundingClientRect().bottom
    }
    let attOffsett=charsOffset;
    if(this.attachContent!=undefined && attach_container && (attach_container.getBoundingClientRect().top >= charsOffset && attach_container.getBoundingClientRect().bottom <= window.innerHeight)){
      this.goToAttach(false)
      attOffsett=attach_container.getBoundingClientRect().bottom
    }
    let agreeOffset=attOffsett;
    if(this.agreementsContent!= undefined && agreements_container && (agreements_container.getBoundingClientRect().top >= attOffsett && agreements_container.getBoundingClientRect().bottom <= window.innerHeight)){
      this.goToAgreements(false)
      agreeOffset=agreements_container.offsetHeight
    }
    if(this.relationshipsContent!= undefined && relationships_container && (relationships_container.getBoundingClientRect().top >= agreeOffset && relationships_container.getBoundingClientRect().bottom <= window.innerHeight)){
      this.goToRelationships(false)
    }
  }

  ngOnInit() {
    initFlowbite();
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      this.check_logged=true;
      this.cdr.detectChanges();
    } else {
      this.check_logged=false,
      this.cdr.detectChanges();
    }
    window.scrollTo(0, 0);
    this.id = this.route.snapshot.paramMap.get('id');
    console.log('--- Details ID:')
    console.log(this.id)    
    this.api.getProductById(this.id).then(prod => {
      console.log('prod')
      console.log(prod)
      this.api.getProductSpecification(prod.productSpecification.id).then(spec => {
        this.prodSpec=spec;
        
        let attachment = spec.attachment
        console.log(spec.attachment)
        let prodPrices: any[] | undefined= prod.productOfferingPrice;
        let prices: any[]=[];
        if(prodPrices!== undefined){
          for(let j=0; j < prodPrices.length; j++){
            this.api.getProductPrice(prodPrices[j].id).then(price => {
              prices.push(price);
              console.log(price)
              if(price.priceType == 'custom'){
                this.checkCustom=true;
              }
            })
          }
        }
        if(this.prodSpec.productSpecCharacteristic != undefined){
          this.prodSpec.productSpecCharacteristic.forEach((char: any) => {
            this.prodChars.push(char);
          });
          console.log('-- prod spec')
          console.log(this.prodSpec.productSpecCharacteristic)
          for(let i=0; i<certifications.length; i++){
            if(certifications[i].domesupported==true){
              this.complianceProf.push(certifications[i])
            } else {
              let compProf = this.prodSpec.productSpecCharacteristic.find((p => {
                return p.name === certifications[i].name
              }));
              if(compProf){
                this.complianceProf.push(certifications[i])
              }
            }
            const index = this.prodChars.findIndex(item => item.name === certifications[i].name);
            if(index!==-1){
              this.prodChars.splice(index, 1);
            }
          }
        }
        if(this.prodSpec.serviceSpecification != undefined){
          for(let j=0; j < this.prodSpec.serviceSpecification.length; j++){
            this.api.getServiceSpec(this.prodSpec.serviceSpecification[j].id).then(serv => {
              this.serviceSpecs.push(serv);
            })
          }
        }
        if(this.prodSpec.resourceSpecification != undefined){
          for(let j=0; j < this.prodSpec.resourceSpecification.length; j++){
            this.api.getResourceSpec(this.prodSpec.resourceSpecification[j].id).then(res => {
              this.resourceSpecs.push(res);
            })
          }
        }
        
        console.log('serv specs')
        console.log(this.serviceSpecs)
        this.productOff={
          id: prod.id,
          name: prod.name,
          category: prod.category,
          description: prod.description,
          lastUpdate: prod.lastUpdate,
          attachment: attachment,
          productOfferingPrice: prices,
          productSpecification: prod.productSpecification,
          productOfferingTerm: prod.productOfferingTerm,
          serviceLevelAgreement: prod.serviceLevelAgreement,
          version: prod.version
        }
        this.category = this.productOff?.category?.at(0)?.name ?? 'none';
        this.categories = this.productOff?.category;
        this.price = this.productOff?.productOfferingPrice?.at(0)?.price?.value + ' ' +
          this.productOff?.productOfferingPrice?.at(0)?.price?.unit ?? 'n/a';
        let profile = this.productOff?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
        console.log('profile...')
        console.log(profile)
        if(profile.length==0){
          this.images = this.productOff?.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
          this.attatchments = this.productOff?.attachment?.filter(item => item.attachmentType != 'Picture') ?? [];
        } else {
          this.images = profile;
          this.attatchments = this.productOff?.attachment?.filter(item => item.name != 'Profile Picture') ?? [];
        }
        let vcs = 0
        let domeSup = 0
        let tokenComp = []

        if(this.prodSpec.productSpecCharacteristic != undefined) {
          let vcProf = this.prodSpec.productSpecCharacteristic.find((p => {
            return p.name === `Compliance:VC`
          }));

          if (vcProf) {
            const vcToken: any = vcProf.productSpecCharacteristicValue?.at(0)?.value
            const decoded = jwtDecode(vcToken)

            if ('verifiableCredential' in decoded) {
              const credential: any = decoded.verifiableCredential;

              const subject = credential.credentialSubject;

              if ('compliance' in subject) {
                tokenComp = subject.compliance.map((comp: any) => {
                  return comp.standard
                })
              }
            }
          }
        }

        for(let z = 0; z < this.complianceProf.length; z++){
          if (this.complianceProf[z].domesupported) {
            domeSup += 1
          }

          if(this.prodSpec.productSpecCharacteristic != undefined) {
            // Search certificates or VCs
            let compProf = this.prodSpec.productSpecCharacteristic.find((p => {
              return p.name === this.complianceProf[z].name
            }));

            if (!compProf) {
              this.complianceProf[z].href = '#'
              this.complianceProf[z].value = 'Not provided yet'
            } else {
              this.complianceProf[z].href = compProf.productSpecCharacteristicValue?.at(0)?.value
              this.complianceProf[z].value = 'Certification included'
            }

            if (tokenComp.indexOf(this.complianceProf[z].name) > -1) {
              this.complianceProf[z].verified = true
              vcs += 1
            }
          }
        }

        // Set compliance level
        if (vcs > 0) {
          this.complianceLevel = 2
          if (vcs == domeSup) {
            this.complianceLevel = 3
          }
        }
      })
    })
  }

  isVerified(char: any) {
    return char.verified == true
  }

  ngAfterViewInit() {
    // Trigger change detection after the view has been initialized
    this.setImageHeight();
  }

  setImageHeight() {
    this.textDivHeight = this.textDiv.nativeElement.offsetHeight;
  }

  toggleCartSelection(){
    console.log('Add to cart...')
    if (this.productOff?.productOfferingPrice != undefined){
      if(this.productOff?.productOfferingPrice.length > 1){
        this.check_prices=true;
        this.selected_price=this.productOff?.productOfferingPrice[this.productOff?.productOfferingPrice.length-1]
      } else {
        this.selected_price=this.productOff?.productOfferingPrice[0]
      }

      this.cdr.detectChanges();
    }

    if(this.productOff?.productOfferingTerm != undefined){
      if(this.productOff.productOfferingTerm.length == 1 && this.productOff.productOfferingTerm[0].name == undefined){
        this.check_terms=false;
      } else {
        this.check_terms=true;
      }
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

    if (this.check_prices==false && this.check_char == false && this.check_terms == false){
      this.addProductToCart(this.productOff,false);
    } else {
      this.cartSelection=true;      
      this.cdr.detectChanges();
    }
  }

  async addProductToCart(productOff:Product| undefined,options:boolean){
    //this.localStorage.addCartItem(productOff as Product);
    if(options==true){
      console.log('termschecked:')
      console.log(this.selected_terms)
      if(productOff!= undefined && productOff?.productOfferingPrice != undefined){
        let prodOptions = {
          "id": productOff?.id,
          "name": productOff?.name,
          "image": this.getProductImage(),
          "href": productOff.href,
          "options": {
            "characteristics": this.selected_chars,
            "pricing": this.selected_price
          },
          "termsAccepted": this.selected_terms
        }
        this.lastAddedProd=prodOptions;
      await this.cartService.addItemShoppingCart(prodOptions).subscribe({
        next: data => {
            console.log(data)
            console.log('Update successful');
            //TOGGLE TOAST
            this.toastVisibility=true;

            this.cdr.detectChanges();
            //document.getElementById("progress-bar")?.classList.toggle("hover:w-100");
            let element = document.getElementById("progress-bar")
            let parent = document.getElementById("toast-add-cart")
            if (element != null && parent != null) {
              element.style.width = '0%'
              element.offsetWidth
              element.style.width = '100%'
              setTimeout(() => {
                this.toastVisibility=false
              }, 3500);
            }
        },
        error: error => {
            console.error('There was an error while updating!', error);
            if(error.error.error){
              console.log(error)
              this.errorMessage='Error: '+error.error.error;
            } else {
              this.errorMessage='There was an error while adding item to the cart!';
            }
            this.showError=true;
            setTimeout(() => {
              this.showError = false;
            }, 3000);
        }
      });
    }
    } else {
      if(productOff!= undefined && productOff?.productOfferingPrice != undefined){
        let prodOptions = {
          "id": productOff?.id,
          "name": productOff?.name,
          "image": this.getProductImage(),
          "href": productOff.href,
          "options": {
            "characteristics": this.selected_chars,
            "pricing": this.selected_price
          },
          "termsAccepted": true
        }
        this.lastAddedProd=prodOptions;
      await this.cartService.addItemShoppingCart(prodOptions).subscribe({
        next: data => {
            console.log(data)
            console.log('Update successful');
            //TOGGLE TOAST
            this.toastVisibility=true;

            this.cdr.detectChanges();
            //document.getElementById("progress-bar")?.classList.toggle("hover:w-100");
            let element = document.getElementById("progress-bar")
            let parent = document.getElementById("toast-add-cart")
            if (element != null && parent != null) {
              element.style.width = '0%'
              element.offsetWidth
              element.style.width = '100%'
              setTimeout(() => {
                this.toastVisibility=false
              }, 3500);
            }
        },
        error: error => {
            console.error('There was an error while updating!', error);
            this.errorMessage='There was an error while adding item to the cart!';
            this.showError=true;
            setTimeout(() => {
              this.showError = false;
            }, 3000);
        }
      });
    }
    }
    if(productOff!== undefined){
      this.eventMessage.emitAddedCartItem(productOff as cartProduct);
    }

    if(this.cartSelection==true){
      this.cartSelection=false;
      this.check_char=false;
      this.check_terms=false;
      this.check_prices=false;
      this.selected_chars=[];
      this.selected_price={};
      this.selected_terms=false;
      this.cdr.detectChanges();
    }
    this.cdr.detectChanges();
  }

  deleteProduct(product: Product | undefined){
    if(product !== undefined) {
      //this.localStorage.removeCartItem(product);
      this.cartService.removeItemShoppingCart(product.id).subscribe(() => console.log('removed'));
      this.eventMessage.emitRemovedCartItem(product as Product);
    }
    this.toastVisibility=false;
  }  

  hideCartSelection(){
    this.cartSelection=false;
    this.check_char=false;
    this.check_terms=false;
    this.check_prices=false;
    this.selected_chars=[];
    this.selected_price={};
    this.selected_terms=false;
    this.cdr.detectChanges();
  }

  goTo(path:string) {
    this.router.navigate([path]);
  }

  back(){
    this.location.back();
  }

  getProductImage() {
    return this.images.length > 0 ? this.images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  goToDetails(scroll:boolean){
    //const targetElement = this.elementRef.nativeElement.querySelector('#detailsContent');
    if (this.detailsContent!=undefined && scroll) {
      this.detailsContent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let details_button = document.getElementById('details-button')
    let chars_button = document.getElementById('chars-button')
    let attach_button = document.getElementById('attach-button')
    let agreements_button = document.getElementById('agreements-button')
    let relationships_button = document.getElementById('relationships-button')

    this.selectTag(details_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(chars_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(attach_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(agreements_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(relationships_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
  }

  goToChars(scroll:boolean){
    if (this.charsContent != undefined && scroll) {
      this.charsContent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let details_button = document.getElementById('details-button')
    let chars_button = document.getElementById('chars-button')
    let attach_button = document.getElementById('attach-button')
    let agreements_button = document.getElementById('agreements-button')
    let relationships_button = document.getElementById('relationships-button')

    this.unselectTag(details_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.selectTag(chars_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(attach_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(agreements_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(relationships_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
  }

  goToAttach(scroll:boolean){
    if (this.attachContent != undefined && scroll) {
      this.attachContent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let details_button = document.getElementById('details-button')
    let chars_button = document.getElementById('chars-button')
    let attach_button = document.getElementById('attach-button')
    let agreements_button = document.getElementById('agreements-button')
    let relationships_button = document.getElementById('relationships-button')

    this.unselectTag(details_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(chars_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.selectTag(attach_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(agreements_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(relationships_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
  }

  goToAgreements(scroll:boolean){
    if (this.agreementsContent != undefined && scroll) {
      this.agreementsContent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center'});
    }

    let details_button = document.getElementById('details-button')
    let chars_button = document.getElementById('chars-button')
    let attach_button = document.getElementById('attach-button')
    let agreements_button = document.getElementById('agreements-button')
    let relationships_button = document.getElementById('relationships-button')

    this.unselectTag(details_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(chars_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(attach_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.selectTag(agreements_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(relationships_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
  }

  goToRelationships(scroll:boolean){
    if (this.relationshipsContent != undefined && scroll) {
      this.relationshipsContent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let details_button = document.getElementById('details-button')
    let chars_button = document.getElementById('chars-button')
    let attach_button = document.getElementById('attach-button')
    let agreements_button = document.getElementById('agreements-button')
    let relationships_button = document.getElementById('relationships-button')

    this.unselectTag(details_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(chars_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(attach_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.unselectTag(agreements_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
    this.selectTag(relationships_button,'text-primary-100 dark:text-primary-50 dark:border-primary-50 border-b-2 border-primary-100');
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

  toggleTermsReadMore(){
    if(this.showTermsMore==false){
      document?.getElementById('terms-markdown')?.classList.remove('line-clamp-5')
    } else {
      document?.getElementById('terms-markdown')?.classList.add('line-clamp-5')
    }
    this.showTermsMore=!this.showTermsMore;
    
  }

  goToLink(url: any){
    window.open(url, "_blank");
  }

}
