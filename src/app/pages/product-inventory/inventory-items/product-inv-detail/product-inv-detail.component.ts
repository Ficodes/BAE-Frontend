import { Component, OnInit, ElementRef, ViewChild,ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {components} from "src/app/models/product-catalog";
import { initFlowbite } from 'flowbite';
import { PriceServiceService } from 'src/app/services/price-service.service';
import {faScaleBalanced, faArrowProgress, faArrowRightArrowLeft, faObjectExclude, faSwap, faGlobe, faBook, faShieldHalved, faAtom, faDownload} from "@fortawesome/pro-solid-svg-icons";
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
//type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
import { certifications } from 'src/app/models/certification-standards.const'
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginInfo, cartProduct,productSpecCharacteristicValueCart } from 'src/app/models/interfaces';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service'
import {EventMessageService} from "src/app/services/event-message.service";
import { jwtDecode } from "jwt-decode";
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';

@Component({
  selector: 'app-product-inv-detail',
  templateUrl: './product-inv-detail.component.html',
  styleUrl: './product-inv-detail.component.css'
})
export class ProductInvDetailComponent implements OnInit {

  id:any;
  productOff: Product | undefined;
  check_logged:boolean=false;
  images: AttachmentRefOrValue[]  = [];
  attatchments: AttachmentRefOrValue[]  = [];
  serviceSpecs:any[] = [];
  resourceSpecs:any[]=[];
  prod:any = {};
  prodSpec:ProductSpecification = {};
  checkCustom:boolean=false;
  pricePlan: any;

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

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private api: ApiServiceService,
    private priceService: PriceServiceService,
    private router: Router,
    private elementRef: ElementRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private inventoryServ: ProductInventoryServiceService,
    private location: Location
  ) {
  }

  async ngOnInit() {
    initFlowbite();
    this.handleLoginState();

    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) return;

    try {
      this.prod = await this.inventoryServ.getProduct(this.id);
      this.checkCustom = this.prod?.productPrice?.some((price: any) => price.priceType === 'custom') ?? false;

      const offering = await this.api.getProductById(this.prod.productOffering.id);
      this.prodSpec = await this.api.getProductSpecification(offering.productSpecification.id);

      if (this.prod.productPrice.length > 0) {
        this.pricePlan = await this.loadPricePlan(this.prod.productPrice[0].productOfferingPrice.id);
      }

      this.productOff = {
        id: offering.id,
        name: offering.name,
        category: offering.category,
        description: offering.description,
        lastUpdate: offering.lastUpdate,
        attachment: this.prodSpec?.attachment ?? [],
        productOfferingPrice: this.prod.productPrice,
        productSpecification: offering.productSpecification,
        productOfferingTerm: offering.productOfferingTerm,
        serviceLevelAgreement: offering.serviceLevelAgreement,
        version: offering.version
      };

      console.log(this.productOff)

      this.organizeAttachments();
      this.completeCharacteristics();

      // Fetch service & resource specs concurrently
      await this.fetchSpecifications();

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  }

  private completeCharacteristics() {
    this.prod.productCharacteristic = this.prod?.productCharacteristic?.map((spec: any) => {
      this.prodSpec?.productSpecCharacteristic?.forEach((char: any) => {
        if (spec.name === char.name && char.productSpecCharacteristicValue &&
            char.productSpecCharacteristicValue.length > 0 && char.productSpecCharacteristicValue[0].unitOfMeasure) {
          spec.unitOfMeasure = char.productSpecCharacteristicValue[0].unitOfMeasure;
        }
      });
      return spec;
    })
  }

  private handleLoginState() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    const isValidSession = aux && Object.keys(aux).length > 0 && (aux.expire - moment().unix() - 4) > 0;

    this.check_logged = isValidSession;
    this.cdr.detectChanges();
  }

  private organizeAttachments() {
    const profile = this.productOff?.attachment?.filter((item: any) => item.name === 'Profile Picture') ?? [];

    if (profile.length === 0) {
      this.images = this.productOff?.attachment?.filter((item: any) => item.attachmentType === 'Picture') ?? [];
      this.attatchments = this.productOff?.attachment?.filter((item: any) => item.attachmentType !== 'Picture') ?? [];
    } else {
      this.images = profile;
      this.attatchments = this.productOff?.attachment?.filter((item: any) => item.name !== 'Profile Picture') ?? [];
    }
  }

  private async fetchSpecifications() {
    const serviceSpecRequests = this.prodSpec?.serviceSpecification?.map((spec: any) =>
      this.api.getServiceSpec(spec.id)
    ) ?? [];
    const resourceSpecRequests = this.prodSpec?.resourceSpecification?.map((spec: any) =>
      this.api.getResourceSpec(spec.id)
    ) ?? [];

    const [serviceSpecs, resourceSpecs] = await Promise.all([
      Promise.all(serviceSpecRequests),
      Promise.all(resourceSpecRequests)
    ]);

    this.serviceSpecs = serviceSpecs;
    this.resourceSpecs = resourceSpecs;
  }

  private async loadPricePlan(priceId: string) {
    const pricePlan = await this.api.getOfferingPrice(priceId);
    return pricePlan;
  }

  back(){
    this.location.back();
  }

  getProductImage() {
    return this.images.length > 0 ? this.images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
