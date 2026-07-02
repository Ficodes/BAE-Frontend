import { DecimalPipe, LowerCasePipe, NgClass } from "@angular/common";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import * as moment from 'moment';
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { components } from "src/app/models/product-catalog";
import { EventMessageService } from "src/app/services/event-message.service";
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { FormChangeState, LoginInfo, PricePlanChangeState } from "../../../models/interfaces";
import { LocalStorageService } from "../../../services/local-storage.service";
import { AccountServiceService } from "../../../services/account-service.service";
import { ApiServiceService } from "../../../services/product-service.service";
import { ProductSpecServiceService } from "../../../services/product-spec-service.service";
import { UsageServiceService } from "../../../services/usage-service.service";
import { CatalogueComponent } from "./catalogue/catalogue.component";
import { GeneralInfoComponent } from "./general-info/general-info.component";
import { LicenseComponent } from "./license/license.component";
import { OfferSummaryComponent } from "./offer-summary/offer-summary.component";
import { PricePlansComponent } from "./price-plans/price-plans.component";
import { ProcurementModeComponent } from "./procurement-mode/procurement-mode.component";
import { ProdSpecComponent } from "./prod-spec/prod-spec.component";
import { ReplicationVisibilityComponent } from "./replication-visibility/replication-visibility.component";

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]

@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [
    GeneralInfoComponent,
    TranslateModule,
    ProdSpecComponent,
    ReactiveFormsModule,
    LicenseComponent,
    PricePlansComponent,
    CatalogueComponent,
    ProcurementModeComponent,
    ReplicationVisibilityComponent,
    OfferSummaryComponent,
    NgClass,
    DecimalPipe,
    LowerCasePipe
  ],
  templateUrl: './offer.component.html',
  styleUrl: './offer.component.css'
})
export class OfferComponent implements OnInit, OnDestroy {

  @Input() formType: 'create' | 'update' = 'create';
  @Input() offer: any = {};
  @Input() partyId: any;

  @Output() previewRequested = new EventEmitter<any>();

  productOfferForm: FormGroup;
  currentStep = 0;
  highestStep = 0;
  steps = [
    'General info',
    'Category',
    'Terms & Conditions',
    'Price plans',
    'Procurement mode'
  ];
  isFormValid = false;
  selectedProdSpec: any;
  pricePlans: any = [];
  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;
  bundleChecked: boolean = false;
  offersBundle: any[] = [];
  loadingData: boolean = false;

  showLeaveModal: boolean = false;

  availableProdSpecs: any[] = [];
  loadingProdSpecs: boolean = false;
  selectedProdSpecId: string = '';

  availableSectors: any[] = [];
  loadingSectors: boolean = false;
  selectedSectorId: string = '';

  availableRootCategories: any[] = [];
  availableSubcategories: any[] = [];
  loadingCategories: boolean = false;
  selectedRootCategoryId: string = '';
  selectedSubcategoryId: string = '';
  offerTags: string[] = [];
  tagInputValue: string = '';

  selectedPriceTier: '' | 'free' | 'tailored' | 'online' = '';
  readonly priceTiers: { id: 'free' | 'tailored' | 'online', titleKey: string, descKey: string }[] = [
    { id: 'free', titleKey: 'CREATE_OFFER._price_tier_free', descKey: 'CREATE_OFFER._price_tier_free_desc' },
    { id: 'tailored', titleKey: 'CREATE_OFFER._price_tier_tailored', descKey: 'CREATE_OFFER._price_tier_tailored_desc' },
    { id: 'online', titleKey: 'CREATE_OFFER._price_tier_online', descKey: 'CREATE_OFFER._price_tier_online_desc' }
  ];

  pricePlanFormMode: 'list' | 'form' = 'list';
  pricePlanFormType: 'tailored' | 'standard' | 'flex' | null = null;
  editingPricePlanIndex: number | null = null;
  openActionMenuIndex: number | null = null;
  tailoredPricePlanForm!: FormGroup;
  paidPricePlanForm!: FormGroup;

  showSelectPlanTypeModal = false;
  selectedNewPlanType: 'standard' | 'flex' | null = null;

  showConfigProfileModal = false;
  configProfileForm!: FormGroup;
  readonly currencyOptions: { code: string, label: string }[] = [
    { code: 'EUR', label: 'EURO' },
    { code: 'USD', label: 'US DOLLAR' },
    { code: 'GBP', label: 'POUND' }
  ];

  showPriceComponentModal = false;
  priceDrawerEntered = false;
  showPriceTypeDropdown = false;
  editingPriceComponentIndex: number | null = null;
  usageSpecs: any[] = [];
  selectedUsageSpec: any = null;

  tierForm!: FormGroup;
  flexTiers: any[] = [];
  showTierForm = false;
  editingTierIndex: number | null = null;
  openPriceCompMenuIndex: number | null = null;
  priceComponentForm!: FormGroup;
  readonly priceTypeOptions: { id: string, labelKey: string }[] = [
    { id: 'one time', labelKey: 'CREATE_OFFER._pc_price_type_one_time' },
    { id: 'recurring', labelKey: 'CREATE_OFFER._pc_price_type_recurring' },
    { id: 'recurring-prepaid', labelKey: 'CREATE_OFFER._pc_price_type_recurring_prepaid' },
    { id: 'usage', labelKey: 'CREATE_OFFER._pc_price_type_usage' }
  ];
  showRecurringPeriodDropdown = false;
  readonly recurringPeriodOptions: { id: string, labelKey: string }[] = [
    { id: 'day', labelKey: 'CREATE_OFFER._pc_recurring_daily' },
    { id: 'week', labelKey: 'CREATE_OFFER._pc_recurring_weekly' },
    { id: 'month', labelKey: 'CREATE_OFFER._pc_recurring_monthly' },
    { id: 'year', labelKey: 'CREATE_OFFER._pc_recurring_yearly' }
  ];

  autoCatalogue: any = null;

  tcAttachments: File[] = [];


  offerToCreate: ProductOffering_Create | undefined;

