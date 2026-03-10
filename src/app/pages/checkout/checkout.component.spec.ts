import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { CheckoutComponent } from './checkout.component';
import { LocalStorageService } from '../../services/local-storage.service';
import { AccountServiceService } from '../../services/account-service.service';
import { ProductOrderService } from '../../services/product-order-service.service';
import { EventMessageService } from '../../services/event-message.service';
import { PriceServiceService } from '../../services/price-service.service';
import { ShoppingCartServiceService } from '../../services/shopping-cart-service.service';
import { PaymentService } from 'src/app/services/payment.service';
import { ApiServiceService } from '../../services/product-service.service';
import { environment } from '../../../environments/environment';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let accountSpy: jasmine.SpyObj<AccountServiceService>;
  let orderServiceSpy: jasmine.SpyObj<ProductOrderService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let cartServiceSpy: jasmine.SpyObj<ShoppingCartServiceService>;
  let paymentServiceSpy: jasmine.SpyObj<PaymentService>;
  let apiServiceSpy: jasmine.SpyObj<ApiServiceService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let messages$: Subject<any>;
  let paramMapGetSpy: jasmine.Spy;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    accountSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['getBillingAccount']);
    orderServiceSpy = jasmine.createSpyObj<ProductOrderService>('ProductOrderService', ['postProductOrder']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', ['emitRemovedCartItem']);
    cartServiceSpy = jasmine.createSpyObj<ShoppingCartServiceService>('ShoppingCartServiceService', [
      'getShoppingCart',
      'emptyShoppingCart',
      'removeItemShoppingCart',
      'addItemShoppingCart',
    ]);
    paymentServiceSpy = jasmine.createSpyObj<PaymentService>('PaymentService', ['completePayment']);
    apiServiceSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getProductById',
      'getProductSpecification',
      'getOfferingPrice',
    ]);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    messages$ = new Subject<any>();
    (eventMessageSpy as any).messages$ = messages$.asObservable();

    paramMapGetSpy = jasmine.createSpy('paramMap.get').and.returnValue(null);

    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      user: 'user',
      email: 'user@example.com',
      token: 'token',
      expire: 9999999999,
      partyId: 'party-1',
      username: 'username',
      roles: [],
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
      logged_as: 'user-1',
    } as any);

    accountSpy.getBillingAccount.and.resolveTo([]);
    cartServiceSpy.getShoppingCart.and.resolveTo([]);
    cartServiceSpy.emptyShoppingCart.and.resolveTo();
    cartServiceSpy.removeItemShoppingCart.and.resolveTo();
    cartServiceSpy.addItemShoppingCart.and.resolveTo();
    paymentServiceSpy.completePayment.and.returnValue(of({ status: 200 } as any));
    apiServiceSpy.getOfferingPrice.and.resolveTo({});

    await TestBed.configureTestingModule({
      declarations: [CheckoutComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: AccountServiceService, useValue: accountSpy },
        { provide: ProductOrderService, useValue: orderServiceSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: PriceServiceService, useValue: jasmine.createSpyObj<PriceServiceService>('PriceServiceService', ['calculatePrice']) },
        { provide: ShoppingCartServiceService, useValue: cartServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: ApiServiceService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {},
              paramMap: { get: paramMapGetSpy },
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    messages$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getPrice should return recurring pricing details and handle custom pricing', () => {
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

    const custom = component.getPrice({
      options: {
        pricing: { priceType: 'custom' },
      },
    });
    expect(custom).toBeNull();
    expect(component.check_custom).toBeTrue();
  });

  it('getTotalPrice should aggregate equal pricing entries', () => {
    spyOn((component as any).cdr, 'detectChanges');
    component.items = [
      { options: { pricing: { priceType: 'oneTime', price: { value: 10, unit: 'EUR' } } } },
      { options: { pricing: { priceType: 'oneTime', price: { value: 15, unit: 'EUR' } } } },
      { options: { pricing: { priceType: 'usage', price: { value: 3, unit: 'EUR' }, unitOfMeasure: { units: 'GB' } } } },
    ] as any;

    component.getTotalPrice();

    expect(component.totalPrice.length).toBe(2);
    expect(component.totalPrice[0].price).toBe(25);
    expect(component.totalPrice[1]).toEqual({
      priceType: 'usage',
      price: 3,
      unit: 'EUR',
      text: '/ GB',
    });
  });

  it('onClick should close billing form and request change detection when open', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.addBill = true;

    component.onClick();

    expect(component.addBill).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('createProductOrder should include buyer, billing account and optional note', () => {
    component.relatedParty = 'party-1';
    component.selectedBillingAddress = { id: 'bill-1', email: 'buyer@example.com' } as any;
    component.orderNote = 'Urgent order';

    const result = (component as any).createProductOrder([{ id: 'prod-item' }]);

    expect(result.productOrderItem).toEqual([{ id: 'prod-item' }]);
    expect(result.relatedParty[0].id).toBe('party-1');
    expect(result.relatedParty[0].role).toBe(environment.BUYER_ROLE);
    expect(result.billingAccount.id).toBe('bill-1');
    expect(result.notificationContact).toBe('buyer@example.com');
    expect(result.note[0].text).toBe('Urgent order');
  });

  it('groupItemsByOwner should keep only items from selected seller', () => {
    component.items = [
      { id: 'one', relatedParty: [{ role: environment.SELLER_ROLE, id: 'seller-a' }] },
      { id: 'two', relatedParty: [{ role: environment.SELLER_ROLE, id: 'seller-b' }] },
    ] as any;

    component.groupItemsByOwner('seller-b');

    expect(component.items).toEqual([{ id: 'two', relatedParty: [{ role: environment.SELLER_ROLE, id: 'seller-b' }] } as any]);
  });

  it('initCheckoutData should set contact and relatedParty from login and load cart', async () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      user: 'user',
      email: 'user@example.com',
      token: 'token',
      expire: 9999999999,
      partyId: 'party-1',
      username: 'username',
      roles: [],
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
      logged_as: 'user-1',
    } as any);
    cartServiceSpy.getShoppingCart.and.resolveTo([{ id: 'prod-1', options: { pricing: [] } }] as any);
    spyOn(component, 'getBilling').and.resolveTo();
    spyOn(component, 'getTotalPrice');

    await component.initCheckoutData();

    expect(component.contact.email).toBe('user@example.com');
    expect(component.contact.username).toBe('username');
    expect(component.relatedParty).toBe('party-1');
    expect(component.items.length).toBe(1);
    expect(component.getBilling).toHaveBeenCalled();
    expect(component.getTotalPrice).toHaveBeenCalled();
  });

  it('initCheckoutData should use organization party when logged_as is organization', async () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      user: 'user',
      email: 'user@example.com',
      token: 'token',
      expire: 9999999999,
      partyId: 'party-1',
      username: 'username',
      roles: [],
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
      logged_as: 'org-1',
    } as any);
    spyOn(component, 'getBilling').and.resolveTo();

    await component.initCheckoutData();

    expect(component.relatedParty).toBe('party-org');
  });

  it('getBilling should map accounts and select preferred address', async () => {
    accountSpy.getBillingAccount.and.resolveTo([
      {
        id: 'ba-1',
        href: '/billing/ba-1',
        name: 'Main billing',
        contact: [
          {
            contactMedium: [
              { mediumType: 'Email', preferred: true, characteristic: { emailAddress: 'bill@example.com' } },
              { mediumType: 'PostalAddress', characteristic: { city: 'Madrid', country: 'ES', postCode: '28001', stateOrProvince: 'MD', street1: 'Street 1' } },
              { mediumType: 'TelephoneNumber', characteristic: { phoneNumber: '+34', contactType: 'mobile' } },
            ],
          },
        ],
      },
    ] as any);

    await component.getBilling();

    expect(component.billingAddresses.length).toBe(1);
    expect(component.selectedBillingAddress.id).toBe('ba-1');
    expect(component.validBillAddr).toBeTrue();
    expect(component.preferred).toBeFalse();
  });

  it('deleteProduct should remove item, emit event and refresh cart', async () => {
    cartServiceSpy.getShoppingCart.and.resolveTo([]);
    spyOn(component, 'getTotalPrice');
    const product = { id: 'prod-1' } as any;

    await component.deleteProduct(product);
    await flushPromises();

    expect(cartServiceSpy.removeItemShoppingCart).toHaveBeenCalledWith('prod-1');
    expect(eventMessageSpy.emitRemovedCartItem).toHaveBeenCalledWith(product);
    expect(component.getTotalPrice).toHaveBeenCalled();
  });

  it('orderProduct should post order and navigate when no redirect header is returned', async () => {
    spyOn((component as any).cdr, 'detectChanges');
    orderServiceSpy.postProductOrder.and.returnValue(
      of(new HttpResponse({ headers: new HttpHeaders() })) as any,
    );
    spyOn<any>(component, 'emptyShoppingCart').and.resolveTo();
    spyOn(component, 'goToInventory');
    component.items = [
      { id: 'offer-1', options: { pricing: [{ id: 'pop-1' }], characteristics: [{ name: 'size', value: 1 }] } },
    ] as any;
    component.relatedParty = 'party-1';
    component.selectedBillingAddress = { id: 'ba-1', email: 'bill@example.com' } as any;

    await component.orderProduct();

    expect(orderServiceSpy.postProductOrder).toHaveBeenCalled();
    expect((component as any).emptyShoppingCart).toHaveBeenCalled();
    expect(component.goToInventory).toHaveBeenCalled();
    expect(component.loading_purchase).toBeFalse();
  });

  it('orderProduct should surface API error message', async () => {
    spyOn((component as any).cdr, 'detectChanges');
    orderServiceSpy.postProductOrder.and.returnValue(
      throwError(() => ({ error: { error: 'Boom' } })),
    );
    component.items = [
      { id: 'offer-1', options: { pricing: [{ id: 'pop-1' }], characteristics: [] } },
    ] as any;
    component.relatedParty = 'party-1';
    component.selectedBillingAddress = { id: 'ba-1', email: 'bill@example.com' } as any;

    await component.orderProduct();

    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toContain('Boom');
    expect(component.loading_purchase).toBeFalse();
  });

  it('handleError should show error and auto-hide after timeout', fakeAsync(() => {
    (component as any).handleError({ error: { error: 'Invalid data' } }, 'fallback');

    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: Invalid data');

    tick(3000);
    expect(component.showError).toBeFalse();
  }));

  it('goToInventory and goToProdDetails should navigate to expected routes', () => {
    component.goToInventory();
    component.goToProdDetails({ id: 'prod-9' } as any);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/product-orders']);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search/', 'prod-9']);
  });

  it('hasLongWord should respect threshold and undefined strings', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('thiswordiswaytoolong', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
