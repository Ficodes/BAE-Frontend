import {Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {GeneralInfoComponent} from "./general-info/general-info.component";
import {TranslateModule} from "@ngx-translate/core";
import {ProdSpecComponent} from "./prod-spec/prod-spec.component";
import {NgClass, NgIf} from "@angular/common";
import {ApiServiceService} from "../../../services/product-service.service";
import {CategoryComponent} from "./category/category.component";
import {LicenseComponent} from "./license/license.component";
import {PricePlansComponent} from "./price-plans/price-plans.component";
import {CatalogueComponent} from "./catalogue/catalogue.component";
import {ProcurementModeComponent} from "./procurement-mode/procurement-mode.component"
import {ReplicationVisibilityComponent} from "./replication-visibility/replication-visibility.component"
 
@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [
    GeneralInfoComponent,
    TranslateModule,
    ProdSpecComponent,
    NgIf,
    ReactiveFormsModule,
    CategoryComponent,
    LicenseComponent,
    PricePlansComponent,
    CatalogueComponent,
    ProcurementModeComponent,
    ReplicationVisibilityComponent,
    NgClass
  ],
  templateUrl: './offer.component.html',
  styleUrl: './offer.component.css'
})
export class OfferComponent implements OnInit{

  @Input() formType: 'create' | 'update' = 'create';
  @Input() offer: any = {};
  @Input() partyId: any;

  productOfferForm: FormGroup;
  currentStep = 0;
  steps = [
    'General Info',
    'Product Specification',
    'Catalogue',
    'Category',
    'License',
    'Price Plans',
    'Procurement Mode',
    'Replication & Visibility',
    'Summary'
  ];
  isFormValid = false;
  selectedProdSpec: any;

  constructor(private api: ApiServiceService,
              private fb: FormBuilder) {
    this.productOfferForm = this.fb.group({
      generalInfo: this.fb.group({}),
      prodSpec: new FormControl(null),
      catalogue: new FormControl(null),
      category: new FormControl([]),
      license: this.fb.group({}),
      pricePlans: this.fb.group([]),
      procurementMode: this.fb.group({}),
      replicationMode: this.fb.group({})
    });

    // Suscribirse a cambios en la validación
    this.productOfferForm.statusChanges.subscribe(status => {
      this.isFormValid = status === 'VALID';
    });
  }

  goToStep(index: number) {
    this.currentStep = index;
  }

  submitForm() {
    console.log(this.productOfferForm.value);
  }

  async ngOnInit() {
    if (this.formType === 'update' && this.offer) {
      await this.loadOfferData();
      this.steps = [
        'General Info',
        'Product Specification',
        //'Catalogue',
        'Category',
        'License',
        'Price Plans',
        'Procurement Mode',
        'Replication & Visibility',
        'Summary'
      ];
    }

  }
  async loadOfferData() {
    if (this.offer.productSpecification) {
      await this.api.getProductSpecification(this.offer.productSpecification.id).then(async data => {
        this.selectedProdSpec = data;
      })
    }
    this.productOfferForm.patchValue({
      prodSpec: this.selectedProdSpec || null // Cargar si existe, o dejar en null
    });
  }
  
}
