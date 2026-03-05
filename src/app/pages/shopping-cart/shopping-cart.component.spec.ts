import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ShoppingCartComponent } from './shopping-cart.component';
import { EventMessageService } from '../../services/event-message.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ProductOrderService } from '../../services/product-order-service.service';
import { environment } from 'src/environments/environment';

describe('ShoppingCartComponent', () => {
  let component: ShoppingCartComponent;
  let fixture: ComponentFixture<ShoppingCartComponent>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let accountSpy: jasmine.SpyObj<AccountServiceService>;
  let cartSpy: jasmine.SpyObj<ShoppingCartServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let orderServiceSpy: jasmine.SpyObj<ProductOrderService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', ['emitRemovedCartItem']);
    accountSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['getBillingAccount']);
    cartSpy = jasmine.createSpyObj<ShoppingCartServiceService>('ShoppingCartServiceService', [
      'getShoppingCart',
      'removeItemShoppingCart',
      'emptyShoppingCart',
    ]);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    orderServiceSpy = jasmine.createSpyObj<ProductOrderService>('ProductOrderService', ['postProductOrder']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-1',
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
    } as any);
    cartSpy.getShoppingCart.and.resolveTo([]);
    cartSpy.removeItemShoppingCart.and.resolveTo();
    cartSpy.emptyShoppingCart.and.resolveTo();
    accountSpy.getBillingAccount.and.resolveTo([]);
    orderServiceSpy.postProductOrder.and.returnValue(
      of(new HttpResponse({ headers: new HttpHeaders(), body: {} })) as any,
    );

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ShoppingCartComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: ApiServiceService, useValue: {} },
        { provide: AccountServiceService, useValue: accountSpy },
        { provide: ShoppingCartServiceService, useValue: cartSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: ProductOrderService, useValue: orderServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingCartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set party, load cart and billing accounts', async () => {
    accountSpy.getBillingAccount.and.resolveTo([
      {
        id: 'ba-1',
        href: '/billing/ba-1',
        name: 'Main billing',
        contact: [
          {
            contactMedium: [
              { mediumType: 'Email', characteristic: { emailAddress: 'bill@example.com' } },
              {
                mediumType: 'PostalAddress',
                characteristic: {
                  city: 'Madrid',
                  country: 'ES',
                  postCode: '28001',
                  stateOrProvince: 'MD',
                  street1: 'Street 1',
                },
              },
              { mediumType: 'TelephoneNumber', characteristic: { phoneNumber: '+34', contactType: 'mobile' } },
            ],
          },
        ],
      },
    ] as any);
    cartSpy.getShoppingCart.and.resolveTo([
      { id: 'prod-1', options: { pricing: { priceType: 'oneTime', price: { value: 20, unit: 'EUR' } } } },
    ] as any);
    spyOn(component, 'getTotalPrice');

    component.ngOnInit();
    await flushPromises();

    expect(component.relatedParty).toBe('party-1');
    expect(cartSpy.getShoppingCart).toHaveBeenCalled();
    expect(component.items.length).toBe(1);
    expect(component.getTotalPrice).toHaveBeenCalled();
    expect(component.billing_accounts.length).toBe(1);
    expect(component.selectedBilling.id).toBe('ba-1');
    expect(component.loading).toBeFalse();
  });

  it('ngOnInit should use organization party id when logged as organization', async () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      partyId: 'party-1',
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
    } as any);

    component.ngOnInit();
    await flushPromises();

    expect(component.relatedParty).toBe('party-org');
  });

  it('getPrice should build recurring and usage labels', () => {
    const recurring = component.getPrice({
      options: {
        pricing: {
          priceType: 'recurring',
          price: { value: 10, unit: 'EUR' },
          recurringChargePeriodType: 'month',
        },
      },
    });
    expect(recurring).toEqual({
      priceType: 'recurring',
      price: 10,
      unit: 'EUR',
      text: 'month',
    });

    const usage = component.getPrice({
      options: {
        pricing: {
          priceType: 'usage',
          price: { value: 1, unit: 'EUR' },
          unitOfMeasure: { units: 'GB' },
        },
      },
    });
    expect(usage.text).toBe('/ GB');
  });

  it('getTotalPrice should aggregate matching prices', () => {
    component.items = [
      { options: { pricing: { priceType: 'oneTime', price: { value: 10, unit: 'EUR' } } } },
      { options: { pricing: { priceType: 'oneTime', price: { value: 7, unit: 'EUR' } } } },
      { options: { pricing: { priceType: 'usage', price: { value: 3, unit: 'EUR' }, unitOfMeasure: { units: 'GB' } } } },
    ] as any;

    component.getTotalPrice();

    expect(component.totalPrice.length).toBe(2);
    expect(component.totalPrice[0].price).toBe(17);
    expect(component.totalPrice[1].text).toBe('/ GB');
  });

  it('selectBill should toggle selected billing account', () => {
    component.billing_accounts = [
      { id: 'ba-1', selected: true } as any,
      { id: 'ba-2', selected: false } as any,
    ];
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.selectBill(1);

    expect(component.billing_accounts[0].selected).toBeFalse();
    expect(component.billing_accounts[1].selected).toBeTrue();
    expect(component.selectedBilling.id).toBe('ba-2');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('deleteProduct should remove cart item and emit event', async () => {
    const product = { id: 'prod-1' } as any;

    await component.deleteProduct(product);

    expect(cartSpy.removeItemShoppingCart).toHaveBeenCalledWith('prod-1');
    expect(eventMessageSpy.emitRemovedCartItem).toHaveBeenCalledWith(product);
  });

  it('clickDropdown should toggle hidden class', () => {
    const elem = document.createElement('div');
    elem.id = 'drop-test';
    elem.className = 'hidden other';
    document.body.appendChild(elem);

    component.clickDropdown('drop-test');
    expect(elem.className.includes('hidden')).toBeFalse();

    component.clickDropdown('drop-test');
    expect(elem.className.includes('hidden')).toBeTrue();

    document.body.removeChild(elem);
  });

  it('buildProductCharacteristics should map values and handle undefined', () => {
    expect((component as any).buildProductCharacteristics(undefined)).toEqual([]);

    const mapped = (component as any).buildProductCharacteristics([
      {
        characteristic: { name: 'capacity', valueType: 'number' },
        value: { value: 20 },
      },
    ]);

    expect(mapped).toEqual([
      { name: 'capacity', value: 20, valueType: 'number' },
    ]);
  });

  it('buildProductPayload should include selected price and characteristics', () => {
    const payload = (component as any).buildProductPayload({
      id: 'offer-1',
      options: {
        pricing: { id: 'pop-1', href: 'pop-1' },
        characteristics: [
          {
            characteristic: { name: 'range', valueType: 'number' },
            value: { value: 50 },
          },
        ],
      },
    });

    expect(payload.id).toBe('offer-1');
    expect(payload.itemTotalPrice[0].productOfferingPrice.id).toBe('pop-1');
    expect(payload.product.productCharacteristic[0]).toEqual({
      name: 'range',
      value: 50,
      valueType: 'number',
    });
  });

  it('buildProductOrder should include billing and buyer party data', () => {
    component.relatedParty = 'party-1';
    component.selectedBilling = { id: 'ba-1', email: 'bill@example.com' };

    const order = (component as any).buildProductOrder([{ id: 'offer-1' }]);

    expect(order.productOrderItem).toEqual([{ id: 'offer-1' }]);
    expect(order.relatedParty[0]).toEqual({
      id: 'party-1',
      href: 'party-1',
      role: environment.BUYER_ROLE,
    });
    expect(order.billingAccount.id).toBe('ba-1');
    expect(order.notificationContact).toBe('bill@example.com');
  });

  it('orderProduct should post order, empty cart and navigate to inventory', async () => {
    component.items = [
      {
        id: 'offer-1',
        options: {
          pricing: { id: 'pop-1', href: 'pop-1' },
          characteristics: [],
        },
      },
    ] as any;
    component.relatedParty = 'party-1';
    component.selectedBilling = { id: 'ba-1', email: 'bill@example.com' };
    spyOn<any>(component, 'emptyShoppingCart').and.resolveTo();
    spyOn(component, 'goToInventory');

    await component.orderProduct();

    expect(orderServiceSpy.postProductOrder).toHaveBeenCalled();
    expect((component as any).emptyShoppingCart).toHaveBeenCalled();
    expect(component.goToInventory).toHaveBeenCalled();
  });

  it('orderProduct should handle post failures', async () => {
    orderServiceSpy.postProductOrder.and.returnValue(
      throwError(() => new Error('Order failed')),
    );
    component.items = [
      {
        id: 'offer-1',
        options: { pricing: { id: 'pop-1', href: 'pop-1' }, characteristics: [] },
      },
    ] as any;
    component.relatedParty = 'party-1';
    component.selectedBilling = { id: 'ba-1', email: 'bill@example.com' };
    spyOn(console, 'error');
    spyOn<any>(component, 'emptyShoppingCart').and.resolveTo();

    await component.orderProduct();

    expect(console.error).toHaveBeenCalled();
    expect((component as any).emptyShoppingCart).not.toHaveBeenCalled();
  });

  it('goTo and goToInventory should navigate to expected routes', () => {
    component.goTo('/search');
    component.goToInventory();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search']);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/product-orders']);
  });
});
