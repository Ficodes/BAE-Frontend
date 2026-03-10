import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { PricePlanMetricsService } from 'src/app/services/price-plan-metrics.service';
import { MarkdownService } from 'ngx-markdown';

import { PricePlanDrawerComponent } from './price-plan-drawer.component';

describe('PricePlanDrawerComponent', () => {
  let component: PricePlanDrawerComponent;
  let fixture: ComponentFixture<PricePlanDrawerComponent>;
  let cartServiceSpy: jasmine.SpyObj<ShoppingCartServiceService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;

  const priceServiceSpy = jasmine.createSpyObj<PriceServiceService>('PriceServiceService', ['calculatePrice']);
  const pricePlanMetricsSpy = jasmine.createSpyObj<PricePlanMetricsService>('PricePlanMetricsService', ['getAppliedMetrics']);

  beforeEach(async () => {
    cartServiceSpy = jasmine.createSpyObj<ShoppingCartServiceService>('ShoppingCartServiceService', ['addItemShoppingCart']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', ['emitAddedCartItem']);

    priceServiceSpy.calculatePrice.and.returnValue(of({ orderTotalPrice: [] }));
    cartServiceSpy.addItemShoppingCart.and.resolveTo();
    pricePlanMetricsSpy.getAppliedMetrics.and.resolveTo([]);

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [PricePlanDrawerComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: PriceServiceService, useValue: priceServiceSpy },
        { provide: ShoppingCartServiceService, useValue: cartServiceSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: PricePlanMetricsService, useValue: pricePlanMetricsSpy },
        { provide: MarkdownService, useValue: {} },
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PricePlanDrawerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filterCharacteristics should initialize range defaults and mark optional disabled characteristics', () => {
    component.characteristics = [
      {
        id: 'range-main',
        name: 'Range Main',
        productSpecCharacteristicValue: [{ isDefault: true, valueFrom: 1, valueTo: 20 }],
      },
      {
        id: 'range-enabled',
        name: 'Range Main - enabled',
        productSpecCharacteristicValue: [{ isDefault: true, value: false }],
      },
      {
        id: 'compliance',
        name: 'Compliance:ISO27001',
        productSpecCharacteristicValue: [{ isDefault: true, value: true }],
      },
    ] as any;

    component.filterCharacteristics();

    const characteristicsGroup = component.form.get('characteristics');
    expect(component.filteredCharacteristics.some((c) => c.name === 'Compliance:ISO27001')).toBeFalse();
    expect(component.canBeDisabledChars).toContain('range-main');
    expect(component.disabledCharacteristics).toContain('range-main');
    expect(characteristicsGroup?.get('range-main')?.value).toBe(1);
  });

  it('updateOrderChars should infer number type for untouched range value', () => {
    component.filteredCharacteristics = [
      { id: 'range-main', name: 'Range Main', productSpecCharacteristicValue: [] },
    ] as any;
    component.form.setControl(
      'characteristics',
      (component as any).fb.group({
        'range-main': 40,
      })
    );

    component.updateOrderChars();

    expect(component.orderChars).toEqual([
      { name: 'Range Main', value: 40, valueType: 'number' },
    ]);
  });

  it('updateOrderChars should infer boolean type only for booleans', () => {
    component.filteredCharacteristics = [
      { id: 'flag', name: 'Feature Enabled', productSpecCharacteristicValue: [] },
    ] as any;
    component.form.setControl(
      'characteristics',
      (component as any).fb.group({
        flag: true,
      })
    );

    component.updateOrderChars();

    expect(component.orderChars).toEqual([
      { name: 'Feature Enabled', value: true, valueType: 'boolean' },
    ]);
  });

  it('updateOrderChars should convert string boolean values to real booleans', () => {
    component.filteredCharacteristics = [
      {
        id: 'platinum',
        name: 'platinum',
        productSpecCharacteristicValue: [{ value: true }, { value: false }],
      },
    ] as any;
    component.form.setControl(
      'characteristics',
      (component as any).fb.group({
        platinum: 'true',
      })
    );

    component.updateOrderChars();

    expect(component.orderChars).toEqual([
      { name: 'platinum', value: true, valueType: 'boolean' },
    ]);
  });

  it('onToggleChange should disable and re-enable characteristic and trigger recalculation', async () => {
    component.filteredCharacteristics = [
      { id: 'range-main', name: 'Range Main', productSpecCharacteristicValue: [] },
      { id: 'range-enabled', name: 'Range Main - enabled', productSpecCharacteristicValue: [] },
    ] as any;
    component.form.setControl(
      'characteristics',
      (component as any).fb.group({
        'range-enabled': true,
      })
    );
    const calculateSpy = spyOn(component, 'calculatePrice').and.resolveTo();

    await component.onToggleChange({ target: { checked: false } } as any, 'Range Main');
    expect(component.form.get('characteristics')?.get('range-enabled')?.value).toBeFalse();
    expect(component.disabledCharacteristics).toContain('range-main');

    await component.onToggleChange({ target: { checked: true } } as any, 'Range Main');
    expect(component.form.get('characteristics')?.get('range-enabled')?.value).toBeTrue();
    expect(component.disabledCharacteristics).not.toContain('range-main');
    expect(calculateSpy).toHaveBeenCalledTimes(2);
  });

  it('createOrder should add item to cart and emit AddedCartItem when form is valid', async () => {
    component.productOff = { id: 'off-1', name: 'Offer 1', href: 'off-1', attachment: [] } as any;
    component.form.patchValue({
      selectedPricePlan: { id: 'pp-1' },
      tsAccepted: true,
    });
    component.price = [{ id: 'pp-1' }];
    component.orderChars = [{ name: 'Range Main', value: 40, valueType: 'number' }];
    spyOn(component, 'calculatePrice').and.resolveTo();
    const onCloseSpy = spyOn(component, 'onClose');

    await component.createOrder();

    expect(cartServiceSpy.addItemShoppingCart).toHaveBeenCalled();
    expect(eventMessageSpy.emitAddedCartItem).toHaveBeenCalled();
    expect(onCloseSpy).toHaveBeenCalled();
  });

  it('ngOnInit should set tsAccepted true when there are no terms and conditions', () => {
    component.productOff = {
      productOfferingPrice: [{ id: 'pp-1' }],
      productOfferingTerm: [],
      attachment: [],
    } as any;
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.ngOnInit();

    expect(component.form.controls['tsAccepted'].value).toBeTrue();
    expect(cdrSpy).toHaveBeenCalled();
  });

  it('ngOnInit should initialize free offering and call filterCharacteristics', () => {
    component.productOff = {
      productOfferingPrice: [],
      productOfferingTerm: [],
      attachment: [],
    } as any;
    component.prodSpec = {
      productSpecCharacteristic: [{ id: 'c1', name: 'char1', productSpecCharacteristicValue: [] }],
    } as any;
    const filterSpy = spyOn(component, 'filterCharacteristics');

    component.ngOnInit();

    expect(component.isFree).toBeTrue();
    expect(component.form.get('selectedPricePlan')?.value).toEqual({});
    expect(component.characteristics.length).toBe(1);
    expect(filterSpy).toHaveBeenCalled();
  });

  it('ngOnChanges should set tsAccepted false when opening with a License term', () => {
    component.productOff = {
      productOfferingPrice: [{ id: 'pp-1' }],
      productOfferingTerm: [{ name: 'License', description: 'Accept this license' }],
      attachment: [],
    } as any;
    spyOn((component as any).cdr, 'detectChanges');

    component.ngOnChanges({
      isOpen: { currentValue: true } as any,
    });

    expect(component.tsAndCs.description).toBe('Accept this license');
    expect(component.form.controls['tsAccepted'].value).toBeFalse();
  });

  it('ngOnChanges should refresh free-offer characteristics when productOff changes', () => {
    component.prodSpec = {
      productSpecCharacteristic: [{ id: 'c1', name: 'char1', productSpecCharacteristicValue: [] }],
    } as any;
    component.productOff = {
      productOfferingPrice: [],
      attachment: [],
    } as any;
    const filterSpy = spyOn(component, 'filterCharacteristics');

    component.ngOnChanges({
      productOff: { currentValue: component.productOff } as any,
    });

    expect(component.isFree).toBeTrue();
    expect(component.form.get('selectedPricePlan')?.value).toEqual({});
    expect(filterSpy).toHaveBeenCalled();
  });

  it('ngOnDestroy should remove keydown listener', () => {
    const removeSpy = spyOn(document, 'removeEventListener');
    component.ngOnDestroy();
    expect(removeSpy).toHaveBeenCalledWith('keydown', jasmine.any(Function));
  });

  it('onClose should close drawer and emit closeDrawer event', () => {
    component.isOpen = true;
    const emitSpy = spyOn(component.closeDrawer, 'emit');

    component.onClose();

    expect(component.isOpen).toBeFalse();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('onPricePlanSelected should use profile characteristics when present', async () => {
    const pricePlan = {
      id: 'pp-1',
      priceType: 'usage',
      prodSpecCharValueUse: [{ id: 'pc1', name: 'profile-char', productSpecCharacteristicValue: [] }],
    };
    spyOn(component, 'filterCharacteristics');
    spyOn(component, 'calculatePrice').and.resolveTo();

    await component.onPricePlanSelected(pricePlan);

    expect(component.form.get('selectedPricePlan')?.value).toEqual(pricePlan);
    expect(component.hasProfile).toBeTrue();
    expect(component.characteristics).toEqual(pricePlan.prodSpecCharValueUse);
    expect(component.selectedPricePlan).toEqual(pricePlan);
  });

  it('onPricePlanSelected should load bundled usage metrics', async () => {
    component.prodSpec = { productSpecCharacteristic: [] } as any;
    const pricePlan = {
      id: 'pp-1',
      priceType: 'usage',
      bundledPopRelationship: [{ id: 'pop-1' }, { id: 'pop-2' }],
    };
    pricePlanMetricsSpy.getAppliedMetrics.and.resolveTo([
      { priceId: 'pop-1', usageSpecId: 'usage-1', unitOfMeasure: 'GB', value: 0 },
    ]);
    spyOn(component, 'filterCharacteristics');
    spyOn(component, 'calculatePrice').and.resolveTo();

    await component.onPricePlanSelected(pricePlan);

    expect(component.metrics.length).toBe(1);
    expect(component.metrics[0]).toEqual({
      priceId: 'pop-1',
      usageSpecId: 'usage-1',
      unitOfMeasure: 'GB',
      value: 0,
    });
  });

  it('onUsageSpecChange should update selected usage spec and reset selected unit', () => {
    component.selectedUnitOfMeasure = 'GB';

    component.onUsageSpecChange({ target: { value: 'usage-1' } } as any);

    expect(component.selectedUsageSpecId).toBe('usage-1');
    expect(component.selectedUnitOfMeasure).toBeNull();
  });

  it('onMetricChange should update metric value and trigger recalculation', () => {
    const metric = { value: 0, unitOfMeasure: 'GB', usageSpecId: 'u1' };
    const calculateSpy = spyOn(component, 'calculatePrice').and.resolveTo();

    component.onMetricChange({ target: { valueAsNumber: 25 } } as any, metric);

    expect(metric.value).toBe(25);
    expect(calculateSpy).toHaveBeenCalled();
  });

  it('onValueChange should update form characteristic control and trigger recalculation', async () => {
    component.form.setControl(
      'characteristics',
      (component as any).fb.group({
        c1: 1,
      })
    );
    component.filteredCharacteristics = [{ id: 'c1', name: 'Char 1', productSpecCharacteristicValue: [] }] as any;
    component.selectedPricePlan = { id: 'pp-1' };
    pricePlanMetricsSpy.getAppliedMetrics.and.resolveTo([{ usageSpecId: 'u1', unitOfMeasure: 'GB', value: 0 }]);
    const calculateSpy = spyOn(component, 'calculatePrice').and.resolveTo();

    await component.onValueChange({ characteristicId: 'c1', selectedValue: 7 });

    expect(component.form.get('characteristics')?.get('c1')?.value).toBe(7);
    expect(pricePlanMetricsSpy.getAppliedMetrics).toHaveBeenCalled();
    const selectedCharsArg = pricePlanMetricsSpy.getAppliedMetrics.calls.mostRecent().args[1];
    expect(selectedCharsArg).toEqual([{ id: 'c1', value: 7 }]);
    expect(calculateSpy).toHaveBeenCalled();
  });

  it('onValueChange should update metrics using applied metrics service response', async () => {
    component.form.setControl(
      'characteristics',
      (component as any).fb.group({
        c1: 'small',
      })
    );
    component.filteredCharacteristics = [{ id: 'c1', name: 'Size', productSpecCharacteristicValue: [] }] as any;
    component.selectedPricePlan = { id: 'pp-1' };
    pricePlanMetricsSpy.getAppliedMetrics.and.resolveTo([{ usageSpecId: 'u2', unitOfMeasure: 'CPU', value: 0 }]);
    spyOn(component, 'calculatePrice').and.resolveTo();

    await component.onValueChange({ characteristicId: 'c1', selectedValue: 'large' });

    expect(component.metrics).toEqual([{ usageSpecId: 'u2', unitOfMeasure: 'CPU', value: 0 }]);
  });

  it('calculatePrice should return early for free offers', async () => {
    component.isFree = true;
    component.price = [{ stale: true }];
    component.isLoading = true;
    const updateSpy = spyOn(component, 'updateOrderChars');

    await component.calculatePrice();

    expect(updateSpy).toHaveBeenCalled();
    expect(component.price).toEqual([]);
    expect(component.isLoading).toBeFalse();
  });

  it('calculatePrice should call price service and map response price ids', async () => {
    component.isFree = false;
    component.isCustom = false;
    component.productOff = { id: 'off-1' } as any;
    component.selectedPricePlan = { id: 'pp-1' };
    component.form.patchValue({
      selectedPricePlan: { id: 'pp-1', href: 'pp-1', name: 'Plan 1' },
    });
    component.orderChars = [{ name: 'Range Main', value: 40, valueType: 'number' }];
    component.metrics = [{ usageSpecId: 'u1', unitOfMeasure: 'GB', value: 10 }];
    spyOn(component, 'updateOrderChars').and.callFake(() => {});
    priceServiceSpy.calculatePrice.and.returnValue(
      of({
        orderTotalPrice: [
          { priceType: 'recurring', price: { taxIncludedAmount: { value: 12, unit: 'EUR' } } },
        ],
      })
    );

    await component.calculatePrice();

    expect(priceServiceSpy.calculatePrice).toHaveBeenCalled();
    expect(component.price.length).toBe(1);
    expect(component.price[0].id).toBe('pp-1');
    expect(component.isLoading).toBeFalse();
  });

  it('calculatePrice should set isLoading false when price service fails', async () => {
    component.isFree = false;
    component.isCustom = false;
    component.productOff = { id: 'off-1' } as any;
    component.form.patchValue({
      selectedPricePlan: { id: 'pp-1', href: 'pp-1', name: 'Plan 1' },
    });
    spyOn(component, 'updateOrderChars').and.callFake(() => {});
    priceServiceSpy.calculatePrice.and.returnValue(throwError(() => new Error('fail')));

    await component.calculatePrice();

    expect(component.isLoading).toBeFalse();
  });

  it('createOrder should return early when form is invalid', async () => {
    component.form.patchValue({
      selectedPricePlan: null,
      tsAccepted: false,
    });
    const closeSpy = spyOn(component, 'onClose');

    await component.createOrder();

    expect(cartServiceSpy.addItemShoppingCart).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('createOrder should set custom pricing payload when isCustom is true', async () => {
    component.isCustom = true;
    component.productOff = { id: 'off-1', name: 'Offer 1', href: 'off-1', attachment: [] } as any;
    component.form.patchValue({
      selectedPricePlan: { id: 'pp-custom' },
      tsAccepted: true,
    });
    component.price = [];
    spyOn(component, 'calculatePrice').and.resolveTo();

    await component.createOrder();

    const sentPayload = cartServiceSpy.addItemShoppingCart.calls.mostRecent().args[0];
    expect(sentPayload.options.pricing).toEqual([{ id: 'pp-custom' }]);
  });

  it('getProductImage should return placeholder when there are no images', () => {
    component.images = [];
    expect(component.getProductImage()).toBe('https://placehold.co/600x400/svg');
  });

  it('getProductImage should return first image url when available', () => {
    component.images = [{ url: 'https://example.com/img.png' }] as any;
    expect(component.getProductImage()).toBe('https://example.com/img.png');
  });
});
