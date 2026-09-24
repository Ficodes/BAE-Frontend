import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';

import { OfferComponent } from './offer.component';
import { availableFilters, searchCategoriesConfig } from 'src/app/data/availableFilters';
import { ThemeService } from 'src/app/services/theme.service';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { environment } from 'src/environments/environment';

describe('OfferComponent', () => {
  let component: OfferComponent;
  let fixture: ComponentFixture<OfferComponent>;
  let themeSubject: BehaviorSubject<any>;
  let originalCatalogManagementEnabled: boolean;

  beforeEach(async () => {
    originalCatalogManagementEnabled = environment.CATALOG_MANAGEMENT_ENABLED;
    environment.CATALOG_MANAGEMENT_ENABLED = false;
    availableFilters.splice(0, availableFilters.length);
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
    searchCategoriesConfig.primaryRootName = '';
    themeSubject = new BehaviorSubject<any>(null);

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [OfferComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        {
          provide: ThemeService,
          useValue: {
            currentTheme$: themeSubject.asObservable(),
            getCurrentThemeConfig: () => themeSubject.value
          }
        }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OfferComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    environment.CATALOG_MANAGEMENT_ENABLED = originalCatalogManagementEnabled;
    availableFilters.splice(0, availableFilters.length);
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
    searchCategoriesConfig.primaryRootName = '';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should block forward navigation when the current required step is incomplete', () => {
    component.currentStep = 0;
    component.generalInfoCategoryFilter = {
      name: 'businessDomain',
      label: 'Business domain',
      source: 'categoryRoot',
      rootName: 'Business Domains',
      offerFormPlacement: 'generalInfo'
    };

    expect(component.canNavigate(1)).toBeFalse();

    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });
    component.selectedGeneralInfoCategoryFilterOptionId = 'filter-option-1';

    expect(component.canNavigate(1)).toBeTrue();
  });

  it('should expose category help only when configured by the active theme', () => {
    expect(component.categoryHelpMessage).toBeNull();

    themeSubject.next({
      name: 'BAE',
      workspace: {}
    });

    expect(component.categoryHelpMessage).toBeNull();

    themeSubject.next({
      name: 'DOME',
      workspace: {
        offerForm: {
          categoryHelp: {
            title: 'CREATE_OFFER._cant_find_cat_title',
            description: 'CREATE_OFFER._cant_find_cat_text'
          }
        }
      }
    });

    expect(component.categoryHelpMessage).toEqual({
      title: 'CREATE_OFFER._cant_find_cat_title',
      description: 'CREATE_OFFER._cant_find_cat_text'
    });
  });

  it('should leave directly when leaving offer creation without draft data', () => {
    const goBackSpy = spyOn(component, 'goBack');

    component.onBackClick();

    expect(component.showLeaveModal).toBeFalse();
    expect(goBackSpy).toHaveBeenCalled();
  });

  it('should show the leave modal when leaving offer creation with incomplete draft data', () => {
    const goBackSpy = spyOn(component, 'goBack');
    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });

    component.onBackClick();

    expect(component.showLeaveModal).toBeTrue();
    expect(component.canSaveDraftOffer()).toBeFalse();
    expect(goBackSpy).not.toHaveBeenCalled();
  });

  it('should require minimum mandatory fields before saving a draft', () => {
    expect(component.canSaveDraftOffer()).toBeFalse();

    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });

    expect(component.canSaveDraftOffer()).toBeFalse();

    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });

    expect(component.canSaveDraftOffer()).toBeTrue();
  });

  it('should require a selected catalog in general info when catalog management is enabled', () => {
    component.catalogManagementEnabled = true;
    component.currentStep = 0;

    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });

    expect(component.canNavigate(1)).toBeFalse();
    expect(component.canSaveDraftOffer()).toBeFalse();

    component.productOfferForm.patchValue({ catalogue: { id: 'catalogue-1' } });
    component.selectedCatalogId = 'catalogue-1';

    expect(component.canNavigate(1)).toBeTrue();
    expect(component.canSaveDraftOffer()).toBeTrue();
  });

  it('should patch the selected catalog from the general info catalog selector', () => {
    component.availableCatalogs = [
      { id: 'catalogue-1', name: 'Main catalogue' },
      { id: 'catalogue-2', name: 'Secondary catalogue' }
    ];

    component.onCatalogChange({ target: { value: 'catalogue-2' } } as unknown as Event);

    expect(component.selectedCatalogId).toBe('catalogue-2');
    expect(component.autoCatalogue).toEqual({ id: 'catalogue-2', name: 'Secondary catalogue' });
    expect(component.productOfferForm.get('catalogue')?.value).toEqual({ id: 'catalogue-2', name: 'Secondary catalogue' });
  });

  it('should only auto-select launched catalogs when catalog management is disabled', async () => {
    const api = (component as any).api;
    const launchedCatalog = { id: 'catalogue-launched', name: 'Published catalogue', lifecycleStatus: 'Launched' };
    const getCatalogsSpy = spyOn(api, 'getCatalogsByUser').and.returnValue(Promise.resolve([launchedCatalog]));

    component.catalogManagementEnabled = false;
    component.partyId = 'party-1';

    const catalogue = await component.ensureCatalogue();

    expect(getCatalogsSpy).toHaveBeenCalledOnceWith(0, undefined, ['Launched'], 'party-1');
    expect(catalogue).toBe(launchedCatalog);
    expect(component.productOfferForm.get('catalogue')?.value).toBe(launchedCatalog);
  });

  it('should create an offer in the catalog selected in general info when catalog management is enabled', async () => {
    const api = (component as any).api;
    const postSpy = spyOn(api, 'postProductOffering').and.returnValue(of({ id: 'offer-1' }));
    component.catalogManagementEnabled = true;
    component.autoCatalogue = { id: 'fallback-catalogue' };
    component.productOfferForm.get('generalInfo')?.patchValue({
      name: 'Offer name',
      version: '1.0'
    });
    component.productOfferForm.patchValue({
      prodSpec: { id: 'prod-spec-1' },
      catalogue: { id: 'selected-catalogue', name: 'Selected catalogue' },
      category: [],
      pricePlans: []
    });

    await component.saveOfferInfo();

    expect(postSpy).toHaveBeenCalled();
    expect(postSpy.calls.mostRecent().args[1]).toBe('selected-catalogue');
  });

  it('should keep the leave modal open when save draft is requested without mandatory fields', async () => {
    const saveDraftSpy = spyOn(component, 'saveDraftOffer');
    const goBackSpy = spyOn(component, 'goBack');
    component.showLeaveModal = true;

    await component.confirmLeave();

    expect(saveDraftSpy).not.toHaveBeenCalled();
    expect(goBackSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
  });

  it('should discard draft changes without saving them', () => {
    const saveDraftSpy = spyOn(component, 'saveDraftOffer');
    const goBackSpy = spyOn(component, 'goBack');
    component.showLeaveModal = true;

    component.discardLeave();

    expect(saveDraftSpy).not.toHaveBeenCalled();
    expect(goBackSpy).toHaveBeenCalled();
    expect(component.showLeaveModal).toBeFalse();
  });

  it('should upload selected terms files and include their URLs as offering terms when saving a draft', async () => {
    const attachmentService = TestBed.inject(AttachmentServiceService);
    const uploadSpy = spyOn(attachmentService, 'uploadFile').and.returnValue(of({ content: 'https://files.example/terms.pdf' }));
    const api = (component as any).api;
    const postSpy = spyOn(api, 'postProductOffering').and.returnValue(of({ id: 'offer-1' }));

    component.autoCatalogue = { id: 'catalogue-1' };
    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });
    component.productOfferForm.get('license')?.patchValue({ description: 'License text' });
    component.tcAttachments = [{
      name: 'terms.pdf',
      file: new File(['terms'], 'terms.pdf', { type: 'application/pdf' })
    } as any];

    await component.saveDraftOffer();

    expect(uploadSpy).toHaveBeenCalled();
    const offerPayload = postSpy.calls.mostRecent().args[0] as any;
    expect(offerPayload.productOfferingTerm).toContain(jasmine.objectContaining({
      name: 'License',
      description: 'License text'
    }));
    expect(offerPayload.productOfferingTerm).toContain(jasmine.objectContaining({
      name: 'terms-file',
      description: 'https://files.example/terms.pdf'
    }));
  });

  it('should require at least one tailored price plan when tailored tier is selected', () => {
    component.currentStep = 3;
    component.selectedPriceTier = 'tailored';

    expect(component.validateCurrentStep()).toBeFalse();
    expect(component.completedStep(3)).toBeFalse();

    component.productOfferForm.patchValue({
      pricePlans: [{ id: 'plan-1', priceType: 'custom' }]
    });

    expect(component.validateCurrentStep()).toBeTrue();
    expect(component.completedStep(3)).toBeTrue();
  });

  it('should require at least one online price plan when online tier is selected', () => {
    component.currentStep = 3;
    component.selectedPriceTier = 'online';

    expect(component.validateCurrentStep()).toBeFalse();

    component.productOfferForm.patchValue({
      pricePlans: [{ id: 'plan-1', paymentOnline: true }]
    });

    expect(component.validateCurrentStep()).toBeTrue();
  });

  it('should disable standard plans when the product specification has no configuration options', () => {
    spyOn(component, 'ngOnInit').and.resolveTo();
    component.showSelectPlanTypeModal = true;
    fixture.detectChanges();

    const standardPlanButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-cy="standardPlanType"]');
    expect(standardPlanButton.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-cy="standardPlanConfigurationHint"]')).not.toBeNull();

    component.selectedNewPlanType = 'standard';
    component.confirmSelectPlanType();
    expect(component.pricePlanFormType).toBeNull();
    expect(component.pricePlanFormMode).toBe('list');

    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [{
          id: 'char-1',
          name: 'Region',
          productSpecCharacteristicValue: [{ value: 'EU' }]
        }]
      }
    });
    fixture.detectChanges();

    expect(standardPlanButton.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-cy="standardPlanConfigurationHint"]')).toBeNull();
  });

  it('should block saving a standard paid plan without description, complete profile, and price component', () => {
    component.pricePlanFormType = 'standard';
    component.paidPricePlanForm.patchValue({
      name: 'Basic plan',
      description: '',
      currency: 'EUR'
    });
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-1',
            name: 'Region',
            productSpecCharacteristicValue: [{ value: 'EU' }]
          }
        ]
      }
    });

    expect(component.canSavePaidPricePlan()).toBeFalse();

    component.paidPricePlanForm.patchValue({ description: 'Basic plan description' });

    expect(component.canSavePaidPricePlan()).toBeFalse();

    component.paidProductProfile.push((component as any).fb.group({
      id: ['char-1'],
      name: ['Region'],
      selectedValue: ['EU']
    }));

    expect(component.canSavePaidPricePlan()).toBeFalse();

    component.paidPriceComponents = [{ id: 'pc-1', name: 'Monthly', price: 10, priceType: 'recurring' }];

    expect(component.canSavePaidPricePlan()).toBeTrue();
  });

  it('should require every configuration profile value before saving the profile modal', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-1',
            name: 'Region',
            productSpecCharacteristicValue: [{ value: 'EU' }]
          },
          {
            id: 'char-2',
            name: 'Size',
            productSpecCharacteristicValue: [{ value: 'Small' }]
          }
        ]
      }
    });

    component.openConfigProfileModal();

    expect(component.canSaveConfigProfile()).toBeFalse();

    component.configProfileSelectedValues.at(0).patchValue({ selectedValue: 'EU' });

    expect(component.canSaveConfigProfile()).toBeFalse();

    component.configProfileSelectedValues.at(1).patchValue({ selectedValue: 'Small' });

    expect(component.canSaveConfigProfile()).toBeTrue();
  });

  describe('configuration profile and constraint exclusivity', () => {
    const profileValues = [
      { id: 'char-region', name: 'Region', selectedValue: 'EU' },
      { id: 'char-users', name: 'Users', selectedValue: 1 }
    ];
    const button = (selector: string): HTMLButtonElement => fixture.nativeElement.querySelector(`[data-cy="${selector}"]`);

    beforeEach(() => {
      spyOn(component, 'ngOnInit').and.resolveTo();
      component.currentStep = component.steps.indexOf('CREATE_OFFER._step_price_plans');
      component.pricePlanFormMode = 'form';
      component.pricePlanFormType = 'standard';
      component.paidPricePlanForm.patchValue({ name: 'Plan', description: 'Plan description' });
      component.paidPriceComponents = [{ id: 'component-1', name: 'Base fee', price: 5, priceType: 'one time' }];
      component.productOfferForm.patchValue({ prodSpec: { productSpecCharacteristic: [
        { id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'EU', isDefault: true }, { value: 'US' }] },
        { id: 'char-users', name: 'Users', productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 10 }] }
      ] } });
    });

    it('should disable constraints only after saving the configuration profile', () => {
      fixture.detectChanges();
      button('setConfigProfile').click();
      component.closeConfigProfileModal();
      fixture.detectChanges();
      expect(button('choosePricePlanCharacteristics').disabled).toBeFalse();

      button('setConfigProfile').click();
      fixture.detectChanges();
      button('configProfileSave').click();
      fixture.detectChanges();

      expect(component.paidProductProfile.getRawValue()).toEqual(profileValues);
      expect(button('choosePricePlanCharacteristics').disabled).toBeTrue();
      expect(button('editConfigProfile').disabled).toBeFalse();
      button('choosePricePlanCharacteristics').click();
      component.openPricePlanCharacteristicsModal();
      expect(component.showPricePlanCharacteristicsModal).toBeFalse();
      expect(component.canSavePaidPricePlan()).toBeTrue();
    });

    it('should also block constraints when an existing profile is incomplete', () => {
      component.paidProductProfile.push((component as any).fb.group({
        id: 'char-region', name: 'Region', selectedValue: null
      }));
      fixture.detectChanges();

      expect(component.hasConfiguredProfile()).toBeFalse();
      expect(button('choosePricePlanCharacteristics').disabled).toBeTrue();
      component.openPricePlanCharacteristicsModal();
      expect(component.showPricePlanCharacteristicsModal).toBeFalse();
    });

    it('should reject a stale constraint dialog without pruning the saved profile', () => {
      component.openPricePlanCharacteristicsModal();
      component.togglePricePlanCharacteristic(0);
      component.openConfigProfileModal();
      component.saveConfigProfile();
      component.savePricePlanCharacteristics();

      expect(component.paidPricePlanForm.get('forbiddenCharacteristic')?.value).toEqual([]);
      expect(component.paidProductProfile.getRawValue()).toEqual(profileValues);
    });

    [
      { label: 'whole-characteristic', constraint: { id: 'char-region', name: 'Region' } },
      { label: 'partial-value', constraint: { id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'EU' }] } },
      { label: 'range', constraint: { id: 'char-users', name: 'Users', productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 2 }] } }
    ].forEach(({ label, constraint }) => {
      it(`should block the profile for a ${label} constraint and unlock it after explicit removal`, () => {
        component.paidPricePlanForm.patchValue({ forbiddenCharacteristic: [constraint] });
        fixture.detectChanges();

        expect(button('setConfigProfile').disabled).toBeTrue();
        expect(button('choosePricePlanCharacteristics').disabled).toBeFalse();
        button('setConfigProfile').click();
        component.openConfigProfileModal();
        expect(component.showConfigProfileModal).toBeFalse();
        expect(component.paidProductProfile.length).toBe(0);

        button('removePricePlanConstraints').click();
        fixture.detectChanges();
        expect(button('setConfigProfile').disabled).toBeFalse();
        button('setConfigProfile').click();
        expect(component.showConfigProfileModal).toBeTrue();
      });
    });

    it('should reject a stale profile dialog after constraints have been configured', () => {
      component.openConfigProfileModal();
      component.paidPricePlanForm.patchValue({ forbiddenCharacteristic: [{ id: 'char-region', name: 'Region' }] });
      fixture.detectChanges();

      expect(button('configProfileSave').disabled).toBeTrue();
      component.saveConfigProfile();
      expect(component.paidProductProfile.length).toBe(0);
      expect(component.hasPricePlanConstraints()).toBeTrue();
    });

    it('should preserve an API-loaded profile and components when resolving an existing conflict', () => {
      const plan = {
        id: 'plan-1', name: 'Plan', description: 'Plan description', currency: 'EUR',
        forbiddenCharacteristic: [{ id: 'char-region', name: 'Region' }],
        productProfile: (component as any).fb.group({
          selectedValues: (component as any).fb.array(profileValues.map(value => (component as any).fb.group(value)))
        }),
        priceComponents: component.paidPriceComponents.slice()
      };
      component.productOfferForm.patchValue({ pricePlans: [plan] });
      component.startEditPaidPricePlan(plan);
      const componentsBeforeRemoval = component.paidPriceComponents.map(price => ({ ...price }));
      fixture.detectChanges();

      expect(component.paidProductProfile.getRawValue()).toEqual(profileValues);
      expect(component.canSavePaidPricePlan()).toBeFalse();
      expect(button('choosePricePlanCharacteristics').disabled).toBeTrue();
      expect(button('setConfigProfile').disabled).toBeTrue();
      button('removePricePlanConstraints').click();
      fixture.detectChanges();

      expect(component.paidProductProfile.getRawValue()).toEqual(profileValues);
      expect(component.paidPriceComponents).toEqual(componentsBeforeRemoval);
      expect(button('editConfigProfile').disabled).toBeFalse();
      expect(component.canSavePaidPricePlan()).toBeTrue();
    });

    it('should block editing and saving a complete profile combined with a partial constraint', () => {
      component.openConfigProfileModal();
      component.saveConfigProfile();
      component.paidPricePlanForm.patchValue({ forbiddenCharacteristic: [{
        id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'US' }]
      }] });
      fixture.detectChanges();

      expect(component.hasCompleteConfiguredProfile()).toBeTrue();
      expect(button('editConfigProfile').disabled).toBeTrue();
      expect(component.canSavePaidPricePlan()).toBeFalse();
      component.savePaidPricePlan();
      expect(component.productOfferForm.get('pricePlans')?.value).toEqual([]);
    });

    it('should unlink a removed constraint in the plan PATCH while retaining its profile and discounts', async () => {
      const api = (component as any).api;
      const updateSpy = spyOn(api, 'updateOfferingPrice').and.returnValue(of({ id: 'plan-1' }));
      const postSpy = spyOn(api, 'postOfferingPrice');
      const discountRef = { id: 'discount-1', relationshipType: 'discount' };

      await (component as any).updateCurrentFormPricePlan({
        id: 'plan-1', name: 'Plan', constraintPriceId: 'constraint-1',
        forbiddenCharacteristic: [],
        popRelationship: [{ id: 'constraint-1', relationshipType: 'constraint' }, discountRef],
        productProfile: { selectedValues: [profileValues[0]] }
      }, []);

      expect(postSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        popRelationship: [discountRef],
        prodSpecCharValueUse: [jasmine.objectContaining({
          id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'EU', isDefault: true }]
        })]
      }), 'plan-1');
    });
  });

  it('should initialize price plan characteristics as allowed except existing forbidden characteristics', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          { id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'EU' }] },
          { id: 'char-size', name: 'Size', productSpecCharacteristicValue: [{ value: 'Small' }] }
        ]
      }
    });
    component.paidPricePlanForm.patchValue({
      forbiddenCharacteristic: [{ id: 'char-size', name: 'Size' }]
    });

    component.openPricePlanCharacteristicsModal();

    expect(component.pricePlanCharacteristicSelection).toEqual([
      {
        id: 'char-region',
        name: 'Region',
        allowed: true,
        sourceValues: [{ value: 'EU' }],
        allowedValues: [{ value: 'EU' }]
      },
      {
        id: 'char-size',
        name: 'Size',
        allowed: false,
        sourceValues: [{ value: 'Small' }],
        allowedValues: [{ value: 'Small' }]
      }
    ]);
  });

  it('should save disabled characteristics and remove them from price component options', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          { id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'EU' }] },
          { id: 'char-size', name: 'Size', productSpecCharacteristicValue: [{ value: 'Small' }] }
        ]
      }
    });
    component.openPricePlanCharacteristicsModal();

    component.togglePricePlanCharacteristic(1);
    component.savePricePlanCharacteristics();

    expect(component.paidPricePlanForm.get('forbiddenCharacteristic')?.value).toEqual([
      { id: 'char-size', name: 'Size' }
    ]);
    expect(component.prodSpecCharacteristics.map((characteristic: any) => characteristic.name)).toEqual(['Region']);
  });

  it('should save unchecked values as a partial constraint and remove only those values from price components', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [{
          id: 'char-region',
          name: 'Region',
          productSpecCharacteristicValue: [
            { value: 'EU', isDefault: true },
            { value: 'US', isDefault: false }
          ]
        }]
      }
    });
    component.openPricePlanCharacteristicsModal();

    component.togglePricePlanCharacteristicValue(0, 0);
    component.savePricePlanCharacteristics();

    expect(component.paidPricePlanForm.get('forbiddenCharacteristic')?.value).toEqual([{
      id: 'char-region',
      name: 'Region',
      productSpecCharacteristicValue: [{ value: 'EU' }]
    }]);
    expect(component.prodSpecCharacteristics[0].productSpecCharacteristicValue).toEqual([
      { value: 'US', isDefault: true }
    ]);
  });

  it('should persist the excluded part of an effective price plan range', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [{
          id: 'char-vcores',
          name: 'vCores',
          productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 386, isDefault: true }]
        }]
      }
    });
    component.openPricePlanCharacteristicsModal();

    component.setPricePlanCharacteristicRange(
      component.pricePlanCharacteristicSelection[0],
      'valueFrom',
      { target: { value: '4' } } as any
    );
    component.savePricePlanCharacteristics();

    expect(component.paidPricePlanForm.get('forbiddenCharacteristic')?.value).toEqual([{
      id: 'char-vcores',
      name: 'vCores',
      productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 3 }]
    }]);
    expect(component.rangeBounds).toEqual({ min: 0, max: 1000 });
    component.priceComponentForm.patchValue({ configOption: 'char-vcores' });
    expect(component.rangeBounds).toEqual({ min: 4, max: 386 });
  });

  it('should keep a characteristic allowed while it is used by a price component', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          { id: 'char-region', name: 'Region', productSpecCharacteristicValue: [{ value: 'EU' }] }
        ]
      }
    });
    component.paidPriceComponents = [{
      id: 'component-1',
      selectedCharacteristic: [{ id: 'char-region', name: 'Region' }]
    }];
    component.openPricePlanCharacteristicsModal();

    component.togglePricePlanCharacteristic(0);

    expect(component.pricePlanCharacteristicSelection[0].allowed).toBeTrue();
  });

  it('should treat boolean configuration profile values as switch values', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-bool',
            name: 'Managed service',
            productSpecCharacteristicValue: [{ value: true }, { value: false }]
          }
        ]
      }
    });

    component.openConfigProfileModal();

    expect(component.isConfigProfileBoolean(0)).toBeTrue();
    expect(component.isConfigProfileRange(0)).toBeFalse();
    expect(component.getConfigProfileSelectedValue(0)).toBeFalse();
    expect(component.canSaveConfigProfile()).toBeTrue();

    component.toggleConfigProfileBoolean(0);

    expect(component.getConfigProfileSelectedValue(0)).toBeTrue();
    expect(component.canSaveConfigProfile()).toBeTrue();
  });

  it('should treat range configuration profile values as slider values', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-range',
            name: 'Storage',
            productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 10, unitOfMeasure: 'GB' }]
          }
        ]
      }
    });

    component.openConfigProfileModal();

    expect(component.isConfigProfileRange(0)).toBeTrue();
    expect(component.isConfigProfileBoolean(0)).toBeFalse();
    expect(component.getConfigProfileRangeBounds(0)).toEqual({ min: 1, max: 10, unitOfMeasure: 'GB' });
    expect(component.getConfigProfileSelectedValue(0)).toBe(1);
    expect(component.canSaveConfigProfile()).toBeTrue();

    component.onConfigProfileRangeChange(0, { target: { value: '5' } } as unknown as Event);

    expect(component.getConfigProfileSelectedValue(0)).toBe(5);
    expect(component.getConfigProfileRangeDisplayValue(0)).toBe('5 GB');
  });

  it('should allow saving a flex price component without a configuration option', () => {
    component.pricePlanFormType = 'flex';
    component.openAddPriceComponentModal();

    component.priceComponentForm.patchValue({
      name: 'Base price',
      basePrice: 10,
      priceType: 'one time',
      configOption: ''
    });

    expect(component.selectedConfigOption).toBeNull();
    expect(component.canSavePriceComponent()).toBeTrue();
  });

  it('should store the recurring period selected for a recurring tier', () => {
    component.pricePlanFormType = 'flex';
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-range',
            name: 'Storage',
            productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 10, unitOfMeasure: 'GB' }]
          }
        ]
      }
    });
    component.openAddPriceComponentModal();
    component.priceComponentForm.patchValue({ configOption: 'char-range' });
    component.onConfigOptionChange();

    component.addTier();
    component.tierForm.patchValue({
      min: 1,
      max: 10,
      price: 25,
      priceType: 'recurring',
      recurringPeriod: 'year'
    });
    component.saveTier();

    expect(component.flexTiers.length).toBe(1);
    expect(component.flexTiers[0].priceType).toBe('recurring');
    expect(component.flexTiers[0].recurringPeriod).toBe('year');
  });

  it('should expand flex range tiers into separate API price components', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-range',
            name: 'Storage',
            description: 'Storage capacity',
            valueType: 'number',
            productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 20, unitOfMeasure: 'GB' }]
          }
        ]
      }
    });

    const apiComponents = (component as any).expandPriceComponentsForApi([
      {
        id: 'component-1',
        name: 'Storage',
        configOption: 'char-range',
        configOptionName: 'Storage',
        tiers: [
          { min: 1, max: 10, price: 25, priceType: 'recurring', recurringPeriod: 'month', name: 'Small storage' },
          { min: 11, max: 20, price: 40, priceType: 'recurring', recurringPeriod: 'year', name: 'Large storage' }
        ]
      }
    ]);

    expect(apiComponents.length).toBe(2);
    expect(apiComponents[0].name).toBe('Small storage');
    expect(apiComponents[0].price).toBe(25);
    expect(apiComponents[0].recurringPeriod).toBe('month');
    expect(apiComponents[0].tiers).toBeUndefined();
    expect(apiComponents[0].selectedCharacteristic[0]).toEqual(jasmine.objectContaining({
      id: 'char-range',
      name: 'Storage',
      description: 'Storage capacity',
      valueType: 'number'
    }));
    expect(apiComponents[0].selectedCharacteristic[0].productSpecCharacteristicValue).toEqual([{
      valueFrom: 1,
      valueTo: 10,
      isDefault: true,
      unitOfMeasure: 'GB'
    }]);
    expect(apiComponents[1].name).toBe('Large storage');
    expect(apiComponents[1].price).toBe(40);
    expect(apiComponents[1].recurringPeriod).toBe('year');
    expect(apiComponents[1].selectedCharacteristic[0].productSpecCharacteristicValue[0].valueFrom).toBe(11);
    expect(apiComponents[1].selectedCharacteristic[0].productSpecCharacteristicValue[0].valueTo).toBe(20);
  });

  it('should group API-loaded range price components into tiers for editing', () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-range',
            name: 'Storage',
            description: 'Storage capacity',
            valueType: 'number',
            productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 20, unitOfMeasure: 'GB' }]
          }
        ]
      }
    });
    const plan = {
      id: 'plan-flex',
      name: 'Flex plan',
      description: 'Flexible pricing',
      currency: 'EUR',
      paymentOnline: true,
      productProfile: { selectedValues: [] },
      priceComponents: [
        {
          id: 'tier-1',
          name: 'Small storage',
          price: 25,
          priceType: 'recurring',
          recurringPeriod: 'month',
          selectedCharacteristic: [{
            id: 'char-range',
            name: 'Storage',
            description: 'Storage capacity',
            valueType: 'number',
            productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 10, isDefault: true, unitOfMeasure: 'GB' }]
          }]
        },
        {
          id: 'tier-2',
          name: 'Large storage',
          price: 40,
          priceType: 'recurring',
          recurringPeriod: 'year',
          selectedCharacteristic: [{
            id: 'char-range',
            name: 'Storage',
            description: 'Storage capacity',
            valueType: 'number',
            productSpecCharacteristicValue: [{ valueFrom: 11, valueTo: 20, isDefault: true, unitOfMeasure: 'GB' }]
          }]
        }
      ]
    };
    component.productOfferForm.patchValue({ pricePlans: [plan] });

    component.startEditPaidPricePlan(plan);

    expect(component.pricePlanFormType).toBe('flex');
    expect(component.paidPriceComponents.length).toBe(1);
    expect(component.paidPriceComponents[0].configOption).toBe('char-range');
    expect(component.paidPriceComponents[0].tiers.length).toBe(2);
    expect(component.paidPriceComponents[0].tiers[0]).toEqual(jasmine.objectContaining({
      id: 'tier-1',
      min: 1,
      max: 10,
      price: 25,
      priceType: 'recurring',
      recurringPeriod: 'month'
    }));
    expect(component.paidPriceComponents[0].tiers[1]).toEqual(jasmine.objectContaining({
      id: 'tier-2',
      min: 11,
      max: 20,
      price: 40,
      priceType: 'recurring',
      recurringPeriod: 'year'
    }));

    component.editPriceComponent(component.paidPriceComponents[0], 0);

    expect(component.priceComponentForm.get('configOption')?.value).toBe('char-range');
    expect(component.selectedConfigOption?.id).toBe('char-range');
    expect(component.flexTiers.length).toBe(2);
  });

  it('should include non-range configuration option values in price component characteristics', () => {
    component.pricePlanFormType = 'flex';
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-region',
            name: 'Region',
            description: 'Deployment region',
            valueType: 'string',
            productSpecCharacteristicValue: [{ value: 'EU' }, { value: 'US' }]
          }
        ]
      }
    });
    component.openAddPriceComponentModal();
    component.priceComponentForm.patchValue({
      name: 'EU price',
      basePrice: 15,
      priceType: 'one time',
      configOption: 'char-region',
      configValue: 'EU'
    });
    component.applyPriceComponentValidators();

    component.savePriceComponent();

    expect(component.paidPriceComponents.length).toBe(1);
    expect(component.paidPriceComponents[0].selectedCharacteristic).toEqual([
      jasmine.objectContaining({
        id: 'char-region',
        name: 'Region',
        description: 'Deployment region',
        valueType: 'string',
        productSpecCharacteristicValue: [{ value: 'EU' }]
      })
    ]);
  });

  it('should infer flex plan type when editing a saved plan without a configuration profile', () => {
    const plan = {
      id: 'plan-flex',
      name: 'Flex plan',
      description: 'Flexible pricing',
      currency: 'EUR',
      paymentOnline: true,
      productProfile: { selectedValues: [] },
      priceComponents: [
        {
          id: 'component-1',
          name: 'EU price',
          price: 15,
          priceType: 'one time',
          selectedCharacteristic: [
            {
              id: 'char-region',
              name: 'Region',
              productSpecCharacteristicValue: [{ value: 'EU' }]
            }
          ]
        }
      ]
    };
    component.productOfferForm.patchValue({ pricePlans: [plan] });

    component.startEditPaidPricePlan(plan);

    expect(component.pricePlanFormType).toBe('flex');
  });

  it('should infer flex plan type when editing a saved plan with multiple unconfigured components', () => {
    const plan = {
      id: 'plan-flex-multiple',
      name: 'Flex plan',
      description: 'Flexible pricing',
      currency: 'EUR',
      paymentOnline: true,
      productProfile: { selectedValues: [] },
      priceComponents: [
        {
          id: 'component-1',
          name: 'Setup fee',
          price: 15,
          priceType: 'one time'
        },
        {
          id: 'component-2',
          name: 'Monthly fee',
          price: 20,
          priceType: 'recurring',
          recurringPeriod: 'month'
        }
      ]
    };
    component.productOfferForm.patchValue({ pricePlans: [plan] });

    component.startEditPaidPricePlan(plan);

    expect(component.pricePlanFormType).toBe('flex');
  });

  it('should infer standard plan type when editing a saved plan with a configuration profile', () => {
    const plan = {
      id: 'plan-basic',
      name: 'Basic plan',
      description: 'Basic pricing',
      currency: 'EUR',
      paymentOnline: true,
      productProfile: {
        selectedValues: [
          { id: 'char-region', name: 'Region', selectedValue: 'EU' }
        ]
      },
      priceComponents: [
        {
          id: 'component-1',
          name: 'Base price',
          price: 15,
          priceType: 'one time'
        }
      ]
    };
    component.productOfferForm.patchValue({ pricePlans: [plan] });

    component.startEditPaidPricePlan(plan);

    expect(component.pricePlanFormType).toBe('standard');
  });

  it('should preselect configuration option and value when editing an API-loaded price component', () => {
    component.pricePlanFormType = 'flex';
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-region',
            name: 'Region',
            productSpecCharacteristicValue: [{ value: 'EU' }, { value: 'US' }]
          }
        ]
      }
    });

    component.editPriceComponent({
      id: 'component-1',
      name: 'EU price',
      price: 15,
      priceType: 'one time',
      selectedCharacteristic: [
        {
          id: 'char-region',
          name: 'Region',
          productSpecCharacteristicValue: [{ value: 'EU' }]
        }
      ]
    }, 0);

    expect(component.priceComponentForm.get('configOption')?.value).toBe('char-region');
    expect(component.priceComponentForm.get('configValue')?.value).toBe('EU');
    expect(component.selectedConfigOption?.id).toBe('char-region');
    expect(component.showConfigValueField).toBeTrue();
  });

  it('should keep explicit configuration option fields when editing a local price component', () => {
    component.pricePlanFormType = 'flex';
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-region',
            name: 'Region',
            productSpecCharacteristicValue: [{ value: 'EU' }, { value: 'US' }]
          }
        ]
      }
    });

    component.editPriceComponent({
      id: 'component-1',
      name: 'US price',
      price: 15,
      priceType: 'one time',
      configOption: 'char-region',
      configValue: 'US',
      selectedCharacteristic: [
        {
          id: 'char-region',
          name: 'Region',
          productSpecCharacteristicValue: [{ value: 'EU' }]
        }
      ]
    }, 0);

    expect(component.priceComponentForm.get('configOption')?.value).toBe('char-region');
    expect(component.priceComponentForm.get('configValue')?.value).toBe('US');
  });

  it('should persist inline-edited existing plans by updating and creating expanded tier components', async () => {
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [
          {
            id: 'char-range',
            name: 'Storage',
            productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 20, unitOfMeasure: 'GB' }]
          }
        ]
      }
    });
    const api = (component as any).api;
    const updateSpy = spyOn(api, 'updateOfferingPrice').and.callFake((_payload: any, id: string) =>
      of({ id, href: id, name: _payload?.name })
    );
    const postSpy = spyOn(api, 'postOfferingPrice').and.returnValue(
      of({ id: 'created-tier', href: 'created-tier', name: 'Large storage' })
    );

    const refs = await (component as any).persistCurrentFormPricePlans([
      {
        id: 'plan-1',
        name: 'Flex plan',
        description: 'Updated plan',
        currency: 'EUR',
        lifecycleStatus: 'Active',
        productProfile: { selectedValues: [] },
        priceComponents: [
          {
            id: 'tier-group:char-range',
            name: 'Storage',
            configOption: 'char-range',
            configOptionName: 'Storage',
            tiers: [
              {
                id: 'tier-1',
                name: 'Small storage',
                min: 1,
                max: 10,
                price: 30,
                priceType: 'recurring',
                recurringPeriod: 'month'
              },
              {
                name: 'Large storage',
                min: 11,
                max: 20,
                price: 40,
                priceType: 'recurring',
                recurringPeriod: 'year'
              }
            ]
          }
        ]
      }
    ], true);

    expect(refs).toEqual([{ id: 'plan-1', href: 'plan-1' }]);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy.calls.argsFor(0)[1]).toBe('tier-1');
    expect(updateSpy.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      price: { unit: 'EUR', value: 30 },
      recurringChargePeriodType: 'month'
    }));
    expect(postSpy.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      price: { unit: 'EUR', value: 40 },
      recurringChargePeriodType: 'year'
    }));
    expect(updateSpy.calls.argsFor(1)[1]).toBe('plan-1');
    expect(updateSpy.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      name: 'Flex plan',
      description: 'Updated plan',
      bundledPopRelationship: [
        { id: 'tier-1', href: 'tier-1', name: 'Small storage' },
        { id: 'created-tier', href: 'created-tier', name: 'Large storage' }
      ]
    }));
  });

  it('should create a constraint price and reference it from the bundled price plan', async () => {
    const api = (component as any).api;
    const postSpy = spyOn(api, 'postOfferingPrice').and.returnValue(of({
      id: 'constraint-1',
      href: 'constraint-1',
      name: 'Forbidden characteristics'
    }));
    const plan = {
      name: 'Flex plan',
      description: 'Flexible pricing',
      lifecycleStatus: 'Active',
      forbiddenCharacteristic: [{ id: 'char-size', name: 'Size' }]
    };

    const constraintRef = await (component as any).persistPricePlanConstraint(plan);
    const payload = (component as any).createBundledPricePlan(plan, [], constraintRef);

    expect(postSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      isBundle: false,
      priceType: 'constraint',
      prodSpecCharValueUse: [{ id: 'char-size', name: 'Size' }]
    }));
    expect(payload.popRelationship).toEqual([jasmine.objectContaining({
      id: 'constraint-1',
      relationshipType: 'constraint'
    })]);
    expect((payload as any).forbiddenCharacteristic).toBeUndefined();
  });

  it('should persist a range configuration profile when creating a price plan', async () => {
    const api = (component as any).api;
    const postSpy = spyOn(api, 'postOfferingPrice').and.returnValue(of({ id: 'plan-1' }));
    component.productOfferForm.patchValue({
      prodSpec: {
        productSpecCharacteristic: [{
          id: 'char-range',
          name: 'Storage',
          productSpecCharacteristicValue: [{ valueFrom: 0, valueTo: 100, unitOfMeasure: 'GB' }]
        }]
      }
    });

    await (component as any).persistCurrentFormPricePlans([{
      name: 'Standard plan',
      lifecycleStatus: 'Active',
      productProfile: {
        selectedValues: [{ id: 'char-range', name: 'Storage', selectedValue: 30 }]
      },
      priceComponents: []
    }], false);

    expect(postSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      prodSpecCharValueUse: [jasmine.objectContaining({
        id: 'char-range',
        name: 'Storage',
        productSpecCharacteristicValue: [{
          valueFrom: 0,
          valueTo: 100,
          unitOfMeasure: 'GB',
          value: 30,
          isDefault: true
        }]
      })]
    }));
  });

  it('should update the existing constraint price instead of creating another one', async () => {
    const api = (component as any).api;
    const updateSpy = spyOn(api, 'updateOfferingPrice').and.returnValue(of({
      id: 'constraint-1',
      href: 'constraint-1',
      name: 'Forbidden characteristics'
    }));

    const constraintRef = await (component as any).persistPricePlanConstraint({
      constraintPriceId: 'constraint-1',
      forbiddenCharacteristic: [{
        id: 'char-size',
        name: 'Size',
        productSpecCharacteristicValue: [{ value: 'XL' }]
      }]
    });

    expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      priceType: 'constraint',
      prodSpecCharValueUse: [{
        id: 'char-size',
        name: 'Size',
        productSpecCharacteristicValue: [{ value: 'XL' }]
      }]
    }), 'constraint-1');
    expect(constraintRef.id).toBe('constraint-1');
  });

  it('should resolve only discount prices from a component popRelationship', async () => {
    const api = (component as any).api;
    const getSpy = spyOn(api, 'getOfferingPrice').and.resolveTo({
      id: 'discount-1',
      priceType: 'discount',
      percentage: 20
    });

    const discount = await (component as any).getRelatedOfferingPriceByType({
      popRelationship: [
        { id: 'constraint-1', relationshipType: 'constraint' },
        { id: 'discount-1' }
      ]
    }, 'discount');

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith('discount-1');
    expect(discount.percentage).toBe(20);
  });

  it('should patch existing normal POPs and create only newly added normal POPs', async () => {
    const api = (component as any).api;
    const updateSpy = spyOn(api, 'updateOfferingPrice').and.callFake((_payload: any, id: string) =>
      of({ id, href: id, name: _payload?.name })
    );
    const postSpy = spyOn(api, 'postOfferingPrice').and.returnValue(
      of({ id: 'created-component', href: 'created-component', name: 'New setup fee' })
    );

    const refs = await (component as any).persistCurrentFormPricePlans([
      {
        id: 'plan-1',
        name: 'Flex plan',
        description: 'Updated plan',
        currency: 'EUR',
        lifecycleStatus: 'Active',
        productProfile: { selectedValues: [] },
        priceComponents: [
          {
            id: 'component-1',
            name: 'Monthly fee',
            description: 'Updated monthly fee',
            price: 30,
            priceType: 'recurring',
            recurringPeriod: 'month'
          },
          {
            name: 'New setup fee',
            price: 10,
            priceType: 'one time'
          }
        ]
      }
    ], true);

    expect(refs).toEqual([{ id: 'plan-1', href: 'plan-1' }]);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy.calls.argsFor(0)[1]).toBe('component-1');
    expect(updateSpy.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      name: 'Monthly fee',
      description: 'Updated monthly fee',
      price: { unit: 'EUR', value: 30 },
      recurringChargePeriodType: 'month'
    }));
    expect(postSpy.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      name: 'New setup fee',
      price: { unit: 'EUR', value: 10 }
    }));
    expect(updateSpy.calls.argsFor(1)[1]).toBe('plan-1');
    expect(updateSpy.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      bundledPopRelationship: [
        { id: 'component-1', href: 'component-1', name: 'Monthly fee' },
        { id: 'created-component', href: 'created-component', name: 'New setup fee' }
      ]
    }));
  });

  it('should preserve the tier POP id when editing an existing tier', () => {
    component.flexTiers = [{
      id: 'tier-1',
      min: 1,
      max: 10,
      price: 25,
      priceType: 'recurring',
      recurringPeriod: 'month',
      name: 'Small storage'
    }];

    component.editTier(0);
    component.tierForm.patchValue({ price: 30 });
    component.saveTier();

    expect(component.flexTiers[0]).toEqual(jasmine.objectContaining({
      id: 'tier-1',
      price: 30
    }));
  });

  it('should allow the free price tier without price plans', () => {
    component.currentStep = 3;
    component.selectedPriceTier = 'free';

    expect(component.validateCurrentStep()).toBeTrue();
    expect(component.completedStep(3)).toBeTrue();
  });

  it('should not require a general info category filter when no generalInfo placement is configured', async () => {
    availableFilters.splice(
      0,
      availableFilters.length,
      {
        name: 'businessDomain',
        label: 'Business domain',
        source: 'categoryRoot',
        rootName: 'Business Domains'
      },
      {
        name: 'deploymentModel',
        label: 'Deployment model',
        source: 'categoryRoot',
        rootName: 'Deployment Models',
        offerFormPlacement: 'categorySection'
      }
    );
    const api = (component as any).api;
    const getDefaultCategoriesSpy = spyOn(api, 'getDefaultCategories');

    await component.loadGeneralInfoCategoryFilterOptions();

    expect(getDefaultCategoriesSpy).not.toHaveBeenCalled();
    expect(component.generalInfoCategoryFilter).toBeNull();
    expect(component.generalInfoCategoryFilterOptions).toEqual([]);

    component.currentStep = 0;
    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });

    expect(component.validateCurrentStep()).toBeTrue();
  });

  it('should load the category root filter configured for the general info slot', async () => {
    availableFilters.splice(
      0,
      availableFilters.length,
      {
        name: 'derivedOnly',
        label: 'Derived only',
        source: 'configured',
        children: [{ name: 'derived-value' }]
      },
      {
        name: 'deploymentModel',
        label: 'Deployment model',
        source: 'categoryRoot',
        rootName: 'Deployment Models',
        offerFormPlacement: 'categorySection'
      },
      {
        name: 'businessDomain',
        label: 'Business domain',
        source: 'categoryRoot',
        rootName: 'Business Domains',
        offerFormPlacement: 'generalInfo'
      }
    );

    const api = (component as any).api;
    spyOn(api, 'getDefaultCategories').and.returnValue(Promise.resolve([
      { id: 'business-domain-root', name: 'Business Domains' }
    ]));
    spyOn(api, 'getCategoriesByParentId').and.returnValue(Promise.resolve([
      { id: 'health', name: 'Health' }
    ]));

    await component.loadGeneralInfoCategoryFilterOptions();

    expect(component.generalInfoCategoryFilterLabel).toBe('Business domain');
    expect(component.generalInfoCategoryFilterOptions).toEqual([{ id: 'health', name: 'Health' }]);
  });

  it('should use default catalog categories directly when primary categories mode is catalogFirstLevel', async () => {
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
    const categories = [
      { id: 'cat-1', name: 'Category 1' },
      { id: 'cat-2', name: 'Category 2' }
    ];
    const api = (component as any).api;
    spyOn(api, 'getDefaultCategories').and.returnValue(Promise.resolve(categories));
    const getCategoriesByParentIdSpy = spyOn(api, 'getCategoriesByParentId');

    await component.loadCategories();

    expect(component.availableRootCategories).toEqual(categories);
    expect(getCategoriesByParentIdSpy).not.toHaveBeenCalled();
  });

  it('should use the configured primary root when primary categories mode is rooted', async () => {
    searchCategoriesConfig.primaryCategoriesMode = 'rooted';
    searchCategoriesConfig.primaryRootName = 'Service Categories';
    const api = (component as any).api;
    spyOn(api, 'getDefaultCategories').and.returnValue(Promise.resolve([
      { id: 'root-1', name: 'Service Categories' },
      { id: 'root-2', name: 'Other Root' }
    ]));
    spyOn(api, 'getCategoriesByParentId').and.returnValue(Promise.resolve([
      { id: 'compute', name: 'Compute' }
    ]));

    await component.loadCategories();

    expect(api.getCategoriesByParentId).toHaveBeenCalledOnceWith('root-1');
    expect(component.availableRootCategories).toEqual([{ id: 'compute', name: 'Compute' }]);
  });

  it('should preserve existing terms files and upload new ones when updating an offer', async () => {
    const attachmentService = TestBed.inject(AttachmentServiceService);
    const uploadSpy = spyOn(attachmentService, 'uploadFile').and.returnValue(of({ content: 'https://files.example/new-terms.pdf' }));
    const api = (component as any).api;
    const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({ id: 'offer-1' }));
    component.formType = 'update';
    component.offer = {
      id: 'offer-1',
      validFor: { startDateTime: '2026-01-01T00:00:00.000Z' },
      productOfferingPrice: [],
      productOfferingTerm: [
        { name: 'license', description: 'Old license' },
        { name: 'terms-file', description: 'https://files.example/existing-terms.pdf' },
        { name: 'procurement', description: 'manual' }
      ]
    };
    component.productOfferForm.get('generalInfo')?.patchValue({
      name: 'Updated offer',
      version: '1.0',
      status: 'Active'
    });
    component.productOfferForm.get('license')?.patchValue({ description: 'Updated license' });
    component.tcAttachments = [
      { name: 'existing-terms.pdf', url: 'https://files.example/existing-terms.pdf' } as any,
      { name: 'new-terms.pdf', file: new File(['terms'], 'new-terms.pdf', { type: 'application/pdf' }) } as any
    ];

    await component.updateOffer();

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    const offerPayload = updateSpy.calls.mostRecent().args[0] as any;
    const termsFileTerms = offerPayload.productOfferingTerm.filter((term: any) => term.name === 'terms-file');
    expect(termsFileTerms).toEqual([
      { name: 'terms-file', description: 'https://files.example/existing-terms.pdf' },
      { name: 'terms-file', description: 'https://files.example/new-terms.pdf' }
    ]);
    const licenseTerm = offerPayload.productOfferingTerm.find((term: any) => String(term?.name || '').toLowerCase() === 'license');
    expect(licenseTerm).toEqual(jasmine.objectContaining({ description: 'Updated license' }));
  });

  it('should not submit an incomplete offer', () => {
    const createSpy = spyOn(component, 'createOffer');
    component.currentStep = 4;

    component.submitForm();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.currentStep).toBe(0);
  });

  it('should submit when all required wizard steps are complete', () => {
    const createSpy = spyOn(component, 'createOffer');
    component.generalInfoCategoryFilter = {
      name: 'businessDomain',
      label: 'Business domain',
      source: 'categoryRoot',
      rootName: 'Business Domains',
      offerFormPlacement: 'generalInfo'
    };
    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });
    component.selectedGeneralInfoCategoryFilterOptionId = 'filter-option-1';
    component.selectedRootCategoryId = 'category-1';
    component.selectedPriceTier = 'free';

    component.submitForm();

    expect(createSpy).toHaveBeenCalled();
  });
});
