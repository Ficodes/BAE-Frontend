import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { OfferComponent } from './offer.component';

describe('OfferComponent', () => {
  let component: OfferComponent;
  let fixture: ComponentFixture<OfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [OfferComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OfferComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should block forward navigation when the current required step is incomplete', () => {
    component.currentStep = 0;

    expect(component.canNavigate(1)).toBeFalse();

    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });
    component.selectedSectorId = 'sector-1';

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

  it('should not submit an incomplete offer', () => {
    const createSpy = spyOn(component, 'createOffer');
    component.currentStep = 4;

    component.submitForm();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.currentStep).toBe(0);
  });

  it('should submit when all required wizard steps are complete', () => {
    const createSpy = spyOn(component, 'createOffer');
    component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
    component.productOfferForm.patchValue({ prodSpec: { id: 'prod-spec-1' } });
    component.selectedSectorId = 'sector-1';
    component.selectedRootCategoryId = 'category-1';
    component.selectedPriceTier = 'free';

    component.submitForm();

    expect(createSpy).toHaveBeenCalled();
  });
});
