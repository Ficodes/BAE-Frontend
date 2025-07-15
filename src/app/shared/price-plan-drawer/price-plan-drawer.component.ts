import {Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ChangeDetectorRef, SimpleChanges} from '@angular/core';
import {CharacteristicComponent} from "../characteristic/characteristic.component";
import {MarkdownComponent} from "ngx-markdown";
import {components} from "../../models/product-catalog";
import {CurrencyPipe, NgClass} from "@angular/common";
import {PriceServiceService} from "../../services/price-service.service";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import {EventMessageService} from "../../services/event-message.service";
import { cartProduct } from 'src/app/models/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { certifications } from 'src/app/models/certification-standards.const';
import { UsageServiceService } from 'src/app/services/usage-service.service'
import { ApiServiceService } from 'src/app/services/product-service.service'
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type ProductOfferingTerm = components["schemas"]["ProductOfferingTerm"];
type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];


@Component({
  selector: 'app-price-plan-drawer',
  standalone: true,
  imports: [
    CharacteristicComponent,
    MarkdownComponent,
    NgClass,
    CurrencyPipe,
    ReactiveFormsModule
  ],
  templateUrl: './price-plan-drawer.component.html',
  styleUrl: './price-plan-drawer.component.css'
})
export class PricePlanDrawerComponent implements OnInit, OnDestroy {
  @Input() drawerId: string = 'drawer-default'; // ID
  @Input() productOff: Product | undefined;
  @Input() prodSpec:ProductSpecification = {};
  @Input() isOpen: boolean = false; // drawer status
  @Input() width: string = 'w-80'; // manages width
  @Output() closeDrawer = new EventEmitter<void>(); // Event to notify the closing of the drawer

  form: FormGroup;

  selectedPricePlan:any = null;
  isLoading = false; // Loading prices or not
  price: any[] = []; // Object with multiple types of prices (MOCK)
  tsAndCs: ProductOfferingTerm;
  hasProfile: boolean = false;
  isCustom: boolean = false;
  isFree: boolean = false;
  images: AttachmentRefOrValue[]  = [];
  toastVisibility: boolean = false;
  orderChars:any[]=[];
  selectedPriceComponents:any[]=[];
  selectedMetric:any;
  selectedUsageSpecId: string | null = null;
  selectedUnitOfMeasure: string | null = null;
  metrics:any[]=[];
  groupedMetrics: { [usageSpecId: string]: { usagespecid: string; name: string; unitOfMeasure: string }[] } = {};

  characteristics: ProductSpecificationCharacteristic[] = []; // Características dinámicas
  filteredCharacteristics: ProductSpecificationCharacteristic[] = [];

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  constructor(
    private fb: FormBuilder,
    private priceService:
    PriceServiceService,
    private cartService: ShoppingCartServiceService,
    private eventMessage: EventMessageService,
    private cdr: ChangeDetectorRef,
    private usageService: UsageServiceService,
    private api: ApiServiceService) {
    // Crear el formulario padre
    this.form = this.fb.group({
      selectedPricePlan: [null, Validators.required], // Plan de precios seleccionado
      characteristics: this.fb.group({}), // Características seleccionadas
      tsAccepted: [false, Validators.requiredTrue] // Checkbox de aceptación de Ts&Cs
    });
  }


  ngOnInit(): void {
    // Escuchar eventos de teclado (por si necesitas otros)
    document.addEventListener('keydown', this.handleEscape.bind(this));
    // Configurar los términos y condiciones
    this.tsAndCs = this.productOff?.productOfferingTerm?.[0] || { description: '' };
    this.isFree = this.productOff?.productOfferingPrice?.length === 0;

    if (this.isFree) {
      this.form.get('selectedPricePlan')?.setValue({});
      this.characteristics = this.prodSpec.productSpecCharacteristic || [];
      this.filterCharacteristics();
    }

    if(this.tsAndCs.description == ''){
      this.form.controls['tsAccepted'].setValue(true);
      this.cdr.detectChanges();
    }
    console.log(this.tsAndCs)
    let profile = this.productOff?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
    console.log('profile...')
    console.log(profile)
    if(profile.length==0){
      this.images = this.productOff?.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
    } else {
      this.images = profile;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prodSpec'] && this.isFree) {
      this.characteristics = this.prodSpec.productSpecCharacteristic || [];
      this.filterCharacteristics();

      this.updateOrderChars();
    }
  }

