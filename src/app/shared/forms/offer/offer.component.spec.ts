import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { OfferComponent } from './offer.component';
import { availableFilters, searchCategoriesConfig } from 'src/app/data/availableFilters';

describe('OfferComponent', () => {
  let component: OfferComponent;
  let fixture: ComponentFixture<OfferComponent>;

  beforeEach(async () => {
    availableFilters.splice(0, availableFilters.length);
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
    searchCategoriesConfig.primaryRootName = '';

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [OfferComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OfferComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
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