  private formChanges: { [key: string]: FormChangeState } = {};
  private formSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  hasChanges: boolean = false;

  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder,
    private prodSpecService: ProductSpecServiceService,
    private localStorage: LocalStorageService,
    private usageService: UsageServiceService,
    private accountService: AccountServiceService) {

    this.productOfferForm = this.fb.group({
      generalInfo: this.fb.group({
        name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
        version: new FormControl('0.1', [Validators.required, Validators.pattern('^-?[0-9]\\d*(\\.\\d*)?$')]),
        status: new FormControl('Active'),
        description: new FormControl('', [Validators.maxLength(300)])
      }),
      prodSpec: new FormControl(null, [Validators.required]),
      catalogue: new FormControl(null),
      category: new FormControl([]),
      license: this.fb.group({
        treatment: new FormControl('License'),
        description: new FormControl('')
      }),
      pricePlans: new FormControl([]),
      procurementMode: this.fb.group({
        mode: new FormControl('manual'),
        extBillingEnabled: new FormControl(false),
        plaSpecId: new FormControl('')
      }),
      replicationMode: this.fb.group({})
    });

    this.tailoredPricePlanForm = this.fb.group({
      name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      description: new FormControl('', [Validators.maxLength(300)])
    });

    this.paidPricePlanForm = this.fb.group({
      name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      description: new FormControl('', [Validators.maxLength(300)]),
      currency: new FormControl('EUR', [Validators.required]),
      productProfile: this.fb.group({ selectedValues: this.fb.array([] as FormGroup[]) }),
      priceComponents: this.fb.control([] as any[])
    });

    this.configProfileForm = this.fb.group({
      selectedValues: this.fb.array([] as FormGroup[])
    });

    this.priceComponentForm = this.fb.group({
      name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      description: new FormControl('', [Validators.maxLength(200)]),
      basePrice: new FormControl(null, [Validators.required, Validators.min(0)]),
      priceType: new FormControl('', [Validators.required]),
      configOption: new FormControl(''),
      configValue: new FormControl(''),
      recurringPeriod: new FormControl('month'),
      usageSpecId: new FormControl(''),
      usageUnit: new FormControl(''),
      includeDiscount: new FormControl(false),
      discountValue: new FormControl(null, [Validators.min(0)]),
      discountUnit: new FormControl('percentage'),
      discountDuration: new FormControl(null, [Validators.min(1)]),
      discountDurationUnit: new FormControl('days')
    });

    this.tierForm = this.fb.group({
      min: new FormControl(null, [Validators.required]),
      max: new FormControl(null, [Validators.required]),
      price: new FormControl(null, [Validators.required, Validators.min(0)]),
      priceType: new FormControl('', [Validators.required]),
      name: new FormControl('', [Validators.maxLength(100)]),
      description: new FormControl('', [Validators.maxLength(200)]),
      includeDiscount: new FormControl(false),
      discountValue: new FormControl(null, [Validators.min(0)]),
      discountUnit: new FormControl('percentage'),
      discountDuration: new FormControl(null, [Validators.min(1)]),
      discountDurationUnit: new FormControl('month')
    });

    this.productOfferForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const name = this.productOfferForm.get('generalInfo')?.get('name')?.value;
        this.isFormValid = !!(name && String(name).trim().length > 0);
      });

    // Subscribe to subform changes
    this.formSubscription = this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('subform changed-----')
        if (message.type === 'SubformChange') {
          const changeState = message.value as FormChangeState;
          console.log('Received subform change:', changeState);
          this.handleSubformChange(changeState);
        }
        if (message.type === 'LeaveOfferEditorRequest') {
          this.onBackClick();
        }
      });
  }

  handleSubformChange(change: FormChangeState) {
    console.log('📝 Subform change received:', change);
    this.formChanges[change.subformType] = change;
    this.hasChanges = Object.keys(this.formChanges).length > 0;
    console.log('📝 Has changes:', this.hasChanges);
    console.log(this.formChanges[change.subformType])
  }

  ngOnDestroy() {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToStep(index: number) {
    if (this.currentStep === 3 && index !== 3 && this.pricePlanFormMode === 'form') {
      this.cancelCurrentPricePlanForm();
    }
    this.currentStep = index;
    if (this.currentStep > this.highestStep) {
      this.highestStep = this.currentStep
    }
  }

  cancelCurrentPricePlanForm(): void {
    if (this.pricePlanFormType === 'tailored') this.cancelTailoredPricePlanForm();
    else if (this.pricePlanFormType === 'standard' || this.pricePlanFormType === 'flex') this.cancelPaidPricePlanForm();
    else {
      this.pricePlanFormMode = 'list';
      this.pricePlanFormType = null;
    }
  }

  saveCurrentPricePlanForm(): void {
    if (this.pricePlanFormType === 'tailored') this.saveTailoredPricePlan();
    else if (this.pricePlanFormType === 'standard' || this.pricePlanFormType === 'flex') this.savePaidPricePlan();
  }

  get currentPricePlanForm(): FormGroup {
    if (this.pricePlanFormType === 'tailored') return this.tailoredPricePlanForm;
    return this.paidPricePlanForm;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0:
        return (this.productOfferForm.get('generalInfo')?.valid || false) && !!this.productOfferForm.get('prodSpec')?.value;
      case 1:
        return !!this.selectedRootCategoryId;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return this.productOfferForm.get('procurementMode')?.valid || false;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    return true;
  }

  stepHasWarning(i: number): boolean {
    if (this.completedStep(i)) return false;
    if (this.currentStep === i) return false;
    if (this.formType === 'update') return true;
    return i < this.highestStep;
  }

  shouldShowRequiredErrors(): boolean {
    return this.formType === 'update' || this.highestStep > this.currentStep;
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }

  completedStep(index: number): boolean {
    if (index === 0) return !!this.productOfferForm.get('generalInfo')?.valid && !!this.productOfferForm.get('prodSpec')?.value && !!this.selectedSectorId;
    if (index === 1) return !!this.selectedRootCategoryId;
    if (index === 2) return true;
    if (index === 3) return !!this.selectedPriceTier;
    if (index === 4) return !!this.productOfferForm.get('procurementMode')?.valid;
    return false;
  }

  stepShowsComplete(i: number): boolean {
    if (this.currentStep === i) return false;
    if (!this.completedStep(i)) return false;
    return this.formType === 'update' || this.highestStep > i || i < this.currentStep;
  }

  stepCircleClasses(i: number): string {
    if (this.currentStep === i) return 'bg-primary-100 text-white';
    if (this.stepShowsComplete(i)) return 'bg-emerald-600 text-white';
    if (this.stepHasWarning(i)) return 'bg-amber-500 text-white';
    return 'bg-gray-100 text-gray-500';
  }

  stepLabelClasses(i: number): string {
    if (this.currentStep === i) return 'text-primary-100';
    if (this.stepShowsComplete(i)) return 'text-emerald-700';
    if (this.stepHasWarning(i)) return 'text-amber-700';
    return 'text-gray-500';
  }

  onBackClick(): void {
    if (this.formType === 'create' && this.hasAnyDraftData()) {
      this.showLeaveModal = true;
    } else {
      this.goBack();
    }
  }

  hasAnyDraftData(): boolean {
    const gi = this.productOfferForm.get('generalInfo')?.value;
    const cats = this.productOfferForm.get('category')?.value;
    const ps = this.productOfferForm.get('prodSpec')?.value;
    const li = this.productOfferForm.get('license')?.value;
    return !!(gi?.name || gi?.description || ps || (Array.isArray(cats) && cats.length) || li?.description);
  }

  cancelLeave(): void {
    this.showLeaveModal = false;
  }

  async confirmLeave(): Promise<void> {
    this.showLeaveModal = false;
    if (this.formType === 'create' && this.hasAnyDraftData()) {
      try {
        await this.saveDraftOffer();
        this.eventMessage.emitSpecCreated('Draft saved');
      } catch (err: any) {
        console.error('Failed to save draft offer', err);
        this.errorMessage = err?.error?.error || err?.message || 'Failed to save draft';
        this.showError = true;
        setTimeout(() => (this.showError = false), 4000);
        return;
      }
    }
    this.goBack();
  }

  async saveDraftOffer(): Promise<void> {
    const formValue = this.productOfferForm.value;
    const generalInfo = formValue.generalInfo || {};

    const categories = (Array.isArray(formValue.category) ? formValue.category : [])
      .map((c: any) => ({ id: c.id, href: c.id }));
    const licenseTerm = formValue.license?.description
      ? [{ name: 'License', description: formValue.license.description }]
      : [];

    const offer: any = {
      name: generalInfo.name || '(draft)',
      description: this.composeDescriptionWithTags(generalInfo.description || ''),
      lifecycleStatus: 'Active',
      isBundle: false,
      place: [],
      version: generalInfo.version || '0.1',
      validFor: { startDateTime: new Date().toISOString() },
      category: categories,
      productOfferingPrice: [],
      productOfferingTerm: licenseTerm
    };
    if (formValue.prodSpec?.id) {
      offer.productSpecification = { id: formValue.prodSpec.id, href: formValue.prodSpec.href || formValue.prodSpec.id };
    }

    const catalogue = this.autoCatalogue || await this.ensureCatalogue();
    if (!catalogue?.id) {
      throw new Error('Could not save draft: provider catalogue is unavailable.');
    }
    await lastValueFrom(this.api.postProductOffering(offer, catalogue.id));
  }

  async loadAvailableProdSpecs(): Promise<void> {
    if (!this.partyId) return;
    this.loadingProdSpecs = true;
    try {
      const limit = environment.PROD_SPEC_LIMIT;
      const all: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const page = await this.prodSpecService.getProdSpecByUser(offset, ['Launched'], this.partyId);
        const items = Array.isArray(page) ? page : [];
        all.push(...items);
        if (items.length < limit) break;
        offset += limit;
      }
      this.availableProdSpecs = all;
    } catch (err) {
      console.error('Failed to load product specs for selector', err);
      this.availableProdSpecs = [];
    } finally {
      this.loadingProdSpecs = false;
    }
  }

  async onProdSpecChange(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedProdSpecId = value;
    if (!value) {
      this.productOfferForm.patchValue({ prodSpec: null });
      return;
    }
    const summary = this.availableProdSpecs.find(p => p.id === value) || null;
    this.productOfferForm.patchValue({ prodSpec: summary });
    try {
      const full = await this.api.getProductSpecification(value);
      if (full && this.selectedProdSpecId === value) {
        this.productOfferForm.patchValue({ prodSpec: full });
      }
    } catch (err) {
      console.error('Failed to load full product specification', err);
    }
  }

  async loadAvailableSectors(): Promise<void> {
    this.loadingSectors = true;
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];
      const sectorRoot = list.find((c: any) => c?.name === 'Sector');
      if (sectorRoot?.id) {
        const children = await this.api.getCategoriesByParentId(sectorRoot.id);
        this.availableSectors = Array.isArray(children) ? children : [];
      } else {
        this.availableSectors = [];
      }
    } catch (err) {
      console.error('Failed to load market sectors', err);
      this.availableSectors = [];
    } finally {
      this.loadingSectors = false;
    }
  }

  onSectorChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedSectorId = value;
    const sectorIds = new Set(this.availableSectors.map(s => s.id));
    const current = this.productOfferForm.get('category')?.value || [];
    const withoutSectors = (Array.isArray(current) ? current : []).filter((c: any) => !sectorIds.has(c?.id));
    const chosen = this.availableSectors.find(s => s.id === value);
    const next = chosen ? [...withoutSectors, chosen] : withoutSectors;
    this.productOfferForm.patchValue({ category: next });
  }

  async loadCategories(): Promise<void> {
    this.loadingCategories = true;
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];
      const domeRoot = list.find((c: any) => c?.isRoot && c?.name === 'DOME Categories');
      if (domeRoot?.id) {
        const children = await this.api.getCategoriesByParentId(domeRoot.id);
        this.availableRootCategories = Array.isArray(children) ? children : [];
      } else {
        this.availableRootCategories = [];
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      this.availableRootCategories = [];
    } finally {
      this.loadingCategories = false;
    }
  }

  async onRootCategoryChange(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedRootCategoryId = value;
    this.selectedSubcategoryId = '';
    this.availableSubcategories = [];

    const rootIds = new Set(this.availableRootCategories.map(c => c.id));
    const current = this.productOfferForm.get('category')?.value || [];
    const preserved = (Array.isArray(current) ? current : []).filter((c: any) => {
      if (!c?.id) return true;
      if (rootIds.has(c.id)) return false;
      if (c?.parentId && rootIds.has(c.parentId)) return false;
      return true;
    });
    const chosenRoot = this.availableRootCategories.find(c => c.id === value);
    const next = chosenRoot ? [...preserved, chosenRoot] : preserved;
    this.productOfferForm.patchValue({ category: next });

    if (value) {
      try {
        const children = await this.api.getCategoriesByParentId(value);
        if (this.selectedRootCategoryId === value) {
          this.availableSubcategories = Array.isArray(children) ? children : [];
        }
      } catch (err) {
        console.error('Failed to load subcategories', err);
        this.availableSubcategories = [];
      }
    }
  }

  onSubcategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedSubcategoryId = value;
    const subIds = new Set(this.availableSubcategories.map(c => c.id));
    const current = this.productOfferForm.get('category')?.value || [];
    const withoutPriorSub = (Array.isArray(current) ? current : []).filter((c: any) => !subIds.has(c?.id));
    const chosen = this.availableSubcategories.find(c => c.id === value);
    const next = chosen ? [...withoutPriorSub, chosen] : withoutPriorSub;
    this.productOfferForm.patchValue({ category: next });
  }

  onTagInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const sanitized = raw.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 20);
    this.tagInputValue = sanitized;
    (event.target as HTMLInputElement).value = sanitized;
  }

  addTag(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = this.tagInputValue.trim();
    if (!value || this.offerTags.length >= 5 || this.offerTags.includes(value)) return;
    if (!/^[a-zA-Z0-9-]{1,20}$/.test(value)) return;
    this.offerTags = [...this.offerTags, value];
    this.tagInputValue = '';
    const input = (event.target as HTMLInputElement);
    input.value = '';
  }

  removeTag(index: number): void {
    this.offerTags = this.offerTags.filter((_, i) => i !== index);
  }

  private static readonly TAGS_MARKER = '[TAGS]:';
  private static readonly TAGS_REGEX = /\n*\[TAGS\]:(\[.*\])\s*$/;

  private composeDescriptionWithTags(description: string): string {
    const clean = (description || '').trimEnd();
    if (!this.offerTags.length) return clean;
    return `${clean}\n\n${OfferComponent.TAGS_MARKER}${JSON.stringify(this.offerTags)}`;
  }

  private extractTagsFromDescription(raw: string): { description: string; tags: string[] } {
    const text = raw || '';
    const match = text.match(OfferComponent.TAGS_REGEX);
    if (!match) return { description: text, tags: [] };
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === 'string').slice(0, 5);
    } catch {
      return { description: text, tags: [] };
    }
    return { description: text.slice(0, match.index).trimEnd(), tags };
  }

  get generalInfoFormGroup(): FormGroup {
    return this.productOfferForm.get('generalInfo') as FormGroup;
  }
  get licenseFormGroup(): FormGroup {
    return this.productOfferForm.get('license') as FormGroup;
  }

  get tailoredPricePlans(): any[] {
    const plans = this.productOfferForm.get('pricePlans')?.value || [];
    return Array.isArray(plans) ? plans.filter((p: any) => p?.priceType === 'custom') : [];
  }

  get onlinePaidPricePlans(): any[] {
    const plans = this.productOfferForm.get('pricePlans')?.value || [];
    return Array.isArray(plans) ? plans.filter((p: any) => p?.paymentOnline === true) : [];
  }

  get currentTierPricePlans(): any[] {
    if (this.selectedPriceTier === 'tailored') return this.tailoredPricePlans;
    if (this.selectedPriceTier === 'online') return this.onlinePaidPricePlans;
    return [];
  }

  selectPriceTier(id: 'free' | 'tailored' | 'online'): void {
    if (this.selectedPriceTier === id) return;
    if (this.currentTierPricePlans.length > 0) {
      return;
    }
    this.selectedPriceTier = id;
  }

  toggleActionMenu(index: number): void {
    this.openActionMenuIndex = this.openActionMenuIndex === index ? null : index;
  }

  removePricePlan(plan: any): void {
    const plans = (this.productOfferForm.get('pricePlans')?.value || []).slice();
    const index = plans.findIndex((p: any) => p?.id === plan?.id);
    if (index === -1) return;
    plans.splice(index, 1);
    this.productOfferForm.patchValue({ pricePlans: plans });
    this.openActionMenuIndex = null;
  }

  editPricePlan(plan: any): void {
    if (plan?.priceType === 'custom') {
      this.startEditTailoredPricePlan(plan);
    } else if (plan?.paymentOnline) {
      this.startEditPaidPricePlan(plan);
    }
  }

  openAddTailoredPricePlan(): void {
    this.editingPricePlanIndex = null;
    this.tailoredPricePlanForm.reset({ name: '', description: '' });
    this.pricePlanFormType = 'tailored';
    this.pricePlanFormMode = 'form';
  }

  startEditTailoredPricePlan(plan: any): void {
    const plans = this.productOfferForm.get('pricePlans')?.value || [];
    const index = plans.findIndex((p: any) => p?.id === plan?.id);
    if (index === -1) return;
    this.editingPricePlanIndex = index;
    this.tailoredPricePlanForm.reset({
      name: plan?.name || '',
      description: plan?.description || ''
    });
    this.openActionMenuIndex = null;
    this.pricePlanFormType = 'tailored';
    this.pricePlanFormMode = 'form';
  }

  cancelTailoredPricePlanForm(): void {
    this.editingPricePlanIndex = null;
    this.tailoredPricePlanForm.reset({ name: '', description: '' });
    this.pricePlanFormType = null;
    this.pricePlanFormMode = 'list';
  }

  saveTailoredPricePlan(): void {
    if (this.tailoredPricePlanForm.invalid) {
      this.tailoredPricePlanForm.markAllAsTouched();
      return;
    }
    const { name, description } = this.tailoredPricePlanForm.value;
    const plans = (this.productOfferForm.get('pricePlans')?.value || []).slice();
    if (this.editingPricePlanIndex !== null && plans[this.editingPricePlanIndex]) {
      plans[this.editingPricePlanIndex] = {
        ...plans[this.editingPricePlanIndex],
        name,
        description
      };
    } else {
      plans.push({
        id: `temp-id:${uuidv4()}`,
        name,
        description,
        isBundle: false,
        priceType: 'custom',
        paymentOnline: false,
        lifecycleStatus: 'Active',
        currency: 'EUR',
        priceComponents: []
      });
    }
    this.productOfferForm.patchValue({ pricePlans: plans });
    this.cancelTailoredPricePlanForm();
  }

  openSelectPlanTypeModal(): void {
    this.selectedNewPlanType = null;
    this.showSelectPlanTypeModal = true;
  }

  closeSelectPlanTypeModal(): void {
    this.showSelectPlanTypeModal = false;
    this.selectedNewPlanType = null;
  }

  confirmSelectPlanType(): void {
    if (!this.selectedNewPlanType) return;
    this.editingPricePlanIndex = null;
    this.pricePlanFormType = this.selectedNewPlanType;
    this.paidPricePlanForm.reset({
      name: '',
      description: '',
      currency: 'EUR',
      productProfile: { selectedValues: [] },
      priceComponents: []
    });
    this.paidProductProfile.clear();
    this.paidPriceComponents = [];
    this.showSelectPlanTypeModal = false;
    this.selectedNewPlanType = null;
    this.pricePlanFormMode = 'form';
  }

  startEditPaidPricePlan(plan: any): void {
    const plans = this.productOfferForm.get('pricePlans')?.value || [];
    const index = plans.findIndex((p: any) => p?.id === plan?.id);
    if (index === -1) return;
    this.editingPricePlanIndex = index;
    this.pricePlanFormType = (plan?.planSubType as 'standard' | 'flex') || 'standard';
    this.paidPricePlanForm.reset({
      name: plan?.name || '',
      description: plan?.description || '',
      currency: plan?.currency || 'EUR',
      productProfile: plan?.productProfile || { selectedValues: [] },
      priceComponents: plan?.priceComponents || []
    });
    this.paidProductProfile.clear();
    ((plan?.productProfile?.selectedValues) || []).forEach((sv: any) => {
      this.paidProductProfile.push(this.fb.group({
        id: [sv?.id || null],
        name: [sv?.name || ''],
        selectedValue: [sv?.selectedValue ?? null]
      }));
    });
    this.paidPriceComponents = (plan?.priceComponents || []).slice();
    this.openActionMenuIndex = null;
    this.pricePlanFormMode = 'form';
  }

  cancelPaidPricePlanForm(): void {
    this.editingPricePlanIndex = null;
    this.paidPricePlanForm.reset({
      name: '',
      description: '',
      currency: 'EUR',
      productProfile: { selectedValues: [] },
      priceComponents: []
    });
    this.paidProductProfile.clear();
    this.paidPriceComponents = [];
    this.pricePlanFormType = null;
    this.pricePlanFormMode = 'list';
  }

  savePaidPricePlan(): void {
    if (this.paidPricePlanForm.invalid) {
      this.paidPricePlanForm.markAllAsTouched();
      return;
    }
    const { name, description, currency } = this.paidPricePlanForm.value;
    const productProfile = { selectedValues: this.paidProductProfile.getRawValue() };
    const plans = (this.productOfferForm.get('pricePlans')?.value || []).slice();
    if (this.editingPricePlanIndex !== null && plans[this.editingPricePlanIndex]) {
      plans[this.editingPricePlanIndex] = {
        ...plans[this.editingPricePlanIndex],
        name,
        description,
        currency,
        productProfile,
        priceComponents: this.paidPriceComponents.slice()
      };
    } else {
      plans.push({
        id: `temp-id:${uuidv4()}`,
        name,
        description,
        currency,
        isBundle: this.pricePlanFormType !== 'standard',
        priceType: 'one time',
        paymentOnline: true,
        lifecycleStatus: 'Active',
        planSubType: this.pricePlanFormType,
        productProfile,
        priceComponents: this.paidPriceComponents.slice()
      });
    }
    this.productOfferForm.patchValue({ pricePlans: plans });
    this.cancelPaidPricePlanForm();
  }

  paidPriceComponents: any[] = [];

  get paidProductProfile(): FormArray {
    return (this.paidPricePlanForm.get('productProfile') as FormGroup).get('selectedValues') as FormArray;
  }

  get configProfileSelectedValues(): FormArray {
    return this.configProfileForm.get('selectedValues') as FormArray;
  }

  get prodSpecCharacteristics(): any[] {
    const prodSpec = this.productOfferForm.get('prodSpec')?.value;
    const list = prodSpec?.productSpecCharacteristic;
    if (!Array.isArray(list)) return [];
    return list.filter((c: any) => !String(c?.name || '').startsWith('Compliance:'));
  }

  openConfigProfileModal(): void {
    this.configProfileSelectedValues.clear();
    const existing = this.paidProductProfile.getRawValue();
    const existingById = new Map<string, any>(existing.map((s: any) => [s?.id, s]));
    this.prodSpecCharacteristics.forEach((char: any) => {
      const prev = existingById.get(char?.id);
      this.configProfileSelectedValues.push(this.fb.group({
        id: [char?.id],
        name: [char?.name || ''],
        selectedValue: [prev?.selectedValue ?? null]
      }));
    });
    this.showConfigProfileModal = true;
  }

  closeConfigProfileModal(): void {
    this.showConfigProfileModal = false;
  }

  saveConfigProfile(): void {
    const values = this.configProfileSelectedValues.getRawValue();
    this.paidProductProfile.clear();
    values.forEach((v: any) => {
      this.paidProductProfile.push(this.fb.group({
        id: [v?.id],
        name: [v?.name || ''],
        selectedValue: [v?.selectedValue ?? null]
      }));
    });
    this.showConfigProfileModal = false;
  }

  hasConfiguredProfile(): boolean {
    return this.paidProductProfile.length > 0 &&
      this.paidProductProfile.getRawValue().some((v: any) => v?.selectedValue != null && v?.selectedValue !== '');
  }

  getCharacteristicValues(charId: string): any[] {
    const char = this.prodSpecCharacteristics.find((c: any) => c?.id === charId);
    return Array.isArray(char?.productSpecCharacteristicValue) ? char.productSpecCharacteristicValue : [];
  }

  onConfigProfileValueChange(controlIndex: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.configProfileSelectedValues.at(controlIndex).patchValue({ selectedValue: value || null });
  }

  private async loadUsageSpecs(): Promise<void> {
    if (!this.partyId) return;
    try {
      const data = await this.usageService.getAllUsageSpecs(this.partyId);
      this.usageSpecs = Array.isArray(data) ? data : [];
    } catch {
      this.usageSpecs = [];
    }
  }

  onUsageSpecChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.selectedUsageSpec = this.usageSpecs.find(s => s.id === id) || null;
    this.priceComponentForm.patchValue({
      usageSpecId: id,
      usageUnit: this.selectedUsageSpec?.specCharacteristic?.[0]?.name || ''
    });
  }

  openAddPriceComponentModal(): void {
    this.editingPriceComponentIndex = null;
    this.selectedUsageSpec = null;
    this.flexTiers = [];
    this.showTierForm = false;
    this.editingTierIndex = null;
    this.priceComponentForm.reset({
      name: '', description: '', basePrice: null, priceType: '', configOption: '', configValue: '',
      recurringPeriod: 'month', usageSpecId: '', usageUnit: '',
      includeDiscount: false, discountValue: null, discountUnit: 'percentage',
      discountDuration: null, discountDurationUnit: 'days'
    });
    this.applyPriceComponentValidators();
    this.openPriceDrawer();
  }

  editPriceComponent(comp: any, index: number): void {
    this.editingPriceComponentIndex = index;
    this.selectedUsageSpec = this.usageSpecs.find(s => s.id === comp?.usageSpecId) || null;
    this.flexTiers = Array.isArray(comp?.tiers) ? [...comp.tiers] : [];
    this.showTierForm = false;
    this.editingTierIndex = null;
    this.priceComponentForm.reset({
      name: comp?.name || '',
      description: comp?.description || '',
      basePrice: comp?.price ?? null,
      priceType: comp?.priceType || '',
      configOption: comp?.configOption || '',
      configValue: comp?.configValue || '',
      recurringPeriod: comp?.recurringPeriod || 'month',
      usageSpecId: comp?.usageSpecId || '',
      usageUnit: comp?.usageUnit || '',
      includeDiscount: !!comp?.discountValue,
      discountValue: comp?.discountValue ?? null,
      discountUnit: comp?.discountUnit || 'percentage',
      discountDuration: comp?.discountDuration ?? null,
      discountDurationUnit: comp?.discountDurationUnit || 'days'
    });
    this.openPriceCompMenuIndex = null;
    this.applyPriceComponentValidators();
    this.openPriceDrawer();
  }

  private openPriceDrawer(): void {
    this.showPriceComponentModal = true;
    setTimeout(() => this.priceDrawerEntered = true, 10);
  }

  closePriceComponentModal(): void {
    this.priceDrawerEntered = false;
    this.showPriceTypeDropdown = false;
    this.showRecurringPeriodDropdown = false;
    setTimeout(() => {
      this.showPriceComponentModal = false;
      this.editingPriceComponentIndex = null;
    }, 250);
  }

  selectPriceType(id: string): void {
    const control = this.priceComponentForm.get('priceType');
    control?.setValue(id);
    control?.markAsTouched();
    this.showPriceTypeDropdown = false;
  }

  recurringPeriodLabelKey(id: string): string {
    return this.recurringPeriodOptions.find(o => o.id === id)?.labelKey || '';
  }

  get isFlexComponent(): boolean {
    return this.pricePlanFormType === 'flex';
  }

  get selectedConfigOption(): any {
    const id = this.priceComponentForm?.get('configOption')?.value;
    return id ? this.prodSpecCharacteristics.find((c: any) => c?.id === id) : null;
  }

  get isRangeConfigOption(): boolean {
    const first = this.selectedConfigOption?.productSpecCharacteristicValue?.[0];
    return !!first && 'valueFrom' in first;
  }

  get selectedConfigOptionValues(): any[] {
    return Array.isArray(this.selectedConfigOption?.productSpecCharacteristicValue)
      ? this.selectedConfigOption.productSpecCharacteristicValue
      : [];
  }

  get showConfigValueField(): boolean {
    return this.isFlexComponent && !!this.selectedConfigOption && !this.isRangeConfigOption;
  }

  get rangeBounds(): { min: number, max: number } {
    const v = this.selectedConfigOption?.productSpecCharacteristicValue?.[0];
    return { min: Number(v?.valueFrom ?? 0), max: Number(v?.valueTo ?? 1000) };
  }

  onConfigOptionChange(): void {
    this.flexTiers = [];
    this.showTierForm = false;
    this.editingTierIndex = null;
    this.applyPriceComponentValidators();
  }

  applyPriceComponentValidators(): void {
    const base = this.priceComponentForm.get('basePrice');
    const type = this.priceComponentForm.get('priceType');
    const value = this.priceComponentForm.get('configValue');
    const name = this.priceComponentForm.get('name');
    if (this.isFlexComponent && this.isRangeConfigOption) {
      base?.setValidators([Validators.min(0)]);
      type?.clearValidators();
      name?.clearValidators();
    } else {
      base?.setValidators([Validators.required, Validators.min(0)]);
      type?.setValidators([Validators.required]);
      name?.setValidators([Validators.required, Validators.maxLength(100)]);
    }
    if (this.isFlexComponent && this.selectedConfigOption && !this.isRangeConfigOption) {
      value?.setValidators([Validators.required]);
    } else {
      value?.clearValidators();
    }
    base?.updateValueAndValidity();
    type?.updateValueAndValidity();
    value?.updateValueAndValidity();
    name?.updateValueAndValidity();
  }

  canSavePriceComponent(): boolean {
    if (this.priceComponentForm.invalid) return false;
    if (this.isFlexComponent && this.isRangeConfigOption && (this.flexTiers.length === 0 || !this.tiersCoverRange)) return false;
    return true;
  }

  addTier(): void {
    this.editingTierIndex = null;
    const b = this.rangeBounds;
    const gap = this.tierCoverageGaps[0] ?? { from: b.min, to: b.max };
    this.tierForm.reset({
      min: gap.from, max: gap.to, price: null, priceType: '', name: '', description: '',
      includeDiscount: false, discountValue: null, discountUnit: 'percentage',
      discountDuration: null, discountDurationUnit: 'month'
    });
    this.showTierForm = true;
  }

  editTier(index: number): void {
    const t = this.flexTiers[index];
    if (!t) return;
    this.editingTierIndex = index;
    this.tierForm.reset({
      min: t.min, max: t.max, price: t.price, priceType: t.priceType || '',
      name: t.name || '', description: t.description || '',
      includeDiscount: !!t.discountValue, discountValue: t.discountValue ?? null,
      discountUnit: t.discountUnit || 'percentage', discountDuration: t.discountDuration ?? null,
      discountDurationUnit: t.discountDurationUnit || 'month'
    });
    this.showTierForm = true;
  }

  resetTierForm(): void {
    const b = this.rangeBounds;
    this.tierForm.reset({
      min: b.min, max: b.max, price: null, priceType: '', name: '', description: '',
      includeDiscount: false, discountValue: null, discountUnit: 'percentage',
      discountDuration: null, discountDurationUnit: 'days'
    });
  }

  saveTier(): void {
    if (this.tierForm.invalid || this.tierFormErrorKey) {
      this.tierForm.markAllAsTouched();
      return;
    }
    const v = this.tierForm.value;
    const tier: any = {
      min: v.min, max: v.max, price: v.price, priceType: v.priceType,
      name: v.name, description: v.description
    };
    if (v.includeDiscount && v.discountValue != null) {
      tier.discountValue = v.discountValue;
      tier.discountUnit = v.discountUnit;
      tier.discountDuration = v.discountDuration;
      tier.discountDurationUnit = v.discountDurationUnit;
    }
    if (this.editingTierIndex !== null) {
      this.flexTiers[this.editingTierIndex] = tier;
    } else {
      this.flexTiers = [...this.flexTiers, tier];
    }
    this.showTierForm = false;
    this.editingTierIndex = null;
  }

  deleteTier(index: number): void {
    this.flexTiers = this.flexTiers.filter((_, i) => i !== index);
    if (this.editingTierIndex === index) {
      this.showTierForm = false;
      this.editingTierIndex = null;
    }
  }

  cancelTierForm(): void {
    this.showTierForm = false;
    this.editingTierIndex = null;
  }

  canSaveTier(): boolean {
    if (this.tierForm.invalid || this.tierFormErrorKey) return false;
    if (this.editingTierIndex !== null) return this.tierForm.dirty;
    return true;
  }

  private tierOverlaps(min: number, max: number, excludeIndex: number | null): boolean {
    return this.flexTiers.some((t, i) =>
      i !== excludeIndex && min <= Number(t.max) && Number(t.min) <= max
    );
  }

  get tierFormErrorKey(): string | null {
    const min = Number(this.tierForm.get('min')?.value);
    const max = Number(this.tierForm.get('max')?.value);
    if (Number.isNaN(min) || Number.isNaN(max)) return null;
    const b = this.rangeBounds;
    if (min < b.min || max > b.max) return 'CREATE_OFFER._pc_tier_err_bounds';
    if (min > max) return 'CREATE_OFFER._pc_tier_err_min_max';
    if (this.tierOverlaps(min, max, this.editingTierIndex)) return 'CREATE_OFFER._pc_tier_err_overlap';
    return null;
  }

  get tierCoverageGaps(): { from: number, to: number }[] {
    const b = this.rangeBounds;
    if (!this.flexTiers.length) return [{ from: b.min, to: b.max }];
    const sorted = [...this.flexTiers].sort((a, b) => Number(a.min) - Number(b.min));
    const gaps: { from: number, to: number }[] = [];
    let cursor = b.min;
    for (const t of sorted) {
      const tMin = Number(t.min);
      if (tMin > cursor) gaps.push({ from: cursor, to: tMin - 1 });
      cursor = Math.max(cursor, Number(t.max) + 1);
    }
    if (cursor <= b.max) gaps.push({ from: cursor, to: b.max });
    return gaps;
  }

  get tiersCoverRange(): boolean {
    return this.tierCoverageGaps.length === 0;
  }

  formatTierGaps(): string {
    return this.tierCoverageGaps.map(g => g.from === g.to ? `${g.from}` : `${g.from}-${g.to}`).join(', ');
  }

  deleteCurrentTier(): void {
    if (this.editingTierIndex !== null) {
      this.deleteTier(this.editingTierIndex);
    } else {
      this.cancelTierForm();
    }
  }

  get currencySymbol(): string {
    const c = this.paidPricePlanForm.get('currency')?.value;
    return c === 'USD' ? '$' : c === 'GBP' ? '£' : '€';
  }

  computeFinalPrice(price: any, discountValue: any, unit: string): number {
    const p = Number(price) || 0;
    const d = Number(discountValue) || 0;
    if (!d) return p;
    return unit === 'fixed' ? Math.max(0, p - d) : p * (1 - d / 100);
  }

  tierFinalPrice(tier: any): number {
    return this.computeFinalPrice(tier?.price, tier?.discountValue, tier?.discountUnit);
  }

  periodLabelKey(value: string): string {
    switch (value) {
      case 'day': case 'days': return 'CREATE_OFFER._pc_recurring_daily';
      case 'week': case 'weeks': return 'CREATE_OFFER._pc_recurring_weekly';
      case 'month': case 'months': return 'CREATE_OFFER._pc_recurring_monthly';
      case 'year': case 'years': return 'CREATE_OFFER._pc_recurring_yearly';
      default: return '';
    }
  }

  componentPeriodKey(comp: any): string {
    if (['recurring', 'recurring-prepaid'].includes(comp?.priceType)) return this.periodLabelKey(comp?.recurringPeriod);
    if (comp?.discountValue != null) return this.periodLabelKey(comp?.discountDurationUnit);
    return '';
  }

  discountLabel(item: any): string {
    if (item?.discountValue == null) return '';
    return item.discountUnit === 'fixed' ? `${item.discountValue} ${this.currencySymbol}` : `${item.discountValue}%`;
  }

  get tierFormFinalPrice(): number {
    const v = this.tierForm.value;
    return this.computeFinalPrice(v.price, v.includeDiscount ? v.discountValue : null, v.discountUnit);
  }

  private boundsPercent(value: any): number {
    const { min: lo, max: hi } = this.rangeBounds;
    if (hi <= lo) return 0;
    return Math.min(100, Math.max(0, ((Number(value) - lo) / (hi - lo)) * 100));
  }

  get tierSliderMinPercent(): number {
    return this.boundsPercent(this.tierForm.get('min')?.value ?? this.rangeBounds.min);
  }

  get tierSliderMaxPercent(): number {
    return this.boundsPercent(this.tierForm.get('max')?.value ?? this.rangeBounds.max);
  }

  setTierBound(which: 'min' | 'max', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.tierForm.get(which)?.setValue(value);
    this.tierForm.markAsDirty();
    const min = Number(this.tierForm.get('min')?.value);
    const max = Number(this.tierForm.get('max')?.value);
    if (which === 'min' && min > max) {
      this.tierForm.get('max')?.setValue(min);
    } else if (which === 'max' && max < min) {
      this.tierForm.get('min')?.setValue(max);
    }
  }

  savePriceComponent(): void {
    if (this.priceComponentForm.invalid) {
      this.priceComponentForm.markAllAsTouched();
      return;
    }
    const {
      name, description, basePrice, priceType, configOption, configValue, recurringPeriod, usageSpecId, usageUnit,
      includeDiscount, discountValue, discountUnit, discountDuration, discountDurationUnit
    } = this.priceComponentForm.value;
    const isRange = this.isFlexComponent && this.isRangeConfigOption;
    const component: any = {
      id: `temp-id:${uuidv4()}`,
      name: isRange ? (this.selectedConfigOption?.name || name) : name,
      description: isRange ? '' : description,
      price: basePrice,
      priceType,
      currency: this.paidPricePlanForm.get('currency')?.value || 'EUR',
      lifecycleStatus: 'Active',
      includeDiscount: !!includeDiscount
    };
    if (this.isFlexComponent && configOption) {
      component.configOption = configOption;
      component.configOptionName = this.selectedConfigOption?.name || '';
      if (this.isRangeConfigOption) {
        component.tiers = [...this.flexTiers];
      } else {
        component.configValue = configValue;
      }
    }
    if (['recurring', 'recurring-prepaid'].includes(priceType)) {
      component.recurringPeriod = recurringPeriod;
    }
    if (priceType === 'usage') {
      component.usageSpecId = usageSpecId;
      component.usageUnit = usageUnit;
    }
    if (includeDiscount && discountValue != null) {
      component.discountValue = discountValue;
      component.discountUnit = discountUnit;
      component.discountDuration = discountDuration;
      component.discountDurationUnit = discountDurationUnit;
    }
    if (this.editingPriceComponentIndex !== null && this.paidPriceComponents[this.editingPriceComponentIndex]) {
      const existing = this.paidPriceComponents[this.editingPriceComponentIndex];
      this.paidPriceComponents[this.editingPriceComponentIndex] = { ...existing, ...component, id: existing.id };
    } else {
      this.paidPriceComponents = [...this.paidPriceComponents, component];
    }
    this.closePriceComponentModal();
  }

  removePriceComponent(index: number): void {
    this.paidPriceComponents = this.paidPriceComponents.filter((_, i) => i !== index);
    this.openPriceCompMenuIndex = null;
  }

  togglePriceCompMenu(index: number): void {
    this.openPriceCompMenuIndex = this.openPriceCompMenuIndex === index ? null : index;
  }

  priceTypeLabelKey(id: string): string {
    return this.priceTypeOptions.find(o => o.id === id)?.labelKey || '';
  }

  onTCFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(f => this.tcAttachments.push(f));
      input.value = '';
    }
  }

  removeTCFile(index: number): void {
    this.tcAttachments.splice(index, 1);
  }

  emitPreview(): void {
    this.previewRequested.emit(this.buildPreviewProductOff());
  }

  private buildPreviewProductOff(): any {
    const formValue = this.productOfferForm.value;
    const generalInfo = formValue.generalInfo || {};
    const prodSpec = formValue.prodSpec || null;

    const offeringTerms: any[] = [];
    if (formValue.license?.description) {
      offeringTerms.push({ name: 'License', description: formValue.license.description });
    }
    if (formValue.procurementMode?.mode) {
      offeringTerms.push({ name: 'procurement', description: formValue.procurementMode.mode });
    }

    const prices = (formValue.pricePlans || []).map((p: any) => {
      const priceValue = p?.priceComponents?.[0]?.price;
      const priceUnit = p?.currency || p?.priceComponents?.[0]?.currency || 'EUR';
      return {
        id: p?.id,
        href: p?.id,
        name: p?.name,
        description: p?.description,
        priceType: p?.priceType || p?.priceComponents?.[0]?.priceType || 'one time',
        price: priceValue != null ? { value: priceValue, unit: priceUnit } : undefined
      };
    });

    return {
      id: this.formType === 'update' && this.offer?.id ? this.offer.id : 'preview',
      name: generalInfo.name || '',
      description: generalInfo.description || '',
      version: generalInfo.version || '',
      lifecycleStatus: generalInfo.status || 'Active',
      category: Array.isArray(formValue.category) ? formValue.category : [],
      productSpecification: prodSpec || undefined,
      attachment: (prodSpec as any)?.attachment || [],
      productOfferingTerm: offeringTerms,
      productOfferingPrice: prices,
      lastUpdate: new Date().toISOString()
    };
  }

  async ensureCatalogue(): Promise<any> {
    if (this.autoCatalogue) return this.autoCatalogue;
    if (!this.partyId) return null;
    try {
      const existing = await this.api.getCatalogsByUser(0, undefined, [], this.partyId);
      if (Array.isArray(existing) && existing.length > 0) {
        this.autoCatalogue = existing[0];
        this.productOfferForm.patchValue({ catalogue: this.autoCatalogue });
        return this.autoCatalogue;
      }
      const catalogueName = await this.getDefaultCatalogueName();
      if (!catalogueName) return null;
      const created = await lastValueFrom(this.api.postCatalog({
        name: catalogueName,
        description: '',
        lifecycleStatus: 'Launched',
        relatedParty: [{ id: this.partyId, role: environment.SELLER_ROLE, '@referredType': '' }]
      }));
      if (created?.id) {
        this.autoCatalogue = created;
        this.productOfferForm.patchValue({ catalogue: created });
      }
      return this.autoCatalogue;
    } catch (err) {
      console.error('Failed to ensure provider catalogue', err);
      return null;
    }
  }

  private async getDefaultCatalogueName(): Promise<string> {
    let catalogueName = this.getCachedLoggedPartyName();

    if (!catalogueName) {
      try {
        const party = this.isOrganizationParty()
          ? await this.accountService.getOrgInfo(this.partyId)
          : await this.accountService.getUserInfo(this.partyId);
        catalogueName = this.isOrganizationParty()
          ? this.pickOrganizationPartyName(party)
          : this.pickIndividualPartyName(party);
      } catch (err) {
        console.error('Failed to resolve default catalogue name', err);
      }
    }

    return catalogueName;
  }

  private getCachedLoggedPartyName(): string {
    const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;
    if (!loginInfo || JSON.stringify(loginInfo) === '{}') return '';

    if (loginInfo.logged_as && loginInfo.id && loginInfo.logged_as !== loginInfo.id) {
      const loggedOrg = loginInfo.organizations?.find((org: any) => org.id === loginInfo.logged_as || org.partyId === this.partyId);
      return this.pickOrganizationPartyName(loggedOrg);
    }

    return this.normalizeCatalogueName(loginInfo.user);
  }

  private pickOrganizationPartyName(party: any): string {
    const value = party?.tradingName ?? party?.name;
    return this.normalizeCatalogueName(value);
  }

  private pickIndividualPartyName(party: any): string {
    return [party?.givenName, party?.familyName]
      .filter((value: any) => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .trim()
      .slice(0, 100);
  }

  private normalizeCatalogueName(value: any): string {
    return typeof value === 'string' ? value.trim().slice(0, 100) : '';
  }

  private isOrganizationParty(): boolean {
    return String(this.partyId || '').toLowerCase().includes('organization');
  }


  submitForm() {
    if (this.formType === 'update') {
      this.eventMessage.emitUpdateOffer(true);
      console.log('🔄 Starting offer update process...');
      console.log('📝 Current form changes:', this.formChanges);

      // Aquí irá la lógica de actualización
      // Por ahora solo mostramos los cambios
      this.updateOffer();
    } else {
      // Lógica de creación existente
      this.createOffer();
    }
  }

  async ngOnInit() {
    if (!this.partyId) {
      const aux = this.localStorage.getObject('login_items') as LoginInfo;
      if (aux && aux.organizations) {
        if (aux.logged_as == aux.id) {
          this.partyId = aux.partyId;
        } else {
          const loggedOrg = aux.organizations.find((e: any) => e.id == aux.logged_as);
          if (loggedOrg) this.partyId = loggedOrg.partyId;
        }
      }
    }

    this.loadUsageSpecs();

    if (this.formType === 'update' && this.offer) {
      this.loadingData = true;
      await Promise.all([this.loadAvailableProdSpecs(), this.loadAvailableSectors(), this.loadCategories()]);
      await this.loadOfferData();
      if (this.offer.productSpecification?.id) {
        this.selectedProdSpecId = this.offer.productSpecification.id;
        if (!this.availableProdSpecs.some(p => p.id === this.selectedProdSpecId)) {
          const fallback = this.selectedProdSpec || this.offer.productSpecification;
          this.availableProdSpecs = [...this.availableProdSpecs, { id: this.selectedProdSpecId, name: fallback?.name || this.offer.productSpecification.name || this.selectedProdSpecId }];
        }
      }
      const sectorIds = new Set(this.availableSectors.map(s => s.id));
      const existingSector = (this.offer.category || []).find((c: any) => sectorIds.has(c?.id));
      if (existingSector) this.selectedSectorId = existingSector.id;

      const rootIds = new Set(this.availableRootCategories.map(c => c.id));
      const existingRoot = (this.offer.category || []).find((c: any) => rootIds.has(c?.id));
      if (existingRoot) {
        this.selectedRootCategoryId = existingRoot.id;
        const children = await this.api.getCategoriesByParentId(existingRoot.id);
        this.availableSubcategories = Array.isArray(children) ? children : [];
        const subIds = new Set(this.availableSubcategories.map(c => c.id));
        const existingSub = (this.offer.category || []).find((c: any) => subIds.has(c?.id));
        if (existingSub) this.selectedSubcategoryId = existingSub.id;
      }
      this.loadingData = false;
    } else {
      this.loadAvailableProdSpecs();
      this.loadAvailableSectors();
      this.loadCategories();
      this.ensureCatalogue();
    }
  }
  async loadOfferData() {
    console.log('Loading offer into form...', this.offer);

    const { description: cleanDescription, tags: parsedTags } = this.extractTagsFromDescription(this.offer.description || '');
    this.offerTags = parsedTags;
    this.generalInfoFormGroup.patchValue({
      name: this.offer.name || '',
      version: this.offer.version || '0.1',
      status: this.offer.lifecycleStatus || 'Active',
      description: cleanDescription
    });

    // Product Specification
    if (this.offer.productSpecification) {
      await this.api.getProductSpecification(this.offer.productSpecification.id).then(async data => {
        this.selectedProdSpec = data;
      })
      this.productOfferForm.patchValue({
        prodSpec: this.selectedProdSpec || null // Cargar si existe, o dejar en null
      });
    }

    //CATEGORIES
    if (this.offer.category) {
      this.productOfferForm.patchValue({
        category: this.offer.category || null // Cargar si existe, o dejar en null
      });
    }

    //LICENSE
    if (this.offer.productOfferingTerm) {
      console.log('Found productOfferingTerm:', this.offer.productOfferingTerm);

      // Mantener el primer término (licencia) incluso si está vacío
      //const licenseTerm = this.offer.productOfferingTerm[0];
      const licenseTerm = this.offer.productOfferingTerm.find(
        (element: { name: string; }) => element.name === 'License'
      );

      // Filtrar el resto de términos

      /*const otherTerms = this.offer.productOfferingTerm.filter(
        (term: any) => term.name !== 'License'
      ) ?? [];


      // Reconstruir el array con el término de licencia en la posición 0
      this.offer.productOfferingTerm = [licenseTerm, ...otherTerms];*/

      if (licenseTerm) {
        this.productOfferForm.patchValue({
          license: {
            treatment: 'License',
            description: licenseTerm.description
          }
        });
      } else {
        this.productOfferForm.patchValue({
          license: {
            treatment: 'License',
            description: ''
          }
        });
      }

      //PROCUREMENT
      const procurementTerm = this.offer.productOfferingTerm.find(
        (element: { name: string; }) => element.name === 'procurement'
      );
      if (procurementTerm) {
        const procurementValue = {
          id: procurementTerm.description,
          name: procurementTerm.description
        };
        console.log('Setting procurement value:', procurementValue);
        this.productOfferForm.patchValue({
          procurementMode: procurementValue
        });
      } else {
        this.productOfferForm.patchValue({
          procurementMode: {
            id: 'manual',
            name: 'Manual'
          }
        });
      }
      /*console.log('Checking procurement terms...');
      this.offer.productOfferingTerm.forEach((term: any) => {
        console.log('Checking term:', term);
        if(term.name == 'procurement') {
          console.log('Found procurement term:', term);
          const procurementValue = {
            id: term.description,
            name: term.description
          };
          console.log('Setting procurement value:', procurementValue);
          this.productOfferForm.patchValue({
            procurementMode: procurementValue
          });
          console.log('Form value after patch:', this.productOfferForm.value);
        }
      })*/
    }

    // Price Plans
    if (Array.isArray(this.offer.productOfferingPrice) && this.offer.productOfferingPrice.length > 0) {
      for (let pop of this.offer.productOfferingPrice) {
        let relatedPrices: any[] = [];
        const pricePlan = await this.api.getOfferingPrice(pop.id);
        console.log('-- price plan ----')
        console.log(pricePlan)
        let configProfileCheck = false;
        if (pricePlan?.prodSpecCharValueUse && pricePlan?.prodSpecCharValueUse.length > 0) {
          configProfileCheck = true
        } else {
          configProfileCheck = false
        }

        let priceInfo: any = {
          id: pricePlan.id,
          name: pricePlan.name,
          description: pricePlan.description,
          lifecycleStatus: pricePlan.lifecycleStatus,
          priceType: pricePlan?.priceType,
          paymentOnline: pricePlan?.paymentOnline ?? !!pricePlan?.bundledPopRelationship,
          productProfile: configProfileCheck ? this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []) : [],
        }

        //Now every pricePlan is set as bundle even with only one price component
        if (pricePlan.bundledPopRelationship) {
          for (let i = 0; i < pricePlan.bundledPopRelationship.length; i++) {
            let data = await this.api.getOfferingPrice(pricePlan.bundledPopRelationship[i].id)
            let priceComp: any = {
              id: data.id,
              href: data.href,
              name: data?.name,
              description: data?.description,
              isBundle: data?.isBundle,
              priceType: data?.priceType,
              lastUpdate: data?.lastUpdate,
              lifecycleStatus: data?.lifecycleStatus,
              paymentOnline: data?.paymentOnline ?? !!data?.bundledPopRelationship,
              selectedCharacteristic: data?.prodSpecCharValueUse || null,
              currency: data?.price?.unit || 'EUR',
              usageUnit: data?.unitOfMeasure?.units || null,
              usageSpecId: data?.usageSpecId,
              recurringPeriod: data?.recurringChargePeriodType || 'month',
              price: data?.price?.value,
              validFor: data?.validFor || null,
            }

            if (data?.price?.unit) {
              priceComp.currency = data?.price?.unit
            }

            if (data?.popRelationship) {
              let alter = await this.api.getOfferingPrice(data?.popRelationship[0].id)
              console.log('----- alter')
              console.log(alter)
              if (alter.percentage) {
                priceComp.discountValue = alter?.percentage
                priceComp.discountUnit = 'percentage'
              } else {
                priceComp.discountValue = alter?.price?.value
                priceComp.discountUnit = 'fixed'
              }
              priceComp.discountDuration = alter?.unitOfMeasure?.amount
              priceComp.discountDurationUnit = alter?.unitOfMeasure?.units
              //priceComp.discountDurationUnit=alter?.
              //priceComp.discountDuration=this.calculateDiscountDuration(alter?.validFor,alter?.)
            }
            relatedPrices.push(priceComp)
          }
        }

        priceInfo.priceComponents = relatedPrices;
        console.log(priceInfo)
        //}

        this.pricePlans.push(priceInfo);
        console.log(this.pricePlans)
      }
      console.log('Price Plans existentes: ', this.pricePlans);

      this.productOfferForm.patchValue({
        pricePlans: this.pricePlans // Cargar si existe, o dejar en null
      });
    }

    if (this.pricePlans.some((p: any) => p.priceType === 'custom')) {
      this.selectedPriceTier = 'tailored';
    } else if (this.pricePlans.some((p: any) => p.paymentOnline)) {
      this.selectedPriceTier = 'online';
    } else {
      this.selectedPriceTier = 'free';
    }
  }

  private mapProductProfile(prodSpecCharValueUse: any[]): FormGroup {
    return this.fb.group({
      selectedValues: this.fb.array(
        prodSpecCharValueUse.map(spec =>
          this.fb.group({
            id: [spec.id],
            name: [spec.name],
            selectedValue: [
              spec.productSpecCharacteristicValue.find((v: { isDefault: boolean }) => v.isDefault)?.value || null,
              Validators.required
            ]
          })
        )
      )
    });
  }

  private handleApiError(error: any): void {
    console.error('Error while creating offer price!', error);
    this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'Error creating offer price!';
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  private async createPriceAlteration(component: any, currency: string): Promise<any> {
    const priceAlter: ProductOfferingPrice = {
      name: 'discount',
      priceType: 'discount',
      validFor: {
        startDateTime: moment().toISOString(),
        endDateTime: moment().add(Number(component.discountDuration), component.discountDurationUnit).toISOString()
      },
      unitOfMeasure: {
        amount: component.discountDuration,
        units: component.discountDurationUnit
      }
    };

    if (component.discountUnit === 'percentage') {
      priceAlter.percentage = component.discountValue;
    } else {
      priceAlter.price = { value: component.discountValue, unit: currency };
    }

    return await lastValueFrom(this.api.postOfferingPrice(priceAlter));
  }

  private async createPriceComponent(component: any, currency: string): Promise<any> {
    console.log('component format')
    console.log(component)
    let priceComp: ProductOfferingPrice = {
      name: component.name,
      isBundle: false,
      description: component.description ?? component?.newValue.description,
      lifecycleStatus: component?.lifecycleStatus ?? component?.newValue?.lifecycleStatus ?? 'Active',
      priceType: component.priceType ?? component?.newValue?.priceType,
      price: { unit: currency, value: component?.price ?? component?.newValue.price },
      recurringChargePeriodType: undefined,
      recurringChargePeriodLength: undefined,
      unitOfMeasure: undefined,
      prodSpecCharValueUse: undefined
    };

    let priceType = component.priceType ?? component?.newValue?.priceType;

    if (['recurring', 'recurring-prepaid'].includes(priceType)) {
      priceComp.recurringChargePeriodType = component.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (priceType === 'usage') {
      console.log(component.newValue)
      priceComp.unitOfMeasure = {
        amount: 1,
        units: component.usageUnit ?? component.newValue.usageUnit
      }
      priceComp['@baseType'] = "ProductOfferingPrice";
      priceComp['@schemaLocation'] = "https://raw.githubusercontent.com/laraminones/tmf-new-schemas/main/UsageSpecId.json";
      (priceComp as any).usageSpecId = component.usageSpecId ?? component?.newValue?.usageSpecId;


      console.log('-- here')
      console.log(priceComp)
    }

    if (component?.selectedCharacteristic || component?.newValue?.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.selectedCharacteristic ?? component.newValue.selectedCharacteristic;
    }

    if (component?.unitOfMeasure) {
      priceComp.unitOfMeasure = component.usageUnit;
    }

    if (component?.discountValue != null) {
      const discount = await this.createPriceAlteration(component, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('create price comp')
    console.log(priceComp)
    const created = await lastValueFrom(this.api.postOfferingPrice(priceComp));
    return { id: created.id, href: created.id, name: created.name };
  }

  private async updatePriceComponent(component: any, currency: string): Promise<any> {
    console.log('update function')
    console.log(component)
    console.log(currency)
    console.log('------')
    let priceComp: ProductOfferingPrice = {
      name: component.newValue.name,
      isBundle: false,
      description: component.newValue.description,
      lifecycleStatus: component.newValue.lifecycleStatus,
      priceType: component.newValue.priceType,
      price: { unit: currency, value: component.newValue.price }
    };

    if (['recurring', 'recurring-prepaid'].includes(component.newValue.priceType)) {
      priceComp.recurringChargePeriodType = component.newValue.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (component.newValue.priceType === 'usage') {
      console.log(component.newValue)
      priceComp.unitOfMeasure = {
        amount: 1,
        units: component.newValue.usageUnit
      };

      (priceComp as any).usageSpecId = component.newValue.usageSpecId;

      console.log('----- here')
      console.log(priceComp)
    }

    if (component.newValue.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.newValue.selectedCharacteristic;
    }

    if (component.newValue.unitOfMeasure) {
      priceComp.unitOfMeasure = component.newValue.usageUnit;
    }

    if (component.newValue.discountValue != null) {
      let discountMock: any = {
        discountValue: component.newValue.discountValue
      }
      if (component.newValue.discountUnit) {
        discountMock.discountUnit = component.newValue.discountUnit
      }
      if (component.newValue.discountDuration) {
        discountMock.discountDuration = component.newValue.discountDuration
      }
      if (component.newValue.discountDurationUnit) {
        discountMock.discountDurationUnit = component.newValue.discountDurationUnit
      }
      const discount = await this.createPriceAlteration(discountMock, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('update price comp')
    console.log(priceComp)
    const updated = await lastValueFrom(this.api.updateOfferingPrice(priceComp, component.id));
    return { id: updated.id, href: updated.id, name: updated.name };
  }

  private createBundledPricePlan(plan: any, compRel: any[]): ProductOfferingPrice {
    const isCustomNoComponents = (plan?.priceType === 'custom' || plan?.newValue?.priceType === 'custom') && compRel.length === 0;
    const price: ProductOfferingPrice = {
      name: plan.name ?? plan?.newValue?.name,
      isBundle: !isCustomNoComponents,
      description: plan.description ?? plan?.newValue?.description,
      lifecycleStatus: plan.lifecycleStatus ?? plan?.newValue?.lifecycleStatus,
      ...(isCustomNoComponents ? {} : { bundledPopRelationship: compRel })
    };

    if (plan?.priceType) {
      if (plan?.priceType == 'custom') {
        price.priceType = 'custom'
      }
    } else if (plan?.newValue?.priceType) {
      if (plan?.newValue?.priceType == 'custom') {
        price.priceType = 'custom'
      }
    }

    if (plan.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue
          .filter((v: any) => v.isDefault)
      }));
    }



    if (plan?.newValue?.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan?.newValue?.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue
          .filter((v: any) => v.isDefault)
      }));
    }

    console.log(price.prodSpecCharValueUse)

    if (plan.usageUnit) {
      price.unitOfMeasure = plan.usageUnit;
    }

    if (plan?.newValue?.usageUnit) {
      price.unitOfMeasure = plan?.newValue?.usageUnit;
    }

    return price;
  }

  async updatePricePlan(plan: any, compRel: any[], modifiedFields: string[]): Promise<ProductOfferingPrice> {

    console.log('plan info')
    console.log(plan)
    console.log(plan.id)
    console.log(compRel)
    let price: ProductOfferingPrice = {
      name: plan.newValue.name,
      isBundle: true,
      bundledPopRelationship: compRel
    }
    if (modifiedFields.includes('description')) {
      price.description = plan.newValue.description
    }
    if (modifiedFields.includes('prodSpecCharValueUse') && plan.newValue.prodSpecCharValueUse != null) {
      price.prodSpecCharValueUse = plan.newValue.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }
    let updatedPrice = await lastValueFrom(this.api.updateOfferingPrice(price, plan.id))
    return updatedPrice;
  }

  async createOffer() {
    this.loading = true;
    const plans = this.productOfferForm.value.pricePlans;

    if (plans.length === 0) {
      this.saveOfferInfo();
      return;
    }

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const components = plan.priceComponents || [];

      try {
        let createdPriceId: string;

        const compRel = await Promise.all(
          components.map((comp: any) => this.createPriceComponent(comp, plan.currency))
        );
        const bundledPricePlan = this.createBundledPricePlan(plan, compRel);
        const created = await lastValueFrom(this.api.postOfferingPrice(bundledPricePlan));
        createdPriceId = created.id;

        this.productOfferForm.value.pricePlans[i].id = createdPriceId;

        if (i === plans.length - 1) {
          this.saveOfferInfo();
        }
      } catch (error: any) {
        this.handleApiError(error);
      }
    }
  }

  saveOfferInfo(): void {
    const formValue = this.productOfferForm.value;

    const seenCategoryIds = new Set<string>();
    const categories = formValue.category
      .filter((cat: any) => {
        if (!cat?.id || seenCategoryIds.has(cat.id)) return false;
        seenCategoryIds.add(cat.id);
        return true;
      })
      .map((cat: any) => ({
        id: cat.id,
        href: cat.id
      }));

    const prices = formValue.pricePlans.map((plan: any) => ({
      id: plan.id,
      href: plan.id
    }));

    const generalInfo = formValue.generalInfo;
    const lifecycleStatus = this.formType === 'update' ? generalInfo.status : 'Active';

    const offer: any = {
      name: generalInfo.name,
      description: this.composeDescriptionWithTags(generalInfo.description || ''),
      lifecycleStatus,
      isBundle: this.bundleChecked,
      bundledProductOffering: this.offersBundle,
      place: [],
      version: generalInfo.version,
      ...(formValue.procurementMode.extBillingEnabled && formValue.procurementMode.plaSpecId ? {
        pricingLogicAlgorithm: [{ name: 'external billing', plaSpecId: formValue.procurementMode.plaSpecId }]
      } : {}),

      category: categories,
      productOfferingPrice: prices,
      validFor: {
        startDateTime: new Date().toISOString()
      },
      productOfferingTerm: [
        {
          name: 'License',
          description: formValue.license.description || ''
        },
        {
          name: 'procurement',
          description: formValue.procurementMode.mode
        }
      ]
    };

    if (!this.bundleChecked && this.formType === 'create' && formValue.prodSpec?.id) {
      offer.productSpecification = {
        id: formValue.prodSpec.id,
        href: formValue.prodSpec.href || formValue.prodSpec.id
      };
    }

    this.offerToCreate = offer;

    const catalogueId = formValue.catalogue?.id || this.autoCatalogue?.id;
    if (this.formType === 'create' && !catalogueId) {
      this.errorMessage = 'No catalogue available for this user. Please create one first.';
      this.loading = false;
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
      return;
    }

    const request$ = this.formType === 'create'
      ? this.api.postProductOffering(offer, catalogueId)
      : this.api.updateProductOffering(offer, this.offer.id);

    request$.subscribe({
      next: (data) => {
        console.log('product offer created:');
        console.log(data);
        this.loading = false;
        this.eventMessage.emitSpecCreated(this.formType === 'create' ? 'Product offer successfully created' : 'Product offer successfully updated');
        this.goBack();
      },
      error: (error) => {
        console.error('Error during offer save/update:', error);
        this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while saving the offer!';
        this.loading = false;
        this.showError = true;
        setTimeout(() => (this.showError = false), 3000);
      }
    });
  }

  goBack() {
    this.eventMessage.emitSellerOffer(true);
  }

  addToISOString(duration: number, unit: string): string {
    // Mapping between custom units and Moment.js valid units
    const unitMapping: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      day: 'days',
      week: 'weeks',
      month: 'months',
      year: 'years',
    };

    // Validate the unit and map to Moment.js DurationConstructor
    const validUnit = unitMapping[unit.toLowerCase()];

    if (validUnit) {
      return moment().add(duration, validUnit).toISOString();
    } else {
      throw new Error(`Invalid unit: ${unit}. Must be one of day, week, month, or year.`);
    }
  }

  calculateDiscountDuration(validFor: { startDateTime: string, endDateTime: string }, unit: 'days' | 'hours' | 'months') {
    const start = moment(validFor.startDateTime);
    const end = moment(validFor.endDateTime);

    // Calculate the difference based on the given unit
    const discountDuration = end.diff(start, unit);

    return discountDuration;
  }

  async updateOffer() {
    this.loading = true;
    console.log('🔄 Starting offer update process...');
    console.log('📝 Current form changes:', this.formChanges);

    const formGeneralInfo = (this.productOfferForm.get('generalInfo')?.value || {});
    const formProdSpec = this.productOfferForm.get('prodSpec')?.value;
    const formCategories = (this.productOfferForm.get('category')?.value || []);
    const formPricePlans: any[] = (this.productOfferForm.get('pricePlans')?.value || []);

    const basePayload: any = {
      name: formGeneralInfo.name,
      description: this.composeDescriptionWithTags(formGeneralInfo.description || ''),
      lifecycleStatus: formGeneralInfo.status,
      version: formGeneralInfo.version,
      category: formCategories.map((c: any) => ({ id: c.id, href: c.id })),
      productOfferingPrice: this.offer.productOfferingPrice.map((price: any) => ({
        id: price.id,
        href: price.href
      })),
      validFor: this.offer.validFor,
      productOfferingTerm: (this.offer.productOfferingTerm || []).map((t: any) => ({ ...t }))
    };

    if (formProdSpec?.id) {
      basePayload.productSpecification = {
        id: formProdSpec.id,
        href: formProdSpec.href || formProdSpec.id
      };
    }

    const licenseDesc = this.productOfferForm.get('license')?.value?.description ?? '';
    const existingLicense = basePayload.productOfferingTerm.find((t: any) => t.name === 'License');
    if (existingLicense) {
      existingLicense.description = licenseDesc;
    } else {
      basePayload.productOfferingTerm.unshift({ name: 'License', description: licenseDesc });
    }

    const procMode = this.productOfferForm.get('procurementMode')?.value?.mode;
    if (procMode) {
      const existingProc = basePayload.productOfferingTerm.find((t: any) => t.name === 'procurement');
      if (existingProc) existingProc.description = procMode;
      else basePayload.productOfferingTerm.push({ name: 'procurement', description: procMode });
    }

    // Procesar cada cambio emitido por los subformularios
    for (const [subformType, change] of Object.entries(this.formChanges)) {
      console.log(`📝 Processing changes for ${subformType}:`, change);

      switch (subformType) {

        case 'category':
          // Actualizar categorías
          basePayload.category = change.currentValue.map((cat: any) => ({
            id: cat.id,
            href: cat.id
          }));
          break;

        case 'license':
          // Actualizar términos de licencia
          const licenseTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'License');
          if (licenseTerm) {
            licenseTerm.description = change.currentValue.description;
          } else {
            // Añadir el término de licencia al principio del array
            basePayload.productOfferingTerm.unshift({
              name: 'License',
              description: change.currentValue.description
            });
          }
          break;

        case 'pricePlans':
          // Actualizar planes de precios
          basePayload.productOfferingPrice = change.currentValue.map((plan: any) => ({
            id: plan.id,
            href: plan.id
          }));
          console.log('Cambio en el plan de precios')
          console.log(basePayload.productOfferingPrice)
          console.log((change as PricePlanChangeState).modifiedPricePlans)
          let pricePlanChangeInfo = (change as PricePlanChangeState).modifiedPricePlans;
          for (let i = 0; i < pricePlanChangeInfo.length; i++) {
            let finalPriceComps: any[] = [];
            if (pricePlanChangeInfo[i].priceComponents.added.length > 0) {
              //Crear price comp
              for (let j = 0; j < pricePlanChangeInfo[i].priceComponents.added.length; j++) {
                //finalPriceComps.push(this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j],change.currentValue.currency))
                let compCreated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j], pricePlanChangeInfo[i]?.newValue.currency)
                finalPriceComps.push(compCreated)
              }
              console.log('The following price comps has been created:')
              console.log(finalPriceComps)
            }
            if (pricePlanChangeInfo[i].priceComponents.modified.length > 0) {
              //Modificar price comp
              for (let j = 0; j < pricePlanChangeInfo[i].priceComponents.modified.length; j++) {
                //Revisar que en el caso de actualizar un componente que tenga el mismo id que el price plan (que antes no fuese bundle) ahora hay que crear el componente
                console.log('antes del check')
                console.log(pricePlanChangeInfo[i])
                console.log(pricePlanChangeInfo[i]?.oldValue.isBundle)
                console.log((!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length > 0))
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id)
                if ((pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id) && (!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length > 0)) {
                  console.log('Si entra en el check')
                  let compUpdated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j], pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                } else if (pricePlanChangeInfo[i].priceComponents.modified[j].id != pricePlanChangeInfo[i].id) {
                  let compUpdated = await this.updatePriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j], pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                }

                console.log('The following price comp has been updated:')
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j])
              }
            }
            //Modificar el plan
            if (!pricePlanChangeInfo[i].id.startsWith('temp-id')) {
              let updatedPricePlan = await this.updatePricePlan(pricePlanChangeInfo[i], finalPriceComps, pricePlanChangeInfo[i].modifiedFields);

              console.log('Modified price plan')
              console.log(updatedPricePlan)
            } else {
              let createdPricePlan = await this.createBundledPricePlan(pricePlanChangeInfo[i], finalPriceComps);
              const created = await lastValueFrom(this.api.postOfferingPrice(createdPricePlan));
              let index = basePayload.productOfferingPrice.findIndex(
                (plan: any) => plan.id === pricePlanChangeInfo[i].id
              );
              basePayload.productOfferingPrice[index].id = created.id;
              basePayload.productOfferingPrice[index].href = created.id;
              console.log('New price plan')
              console.log(createdPricePlan)
            }
          }
          break;

        case 'procurement':
          // Actualizar modo de adquisición
          const procurementTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'procurement');
          if (procurementTerm) {
            procurementTerm.description = change.currentValue.id;
          } else {
            basePayload.productOfferingTerm.push({
              name: 'procurement',
              description: change.currentValue.id
            });
          }
          if (change.currentValue.extBillingEnabled && change.currentValue.plaSpecId) {
            basePayload.pricingLogicAlgorithm = [{ name: 'external billing', plaSpecId: change.currentValue.plaSpecId }];
          } else if (change.originalValue.extBillingEnabled && !change.currentValue.extBillingEnabled) {
            basePayload.pricingLogicAlgorithm = [];
          }
          break;

        case 'replication':
          // Actualizar configuración de replicación
          // TODO: Implementar cuando se tenga la estructura de replicación
          break;
      }
    }

    // Eliminar campos undefined o null
    Object.keys(basePayload).forEach(key => {
      if (basePayload[key] === undefined || basePayload[key] === null) {
        delete basePayload[key];
      }
    });

    // Limpiar términos vacíos en productOfferingTerm
    /*if (basePayload.productOfferingTerm) {
      // Mantener el primer término (licencia) incluso si está vacío
      //const licenseTerm = basePayload.productOfferingTerm[0];
      let licenseTerm = basePayload.productOfferingTerm.find((element: { name: any; }) => element.name == 'License')
      if(!licenseTerm){
        licenseTerm={
          name: 'License',
          description: basePayload.productOfferingTerm[0].description
        }
      }

      // Filtrar el resto de términos
      const otherTerms = this.offer.productOfferingTerm.filter(
        (term: any) => term.name !== 'License'
      ) ?? [];

      // Reconstruir el array con el término de licencia en la posición 0
      basePayload.productOfferingTerm = [licenseTerm, ...otherTerms];
    }*/

    if (formPricePlans.length > 0) {
      const priceRefs: any[] = [];
      for (const plan of formPricePlans) {
        if (plan.id && !String(plan.id).startsWith('temp-id')) {
          priceRefs.push({ id: plan.id, href: plan.id });
        } else {
          try {
            const components = plan.priceComponents || [];
            const compRel = await Promise.all(
              components.map((comp: any) => this.createPriceComponent(comp, plan.currency))
            );
            const bundledPlan = this.createBundledPricePlan(plan, compRel);
            const created = await lastValueFrom(this.api.postOfferingPrice(bundledPlan));
            priceRefs.push({ id: created.id, href: created.id });
          } catch (error: any) {
            this.handleApiError(error);
            this.loading = false;
            return;
          }
        }
      }
      basePayload.productOfferingPrice = priceRefs;
    } else {
      basePayload.productOfferingPrice = [];
    }

    console.log('📝 Final update payload:', basePayload);

    try {
      // Llamar a la API para actualizar la oferta
      await lastValueFrom(this.api.updateProductOffering(basePayload, this.offer.id));
      console.log('✅ Offer updated successfully');
      this.loading = false;
      this.goBack();
    } catch (error: any) {
      console.error('❌ Error updating offer:', error);
      this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while updating the offer!';
      this.loading = false;
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
    }
  }
}