  ngOnDestroy(): void {
    // Eliminar eventos de teclado al destruir el componente
    document.removeEventListener('keydown', this.handleEscape.bind(this));
  }

  // Método para cerrar el drawer
  onClose(): void {
    this.isOpen = false;
    this.closeDrawer.emit();
  }

  filterCharacteristics() {
    this.filteredCharacteristics = [];
    for(let i = 0; i < this.characteristics.length; i++){
      if (!certifications.some(certification => certification.name === this.characteristics[i].name)) {
        this.filteredCharacteristics.push(this.characteristics[i]);
      }
    }

    // Reconfigurar el grupo de características en el formulario
    const characteristicsGroup = this.fb.group({});
    this.filteredCharacteristics.forEach((characteristic) => {
      if (characteristic.id != null) {
        const defaultValue = characteristic.productSpecCharacteristicValue?.find(
          (val) => val.isDefault
        )?.value || characteristic.productSpecCharacteristicValue?.find(
          (val) => val.isDefault
        )?.valueFrom;

        characteristicsGroup.addControl(
          characteristic.id,
          this.fb.control(defaultValue || null, Validators.required)
        );
      }
    });

    this.form.setControl('characteristics', characteristicsGroup);
  }

  // Handle price plan selection
  async onPricePlanSelected(pricePlan: any) {
    this.metrics=[];
    console.log('precio')
    console.log(pricePlan)
    this.form.get('selectedPricePlan')?.setValue(pricePlan);


    // Set chars based on selected price plan
    this.isCustom = pricePlan.priceType === 'custom';
    if (pricePlan.prodSpecCharValueUse) {
      this.characteristics = pricePlan.prodSpecCharValueUse;
      this.hasProfile = true;
    } else {
      this.characteristics = this.prodSpec.productSpecCharacteristic || [];
      this.hasProfile = false;
    }

    this.filterCharacteristics();

    if(pricePlan.usagespecid && pricePlan.unitOfMeasure){
      //let usageSpec = await this.usageService.getUsageSpec(pricePlan.usagespecid)
      this.metrics.push({
        priceId: pricePlan.id,
        usagespecid: pricePlan.usagespecid,
        //name: usageSpec.name,
        unitOfMeasure: pricePlan.unitOfMeasure.units
      })
    } else if(pricePlan.bundledPopRelationship) {
      for(let i=0;i<pricePlan.bundledPopRelationship.length;i++){
        let comp = await this.api.getOfferingPrice(pricePlan.bundledPopRelationship[i].id)
        if(comp.usagespecid && comp.unitOfMeasure){
          //let usageSpec = await this.usageService.getUsageSpec(comp.usagespecid)
          this.metrics.push({
            priceId: comp.id,
            usagespecid: comp.usagespecid,
            //name: usageSpec.name,
            unitOfMeasure: comp.unitOfMeasure.units         
          })
        }
      }
  
    }

    console.log('metrics----')
    console.log(this.metrics)

    if(this.metrics.length>0){
      this.selectedMetric=this.metrics[0]
      this.selectedUnitOfMeasure=this.metrics[0].unitOfMeasure
      const grouped = this.metrics.reduce((acc, metric) => {
        const key = metric.usagespecid;
      
        if (!acc[key]) {
          acc[key] = [];
        }
      
        acc[key].push(metric);
      
        return acc;
      }, {} as Record<string, typeof this.metrics>);
      this.groupedMetrics=grouped;        
    }  

    this.selectedPricePlan = pricePlan;
    console.log(this.selectedPricePlan);
    this.calculatePrice();
  }

  onUsageSpecChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedUsageSpecId = target.value;
    this.selectedUnitOfMeasure = null;
  }
  
  onMetricChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedUnitOfMeasure = target.value;
  }

  get usageSpecIds(): string[] {
    return Object.keys(this.groupedMetrics);
  }
  

  // Handle characteristic value changes
  onValueChange(event: { characteristicId: string; selectedValue: any }): void {
    const characteristicsGroup = this.form.get('characteristics') as FormGroup;
    characteristicsGroup.get(event.characteristicId)?.setValue(event.selectedValue);
    this.calculatePrice();
  }

  // Validate if the form is ready to submit
  isFormValid(): boolean {
    return this.form.valid;
  }

  get objectKeys() {
    return Object.keys;
  }
  hasKey(obj: any, key: string): boolean {
    return key in obj;
  }
  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
  getValues(obj: any): any[] {
    return Object.values(obj);
  }

  updateOrderChars() {
    const selectedCharacteristics = this.form.get('characteristics')?.value;

    console.log('chars....')
    console.log(selectedCharacteristics)
    console.log('general chars...')
    console.log(this.filteredCharacteristics)
    console.log('keys of selected chars...')
    console.log(this.getKeys(selectedCharacteristics))

    this.orderChars = [];
    for(let i=0; i<this.getKeys(selectedCharacteristics).length;i++){
      let idx = this.filteredCharacteristics.findIndex(item => item.id === this.getKeys(selectedCharacteristics)[i]);
      console.log(this.filteredCharacteristics[idx])

      let value = this.getValues(selectedCharacteristics)[i]
      let valueType = this.filteredCharacteristics[idx].valueType

      if (!valueType && isNaN(value)) {
        valueType = 'string'
      } else if (!valueType && !isNaN(value)) {
        valueType = 'number'
      }

      this.orderChars.push({
        "name": this.filteredCharacteristics[idx].name,
        "value": value,
        "valueType": valueType,
      })
    }
  }

  // Método para calcular el precio usando el servicio
  calculatePrice(): void {
    this.updateOrderChars();

    if (this.isFree) {
      this.price = [];
      this.isLoading = false;
    }

    if (this.isCustom || this.isFree) {
      return
    }

    const selectedPricePlan = this.form.get('selectedPricePlan')?.value;
    //PROD is an OrderItem
    let prod : any = {
      "id": this.productOff?.id,
      "action": "add",
      "quantity": "1",
      "productOffering": {
        "id": this.productOff?.id,
        "href": this.productOff?.id
      },
      "itemTotalPrice": [{
        "productOfferingPrice": {
          "id": selectedPricePlan.id,
          "href": selectedPricePlan.href,
          "name": selectedPricePlan.name
        }
      }],
      "product": {
        "productCharacteristic": this.orderChars
      }
    }

    if(this.selectedMetric){
      //Añadir la métrica al orderItem
      prod.metric = {
        usagespecid: this.selectedMetric.usagespecid,
        unitOfMeasure: this.selectedMetric.unitOfMeasure
      }
    }

    let orderItems = [];
    orderItems.push(prod);

    let prodOrder = {
      "id": uuidv4(),
      "productOrderItem":orderItems
    }

    if (!selectedPricePlan) return;

    console.log('--- prod ---')
    console.log(prod)
    console.log('--- prod ---')

    this.isLoading = true;
    this.priceService.calculatePrice(prodOrder).subscribe({
      next: (response) => {
        console.log('calculate price...')
        console.log(response.orderTotalPrice)
        this.price = response.orderTotalPrice; // Updates the price
        this.price = this.price.map((item) => ({
          ...item,
          id: this.selectedPricePlan.id, //Adds price plan id to the price info
        }));
        this.isLoading = false; // Hides spinner
      },
      error: () => {
        this.isLoading = false; // Manejo de errores
        console.error('Error al calcular el precio');
      },
    });
  }

  getProductImage() {
    return this.images.length > 0 ? this.images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  async createOrder() {
    if (this.form.invalid) {
      console.error('Form is invalid');
      return;
    }

    const formValues = this.form.value;

    // Construir el payload del pedido
    const orderPayload = {
      productId: this.productOff?.id,
      pricePlan: formValues.selectedPricePlan,
      characteristics: this.orderChars,
      tsAccepted: formValues.tsAccepted,
      priceSummary: this.price,
    };

    // Construir las opciones del producto
    const prodOptions = this.buildProdOptions(formValues.tsAccepted);

    if (this.isCustom){
      prodOptions.options.pricing = [{
        id: orderPayload.pricePlan.id
      }]
    }
    try {
      // Añadir producto al carrito
      await this.cartService.addItemShoppingCart(prodOptions);
      console.log('Update successful');

      // Emitir eventos
      this.eventMessage.emitAddedCartItem(prodOptions as cartProduct);

      console.log('Order Payload:', orderPayload);
    } catch (error) {
      console.error('There was an error while updating the cart:', error);
    }

    // Cerrar el drawer
    this.onClose();
  }

  private buildProdOptions(termsAccepted: boolean) {
    return {
      id: this.productOff?.id,
      name: this.productOff?.name,
      image: this.getProductImage(),
      href: this.productOff?.href,
      options: {
        characteristics: this.orderChars,
        pricing: this.price,
      },
      termsAccepted,
    };
  }
}
