import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Location } from '@angular/common';

import { ProductDetailsComponent } from './product-details.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { environment } from 'src/environments/environment';

describe('ProductDetailsComponent', () => {
  let component: ProductDetailsComponent;
  let fixture: ComponentFixture<ProductDetailsComponent>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let priceSpy: jasmine.SpyObj<PriceServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let cartSpy: jasmine.SpyObj<ShoppingCartServiceService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let accountSpy: jasmine.SpyObj<AccountServiceService>;
  let usageSpy: jasmine.SpyObj<UsageServiceService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let locationSpy: jasmine.SpyObj<Location>;
  let messages$: Subject<any>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getProductById',
      'getProductSpecification',
      'getProductPrice',
      'getOfferingPrice',
      'getServiceSpec',
      'getResourceSpec',
      'getComplianceLevel',
    ]);
    priceSpy = jasmine.createSpyObj<PriceServiceService>('PriceServiceService', ['calculatePrice']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    cartSpy = jasmine.createSpyObj<ShoppingCartServiceService>('ShoppingCartServiceService', [
      'addItemShoppingCart',
      'removeItemShoppingCart',
      'getShoppingCart',
    ]);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', [
      'emitAddedCartItem',
      'emitRemovedCartItem',
    ]);
    accountSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['getOrgInfo']);
    usageSpy = jasmine.createSpyObj<UsageServiceService>('UsageServiceService', ['getUsageSpec']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    locationSpy = jasmine.createSpyObj<Location>('Location', ['back']);

    messages$ = new Subject<any>();
    (eventMessageSpy as any).messages$ = messages$.asObservable();

    localStorageSpy.getObject.and.returnValue({} as any);
    apiSpy.getComplianceLevel.and.returnValue('NL');
    cartSpy.addItemShoppingCart.and.resolveTo();
    cartSpy.removeItemShoppingCart.and.resolveTo();
    cartSpy.getShoppingCart.and.resolveTo([]);
    accountSpy.getOrgInfo.and.resolveTo({ id: 'org-1', tradingName: 'Org One' } as any);
    usageSpy.getUsageSpec.and.resolveTo({ id: 'usage-1', description: 'Usage spec description' });

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ProductDetailsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: PriceServiceService, useValue: priceSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: ShoppingCartServiceService, useValue: cartSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: AccountServiceService, useValue: accountSpy },
        { provide: UsageServiceService, useValue: usageSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: jasmine.createSpy('paramMap.get').and.returnValue('prod-1') },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    messages$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggleQuoteModal should open quote modal', () => {
    component.showQuoteModal = false;

    component.toggleQuoteModal();

    expect(component.showQuoteModal).toBeTrue();
  });

  it('getComplianceDescription should return text by level', () => {
    component.complianceLevel = 'NL';
    expect(component.getComplianceDescription()).toContain("hasn't reached any compliance level");

    component.complianceLevel = 'BL';
    expect(component.getComplianceDescription()).toContain('self attestation');

    component.complianceLevel = 'P';
    expect(component.getComplianceDescription()).toContain('Professional level');

    component.complianceLevel = 'PP';
    expect(component.getComplianceDescription()).toContain('CNDCP');

    component.complianceLevel = 'UNKNOWN';
    expect(component.getComplianceDescription()).toBe('');
  });

  it('toggleCartSelection should add directly to cart when no extra selections are needed', () => {
    component.productOff = {
      id: 'prod-1',
      productOfferingPrice: [{ id: 'price-1', priceType: 'oneTime' }],
      productOfferingTerm: [],
    } as any;
    component.prodSpec = {
      productSpecCharacteristic: [
        {
          name: 'capacity',
          productSpecCharacteristicValue: [{ isDefault: true, value: '10' }],
        },
      ],
    } as any;
    spyOn(component, 'addProductToCart').and.stub();

    component.toggleCartSelection();

    expect(component.selected_price.id).toBe('price-1');
    expect(component.selected_chars.length).toBe(1);
    expect(component.cartSelection).toBeFalse();
    expect(component.addProductToCart).toHaveBeenCalledWith(component.productOff as any, false);
  });

  it('toggleCartSelection should open selector when multiple options exist', () => {
    component.productOff = {
      id: 'prod-1',
      productOfferingPrice: [{ id: 'price-1' }, { id: 'price-2' }],
      productOfferingTerm: [{ name: 'License' }],
    } as any;
    component.prodSpec = {
      productSpecCharacteristic: [
        {
          name: 'capacity',
          productSpecCharacteristicValue: [
            { isDefault: true, value: '10' },
            { isDefault: false, value: '20' },
          ],
        },
      ],
    } as any;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    spyOn(component, 'addProductToCart').and.stub();

    component.toggleCartSelection();

    expect(component.check_prices).toBeTrue();
    expect(component.check_char).toBeTrue();
    expect(component.check_terms).toBeTrue();
    expect(component.cartSelection).toBeTrue();
    expect(component.addProductToCart).not.toHaveBeenCalled();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('addProductToCart should skip when product has no prices', async () => {
    await component.addProductToCart(undefined, true);
    await component.addProductToCart({ id: 'prod-1' } as any, true);

    expect(cartSpy.addItemShoppingCart).not.toHaveBeenCalled();
    expect(eventMessageSpy.emitAddedCartItem).not.toHaveBeenCalled();
  });

  it('addProductToCart should add item, emit event and reset selection state', async () => {
    component.images = [{ url: 'https://example.com/image.png' }] as any;
    component.selected_chars = [{ characteristic: { name: 'capacity' }, value: { value: 10 } }] as any;
    component.selected_price = { id: 'price-1' };
    component.selected_terms = true;
    component.cartSelection = true;
    const product = {
      id: 'prod-1',
      name: 'Product One',
      href: 'urn:product:1',
      productOfferingPrice: [{ id: 'price-1' }],
    } as any;
    spyOn<any>(component, 'showToast').and.callFake(() => {});
    spyOn<any>(component, 'resetSelections').and.callThrough();
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    await component.addProductToCart(product, true);

    expect(cartSpy.addItemShoppingCart).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: 'prod-1',
        image: 'https://example.com/image.png',
        termsAccepted: true,
      }),
    );
    expect(eventMessageSpy.emitAddedCartItem).toHaveBeenCalledWith(product);
    expect((component as any).showToast).toHaveBeenCalled();
    expect((component as any).resetSelections).toHaveBeenCalled();
    expect(component.cartSelection).toBeFalse();
    expect(component.selected_chars).toEqual([]);
    expect(component.selected_terms).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('addProductToCart should expose service error message', fakeAsync(() => {
    cartSpy.addItemShoppingCart.and.returnValue(Promise.reject({ error: { error: 'Boom' } }));
    const product = {
      id: 'prod-1',
      name: 'Product One',
      href: 'urn:product:1',
      productOfferingPrice: [{ id: 'price-1' }],
    } as any;
    spyOn<any>(component, 'showToast').and.callFake(() => {});

    component.addProductToCart(product, false);
    flushMicrotasks();

    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: Boom');
    expect((component as any).showToast).not.toHaveBeenCalled();
    expect(eventMessageSpy.emitAddedCartItem).not.toHaveBeenCalled();

    tick(3000);
    expect(component.showError).toBeFalse();
  }));

  it('hideCartSelection should reset selection state', () => {
    component.cartSelection = true;
    component.check_char = true;
    component.check_terms = true;
    component.check_prices = true;
    component.selected_chars = [{ characteristic: {}, value: {} }] as any;
    component.selected_price = { id: 'p1' };
    component.selected_terms = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.hideCartSelection();

    expect(component.cartSelection).toBeFalse();
    expect(component.check_char).toBeFalse();
    expect(component.check_terms).toBeFalse();
    expect(component.check_prices).toBeFalse();
    expect(component.selected_chars).toEqual([]);
    expect(component.selected_price).toEqual({});
    expect(component.selected_terms).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('deleteProduct should remove from cart and emit removed event', async () => {
    component.toastVisibility = true;
    const product = { id: 'prod-1' } as any;

    await component.deleteProduct(product);

    expect(cartSpy.removeItemShoppingCart).toHaveBeenCalledWith('prod-1');
    expect(eventMessageSpy.emitRemovedCartItem).toHaveBeenCalledWith(product);
    expect(component.toastVisibility).toBeFalse();
  });

  it('deleteProduct should only clear toast when product is undefined', async () => {
    component.toastVisibility = true;

    await component.deleteProduct(undefined);

    expect(cartSpy.removeItemShoppingCart).not.toHaveBeenCalled();
    expect(eventMessageSpy.emitRemovedCartItem).not.toHaveBeenCalled();
    expect(component.toastVisibility).toBeFalse();
  });

  it('goTo and back should delegate navigation to router/location', () => {
    component.goTo('/search');
    component.back();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search']);
    expect(locationSpy.back).toHaveBeenCalled();
  });

  it('openDrawer and closeDrawer should toggle drawer state', () => {
    component.isDrawerOpen = false;

    component.openDrawer();
    expect(component.isDrawerOpen).toBeTrue();

    component.closeDrawer();
    expect(component.isDrawerOpen).toBeFalse();
  });

  it('getProductImage should return first image url or placeholder', () => {
    component.images = [{ url: 'https://example.com/image.png' }] as any;
    expect(component.getProductImage()).toBe('https://example.com/image.png');

    component.images = [];
    expect(component.getProductImage()).toBe('https://placehold.co/600x400/svg');
  });

  it('toggleTermsReadMore should switch clamp class based on expanded state', () => {
    const removeSpy = jasmine.createSpy('remove');
    const addSpy = jasmine.createSpy('add');
    component.termsTextRef = {
      nativeElement: { classList: { remove: removeSpy, add: addSpy } },
    } as any;

    component.showTermsMore = false;
    component.toggleTermsReadMore();
    expect(component.showTermsMore).toBeTrue();
    expect(removeSpy).toHaveBeenCalledWith('line-clamp-5');

    component.toggleTermsReadMore();
    expect(component.showTermsMore).toBeFalse();
    expect(addSpy).toHaveBeenCalledWith('line-clamp-5');
  });

  it('checkOverflow should update read-more visibility', () => {
    component.termsTextRef = {
      nativeElement: { scrollHeight: 120, clientHeight: 80 },
    } as any;
    component.checkOverflow();
    expect(component.showReadMoreButton).toBeTrue();

    component.termsTextRef = {
      nativeElement: { scrollHeight: 80, clientHeight: 120 },
    } as any;
    component.checkOverflow();
    expect(component.showReadMoreButton).toBeFalse();
  });

  it('getOwner should fetch organization details for seller related party', async () => {
    component.prodSpec = {
      relatedParty: [
        { role: environment.SELLER_ROLE, id: 'urn:ngsi-ld:organization:provider-1' },
        { role: 'buyer', id: 'urn:ngsi-ld:party:buyer-1' },
      ],
    } as any;

    component.getOwner();
    await flushPromises();

    expect(accountSpy.getOrgInfo).toHaveBeenCalledWith('urn:ngsi-ld:organization:provider-1');
    expect(component.orgInfo).toEqual({ id: 'org-1', tradingName: 'Org One' } as any);
  });

  it('goToOrgDetails should navigate to organization details page', () => {
    component.goToOrgDetails('org-42');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/org-details', 'org-42']);
  });

  it('updateTabs should ignore scroll events during manual scroll', () => {
    (component as any).isManualScroll = true;
    spyOn(component, 'goToDetails');
    spyOn(component, 'goToChars');
    spyOn(component, 'goToAttach');
    spyOn(component, 'goToAgreements');
    spyOn(component, 'goToRelationships');

    component.updateTabs({});

    expect(component.goToDetails).not.toHaveBeenCalled();
    expect(component.goToChars).not.toHaveBeenCalled();
    expect(component.goToAttach).not.toHaveBeenCalled();
    expect(component.goToAgreements).not.toHaveBeenCalled();
    expect(component.goToRelationships).not.toHaveBeenCalled();
  });

  it('loadUsageMetrics should collect linked metrics and deduplicate by usageSpecId + metric name', async () => {
    apiSpy.getOfferingPrice.and.callFake(async (id: string) => {
      if (id === 'price-comp-1') {
        return {
          usageSpecId: 'usage-1',
          unitOfMeasure: { units: 'RAM_gb_hour' },
          description: 'Fallback RAM description',
        };
      }
      return {
        usageSpecId: 'usage-2',
        unitOfMeasure: { units: 'CPU_core_hour' },
        description: 'Fallback CPU description',
      };
    });
    usageSpy.getUsageSpec.and.callFake(async (id: string) => {
      if (id === 'usage-1') {
        return { id: 'usage-1', description: 'RAM metric description' };
      }
      return { id: 'usage-2', description: 'CPU metric description' };
    });

    await component.loadUsageMetrics([
      {
        bundledPopRelationship: [{ id: 'price-comp-1' }, { id: 'price-comp-2' }, { id: 'price-comp-1' }],
      },
    ]);

    expect(component.usageMetrics.length).toBe(2);
    expect(component.usageMetrics).toContain(jasmine.objectContaining({
      usageSpecId: 'usage-1',
      name: 'RAM_gb_hour',
      description: 'RAM metric description',
    }));
    expect(component.usageMetrics).toContain(jasmine.objectContaining({
      usageSpecId: 'usage-2',
      name: 'CPU_core_hour',
      description: 'CPU metric description',
    }));
    expect(usageSpy.getUsageSpec).toHaveBeenCalledTimes(2);
  });

  it('loadUsageMetrics should fallback to product offering price description when usage spec cannot be loaded', async () => {
    usageSpy.getUsageSpec.and.rejectWith(new Error('cannot load usage spec'));

    await component.loadUsageMetrics([
      {
        usageSpecId: 'usage-1',
        unitOfMeasure: { units: 'Requests_hour' },
        description: 'Requests per hour description',
      },
    ]);

    expect(component.usageMetrics.length).toBe(1);
    expect(component.usageMetrics[0].name).toBe('Requests_hour');
    expect(component.usageMetrics[0].description).toBe('Requests per hour description');
  });

  it('loadUsageMetrics should ignore entries without usageSpecId or metric unit name', async () => {
    await component.loadUsageMetrics([
      { usageSpecId: 'usage-1' },
      { unitOfMeasure: { units: 'GB_hour' } },
      { usageSpecId: 'usage-2', unitOfMeasure: { amount: 1 } },
    ] as any[]);

    expect(component.usageMetrics).toEqual([]);
  });

  it('hasLongWord and normalizeName should handle edge cases', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
    expect(component.normalizeName('Compliance:ISO/IEC 27001')).toBe('ISO/IEC 27001');
    expect(component.normalizeName(undefined)).toBe('');
  });

  it('getCharacteristicValueLabel should stringify object values and append unit', () => {
    const label = component.getCharacteristicValueLabel({
      value: { issuer: 'vault', endpoint: 'https://example.test' },
      unitOfMeasure: 'json',
    });

    expect(label).toBe('{"issuer":"vault","endpoint":"https://example.test"} (json)');
  });

  it('getCharacteristicValueLabel should keep boolean false and omit empty unit', () => {
    const label = component.getCharacteristicValueLabel({
      value: false,
    });

    expect(label).toBe('false');
  });

  it('getCharacteristicRangeLabel should support object unit and avoid empty parenthesis', () => {
    const withUnit = component.getCharacteristicRangeLabel({
      valueFrom: 1,
      valueTo: 10,
      unitOfMeasure: { units: 'GB' },
    });
    const withoutUnit = component.getCharacteristicRangeLabel({
      valueFrom: 5,
      valueTo: 15,
      unitOfMeasure: {},
    });

    expect(withUnit).toBe('1 - 10 (GB)');
    expect(withoutUnit).toBe('5 - 15');
  });

  it('getCharacteristicValuePreview should truncate long values with ellipsis', () => {
    const longValue = 'x'.repeat(140);
    const preview = component.getCharacteristicValuePreview({
      value: longValue,
    });

    expect(preview.endsWith('...')).toBeTrue();
    expect(preview.length).toBe(123);
  });

  it('getCharacteristicRangePreview should keep short values unchanged', () => {
    const preview = component.getCharacteristicRangePreview({
      valueFrom: 1,
      valueTo: 3,
      unitOfMeasure: 'GB',
    });

    expect(preview).toBe('1 - 3 (GB)');
  });
});
