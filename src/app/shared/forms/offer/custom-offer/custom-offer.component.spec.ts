import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ApiServiceService } from '../../../../services/product-service.service';
import { EventMessageService } from '../../../../services/event-message.service';
import { QuoteService } from '../../../../features/quotes/services/quote.service';
import { CustomOfferComponent } from './custom-offer.component';

describe('CustomOfferComponent', () => {
  let component: CustomOfferComponent;
  let api: jasmine.SpyObj<ApiServiceService>;

  function pricePlan(name = 'Online paid plan'): any {
    return {
      name,
      description: 'Quote price plan',
      lifecycleStatus: 'Active',
      currency: 'EUR',
      priceComponents: [{
        name: 'One time component',
        description: 'One time payment',
        priceType: 'one time',
        price: 10
      }]
    };
  }

  beforeEach(() => {
    jasmine.clock().install();
    spyOn(console, 'log');
    spyOn(console, 'error');
    api = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'postOfferingPrice', 'postProductOffering'
    ]);
    api.postOfferingPrice.and.callFake((price: any) => of({
      id: price.priceType === 'discount' ? 'discount-1' : price.isBundle ? 'plan-1' : 'component-1',
      name: price.name
    }));
    api.postProductOffering.and.returnValue(of({ id: 'offer-1' }));
    const eventMessage = jasmine.createSpyObj<EventMessageService>('EventMessageService', ['emitSellerOffer']);
    component = new CustomOfferComponent(api, eventMessage, new FormBuilder(), {} as QuoteService);
    component.offer = {
      name: 'Quoted offering',
      description: 'Quote description',
      version: '1',
      category: [],
      productSpecification: { id: 'spec-1' },
      productOfferingTerm: []
    };
    component.productOfferForm.patchValue({
      partyInfo: { id: 'buyer-1' },
      pricePlans: [pricePlan()]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('creates a non-bundled component and a bundled plan before saving the offer', async () => {
    await component.createOffer();

    expect(api.postOfferingPrice).toHaveBeenCalledTimes(2);
    expect(api.postOfferingPrice.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      isBundle: false,
      priceType: 'one time',
      price: { value: 10, unit: 'EUR' }
    }));
    expect(api.postOfferingPrice.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      isBundle: true,
      bundledPopRelationship: [{ id: 'component-1', href: 'component-1', name: 'One time component' }]
    }));
    expect(api.postProductOffering).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      productOfferingPrice: [{ id: 'plan-1', href: 'plan-1' }]
    }), null);
    expect(component.loading).toBeFalse();
  });

  it('creates non-bundled discounts before their price components', async () => {
    const plan = pricePlan();
    Object.assign(plan.priceComponents[0], {
      discountValue: 10,
      discountUnit: 'percentage',
      discountDuration: 1,
      discountDurationUnit: 'days'
    });
    component.productOfferForm.patchValue({ pricePlans: [plan] });

    await component.createOffer();

    expect(api.postOfferingPrice).toHaveBeenCalledTimes(3);
    expect(api.postOfferingPrice.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      isBundle: false, priceType: 'discount', percentage: 10
    }));
    expect(api.postOfferingPrice.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      isBundle: false,
      popRelationship: [{ id: 'discount-1', href: 'discount-1', name: 'discount' }]
    }));
    expect(api.postProductOffering).toHaveBeenCalledTimes(1);
  });

  it('recovers from a component 400 and displays the backend message', async () => {
    api.postOfferingPrice.and.returnValue(throwError(() => ({
      status: 400, error: { message: 'Invalid price component' }
    })));

    await component.createOffer();

    expect(api.postOfferingPrice).toHaveBeenCalledTimes(1);
    expect(api.postProductOffering).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: Invalid price component');
    jasmine.clock().tick(3000);
    expect(component.showError).toBeFalse();
  });

  it('recovers from a plan 422 after its component was created', async () => {
    const message = 'The price plan can only contain price components with isBundle set to false';
    api.postOfferingPrice.and.returnValues(
      of({ id: 'component-1', name: 'One time component' }),
      throwError(() => ({ status: 422, error: { error: message } }))
    );

    await component.createOffer();

    expect(api.postOfferingPrice).toHaveBeenCalledTimes(2);
    expect(api.postProductOffering).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: ' + message);
  });

  it('stops processing later plans when an earlier plan fails', async () => {
    component.productOfferForm.patchValue({
      pricePlans: [pricePlan('First plan'), pricePlan('Second plan')]
    });
    api.postOfferingPrice.and.returnValues(
      of({ id: 'component-1', name: 'One time component' }),
      throwError(() => ({ status: 422, error: { error: 'Invalid first plan' } }))
    );

    await component.createOffer();

    expect(api.postOfferingPrice).toHaveBeenCalledTimes(2);
    expect(api.postProductOffering).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('shows a fallback message when the error has no response body', async () => {
    api.postOfferingPrice.and.returnValue(throwError(() => ({ status: 0 })));

    await component.createOffer();

    expect(component.loading).toBeFalse();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error creating offer price!');
    expect(api.postProductOffering).not.toHaveBeenCalled();
  });

  it('clears the previous error when retrying a successful submission', async () => {
    component.showError = true;

    await component.createOffer();

    expect(component.showError).toBeFalse();
    expect(component.loading).toBeFalse();
    expect(api.postProductOffering).toHaveBeenCalledTimes(1);
  });

  it('creates a Free offer without posting prices', async () => {
    component.productOfferForm.patchValue({ pricePlans: [] });

    await component.createOffer();

    expect(api.postOfferingPrice).not.toHaveBeenCalled();
    expect(api.postProductOffering).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      productOfferingPrice: []
    }), null);
    expect(component.loading).toBeFalse();
  });
});
