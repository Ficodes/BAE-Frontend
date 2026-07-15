import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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
