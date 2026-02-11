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
import { FormsModule } from '@angular/forms';
import { lastValueFrom, Subscription } from 'rxjs';


@Component({
  selector: 'app-price-plan-drawer',
  standalone: true,
  imports: [
    CharacteristicComponent,
    MarkdownComponent,
    NgClass,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule
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
  @Input() mode: 'cart' | 'modify' = 'cart';
  @Input() inventoryProductId: string | null = null;
  @Input() existingCharacteristics: any[] = [];
  @Output() closeDrawer = new EventEmitter<void>(); // Event to notify the closing of the drawer
  @Output() modifySubmit = new EventEmitter<any>();

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
  groupedMetrics: { [usageSpecId: string]: { usageSpecId: string; name: string; unitOfMeasure: string }[] } = {};

  characteristics: ProductSpecificationCharacteristic[] = []; // Características dinámicas
  filteredCharacteristics: ProductSpecificationCharacteristic[] = [];
  disabledCharacteristics: any[] = [];
  canBeDisabledChars: any[]=[];

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  }
  

  constructor(
    private fb: FormBuilder,
    private priceService: PriceServiceService,
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
    this.tsAndCs = { description: '' };
    console.log('---- producto')
    console.log(this.productOff)

    this.productOff?.productOfferingTerm?.forEach((term) => {
      console.log(term.name)
      console.log('----')
      if (term.name != 'procurement') {
        console.log('---- Setting the term')
        this.tsAndCs = term;
      }
    });

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
    if (changes['isOpen']?.currentValue === true) {
      this.tsAndCs = { description: '' };

      /*this.productOff?.productOfferingTerm?.forEach((term) => {
        if (term.name != 'procurement') {
          console.log('---- Setting the term')
          this.tsAndCs = term;
        }
      });*/
      const licenseTerm = this.productOff?.productOfferingTerm?.find(
        element => element.name === 'License'
      );
      if(licenseTerm){
        this.tsAndCs={ description: licenseTerm.description };
      }
      if(this.tsAndCs.description == ''){
        this.form.controls['tsAccepted'].setValue(true);
        this.cdr.detectChanges();
      } else {
        this.form.controls['tsAccepted'].setValue(false);
        this.cdr.detectChanges();
      }
      console.log(this.tsAndCs)
    }
    if (changes['productOff'] && changes['productOff'].currentValue) {
      console.log('Changes...')
      console.log(this.productOff)
  
      this.isFree = this.productOff?.productOfferingPrice?.length === 0;
  
      if (this.isFree) {
        this.form.get('selectedPricePlan')?.setValue({});
        this.characteristics = this.prodSpec.productSpecCharacteristic || [];
        this.filterCharacteristics();
      }

      let profile = this.productOff?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
      if(profile.length==0){
        this.images = this.productOff?.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
      } else {
        this.images = profile;
      }
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

  disableChars(){
    
  }

  filterCharacteristics() {
    this.filteredCharacteristics = [];
  
    // Set disabled prefixes
    const disabledPrefixes = this.characteristics
      .filter(c => c.name?.endsWith(' - enabled'))
      .filter(c => {
        const val = c.productSpecCharacteristicValue?.[0]?.value;
        const valueStr = String(val).toLowerCase();
        return valueStr === 'false';
      })
      .map(c => c.name?.replace(/ - enabled$/, '').trim());
  
    // Filter out certifications, self-att, and disabled prefixes
    this.filteredCharacteristics = this.characteristics.filter(char => {
      const isCertification = certifications.some(cert => cert.name === char.name);
      //const isSelfAtt = char.name === 'Compliance:SelfAtt';
      const isCompliance = char?.name?.startsWith('Compliance:')
      /*const isDisabledByPrefix = disabledPrefixes.some(prefix =>
        char.name === prefix || char.name === `${prefix} - enabled`
      );*/
  
      return !isCertification && !isCompliance;
    });
  
    const characteristicsGroup = this.fb.group({});
    this.filteredCharacteristics.forEach(characteristic => {
      if (characteristic.id != null) {
        const defaultValue =
          characteristic.productSpecCharacteristicValue?.find(val => val.isDefault)?.value ??
          characteristic.productSpecCharacteristicValue?.find(val => val.isDefault)?.valueFrom;

        characteristicsGroup.addControl(
          characteristic.id,
          this.fb.control(defaultValue ?? null, Validators.required)
        );
        if(!characteristic.name?.endsWith('- enabled') && this.filteredCharacteristics.some((char => char.name === characteristic.name+' - enabled'))){
          this.canBeDisabledChars.push(characteristic.id)

          const enabledChar = this.filteredCharacteristics.find(char => char.name === characteristic.name+' - enabled');
          const defaultEnabledValue = enabledChar?.productSpecCharacteristicValue?.find(val => val.isDefault);

          if (!defaultEnabledValue) {
            this.disabledCharacteristics.push(characteristic.id);
          } else {
            const valueStr = String(defaultEnabledValue.value).toLowerCase();
            if (valueStr === 'false') {
              this.disabledCharacteristics.push(characteristic.id);
            }
          }
          // If the default value is true, start enabled
        }
      }
    });
  
    this.form.setControl('characteristics', characteristicsGroup);
  }

  onToggleChange(event: Event, charName: any): void {
    const inputElement = event.target as HTMLInputElement;
    const isChecked = inputElement.checked;
    let char = this.filteredCharacteristics.find(char => char.name == charName+' - enabled')
    const characteristicsGroup = this.form.get('characteristics') as FormGroup;
    if(char && char.id)
    characteristicsGroup.get(char.id)?.setValue(isChecked)

    const cleanName = char?.name?.replace(/- enabled$/, '').trim();
    const disabledChar = this.filteredCharacteristics.find(
      item => item.name === cleanName
    );
    //const isSelected = event.selectedValue === true || event.selectedValue === 'true';
    if (disabledChar) {
      if (!isChecked) {
        // Add it if it's not already in the array
        if (!this.disabledCharacteristics.includes(disabledChar.id)) {
          this.disabledCharacteristics.push(disabledChar.id);
        }
      } else {
        // Remove it if it exists
        this.disabledCharacteristics = this.disabledCharacteristics.filter(
          id => id !== disabledChar.id
        );
      }
    }
    this.calculatePrice();
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

    if(pricePlan.bundledPopRelationship){
      for(let i=0;i<pricePlan.bundledPopRelationship.length;i++){
        let comp = await this.api.getOfferingPrice(pricePlan.bundledPopRelationship[i].id)
        if(comp.usageSpecId && comp.unitOfMeasure){
          //let usageSpec = await this.usageService.getUsageSpec(comp.usageSpecId)
          this.metrics.push({
            priceId: comp.id,
            usageSpecId: comp.usageSpecId,
            //name: usageSpec.name,
            unitOfMeasure: comp.unitOfMeasure.units,
            value: 0  
          })
        }
      }
    }  

    console.log('metrics----')
    console.log(this.metrics)

    /*if(this.metrics.length>0){
      this.selectedMetric=this.metrics[0]
      this.selectedUnitOfMeasure=this.metrics[0].unitOfMeasure
      const grouped = this.metrics.reduce((acc, metric) => {
        const key = metric.usageSpecId;
      
        if (!acc[key]) {
          acc[key] = [];
        }
      
        acc[key].push(metric);
      
        return acc;
      }, {} as Record<string, typeof this.metrics>);
      this.groupedMetrics=grouped;        
    }  */

    this.selectedPricePlan = pricePlan;
    console.log(this.selectedPricePlan);
    this.calculatePrice();
  }

  onUsageSpecChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedUsageSpecId = target.value;
    this.selectedUnitOfMeasure = null;
  }
  
  onMetricChange(event: Event, metric: any) {
    const input = event.target as HTMLInputElement;
    metric.value = input.valueAsNumber; // update the metric's value with the new input
    console.log('Metric changed:', metric.unitOfMeasure, 'Value:', metric.value);
    console.log(this.metrics)
    this.calculatePrice();
  }

  get usageSpecIds(): string[] {
    return Object.keys(this.groupedMetrics);
  }
  

  // Handle characteristic value changes
  onValueChange(event: { characteristicId: string; selectedValue: any }): void {
    const characteristicsGroup = this.form.get('characteristics') as FormGroup;
    characteristicsGroup.get(event.characteristicId)?.setValue(event.selectedValue);

    /*let char = this.filteredCharacteristics.find(item => item.id === event.characteristicId);
    if (char?.name?.endsWith('- enabled')) {
      const cleanName = char.name.replace(/- enabled$/, '').trim();
      const disabledChar = this.filteredCharacteristics.find(
        item => item.name === cleanName
      );
      const isSelected = event.selectedValue === true || event.selectedValue === 'true';
      if (disabledChar) {
        if (!isSelected) {
          // Add it if it's not already in the array
          if (!this.disabledCharacteristics.includes(disabledChar.id)) {
            this.disabledCharacteristics.push(disabledChar.id);
          }
        } else {
          // Remove it if it exists
          this.disabledCharacteristics = this.disabledCharacteristics.filter(
            id => id !== disabledChar.id
          );
          console.log(this.disabledCharacteristics)
        }
      }
    }    
    console.log(char)*/
    this.calculatePrice();
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
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
      if(!this.disabledCharacteristics.includes(this.filteredCharacteristics[idx].id)){
        let value = this.getValues(selectedCharacteristics)[i]
        let valueType = this.filteredCharacteristics[idx].valueType
  
        if (!valueType && isNaN(value)) {
          valueType = 'string'
        } else if(!valueType && (value == false || value == true)) {
          valueType = 'boolean'
        } else if (!valueType && !isNaN(value)) {
          valueType = 'number'
        }
  
        if(value==null && valueType=='number'){
          value=0
        }

        if(!this.filteredCharacteristics[idx].name?.endsWith('- enabled')){
          this.orderChars.push({
            "name": this.filteredCharacteristics[idx].name,
            "value": value,
            "valueType": valueType,
          })
        } 

      }
    }
    console.log('Calculating the price with...')
    console.log(this.orderChars)
  }

  // Método para calcular el precio usando el servicio
  async calculatePrice(checkout: Boolean = false): Promise<void> {
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
      "action": this.mode === 'modify' ? "modify" : "add",
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

    if (this.mode === 'modify' && this.inventoryProductId) {
      prod.product.id = this.inventoryProductId;
    }

    let usage: any = [];
    if(this.metrics.length > 0){
      usage = this.metrics.map(metric => ({
        usageSpecification: {
          id: metric.usageSpecId
        },
        usageCharacteristic: [{
          name: metric.unitOfMeasure,
          value: checkout? 1 : metric.value
        }]
      }));
    }

    let orderItems = [];
    orderItems.push(prod);

    let prodOrder = {
      "id": uuidv4(),
      "productOrderItem": orderItems
    }

    const previewReq = {
      productOrder: prodOrder,
      usage: usage
    }
    if (!selectedPricePlan) return;

    console.log('--- prod ---')
    console.log(prod)
    console.log('--- prod ---')

    this.isLoading = true;

    try {
      const response = await lastValueFrom(this.priceService.calculatePrice(previewReq));
      console.log('calculate price...')
      console.log(response.orderTotalPrice)
      this.price = response.orderTotalPrice; // Updates the price
      this.price = this.price.map((item) => ({
        ...item,
        id: this.selectedPricePlan.id, //Adds price plan id to the price info
      }));
      this.isLoading = false; // Hides spinner
      return
    } catch (error) {
      this.isLoading = false; // Manejo de errores
      console.error('Error al calcular el precio');
      return
    }
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

    try {
      await this.calculatePrice(true);
    } catch (error) {
      console.error('Error calculating price:', error);
      return;
    }

    if (this.mode === 'modify') {
      const selectedPricePlan = formValues.selectedPricePlan;
      const orderItem: any = {
        id: this.productOff?.id,
        action: 'modify',
        quantity: '1',
        productOffering: {
          id: this.productOff?.id,
          href: this.productOff?.id
        },
        itemTotalPrice: [{
          productOfferingPrice: {
            id: selectedPricePlan.id,
            href: selectedPricePlan.href,
            name: selectedPricePlan.name
          }
        }],
        product: {
          id: this.inventoryProductId,
          productCharacteristic: this.orderChars
        }
      };
      this.modifySubmit.emit(orderItem);
      this.onClose();
      return;
    }

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
