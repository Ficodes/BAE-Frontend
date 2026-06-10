import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { CartDrawerComponent } from './cart-drawer.component';
import { LocalStorageService } from '../../services/local-storage.service';
import { EventMessageService } from '../../services/event-message.service';
import { PriceServiceService } from '../../services/price-service.service';
import { ShoppingCartServiceService } from '../../services/shopping-cart-service.service';
import { ApiServiceService } from '../../services/product-service.service';
import { environment } from '../../../environments/environment';

describe('CartDrawerComponent', () => {
  let component: CartDrawerComponent;
  let fixture: ComponentFixture<CartDrawerComponent>;
  let cartServiceSpy: jasmine.SpyObj<ShoppingCartServiceService>;
  let apiServiceSpy: jasmine.SpyObj<ApiServiceService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;

  beforeEach(async () => {
    cartServiceSpy = jasmine.createSpyObj<ShoppingCartServiceService>('ShoppingCartServiceService', [
      'getShoppingCart',
      'removeItemShoppingCart',
    ]);
    apiServiceSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getSearchProductById',
      'getSearchProductSpecification',
      'getProductById',
      'getProductSpecification',
    ]);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', [
      'emitRemovedCartItem',
      'emitToggleDrawer',
    ]);
    (eventMessageSpy as any).messages$ = of();

    cartServiceSpy.getShoppingCart.and.resolveTo([]);
    cartServiceSpy.removeItemShoppingCart.and.resolveTo();

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [CartDrawerComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useValue: jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']) },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: PriceServiceService, useValue: jasmine.createSpyObj<PriceServiceService>('PriceServiceService', ['calculatePrice']) },
        { provide: ShoppingCartServiceService, useValue: cartServiceSpy },
        { provide: ApiServiceService, useValue: apiServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartDrawerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getProviderInfo should use federation-aware catalog methods for cart item enrichment', async () => {
    component.items = [{ id: 'urn:ngsi-ld:product-offering:federated-1' }] as any;
    apiServiceSpy.getSearchProductById.and.resolveTo({
      productSpecification: { id: 'urn:ngsi-ld:product-specification:federated-1' },
    } as any);
    apiServiceSpy.getSearchProductSpecification.and.resolveTo({
      relatedParty: [{ id: 'seller-1', role: environment.SELLER_ROLE }],
    } as any);

    await component.getProviderInfo();

    expect(apiServiceSpy.getSearchProductById).toHaveBeenCalledWith('urn:ngsi-ld:product-offering:federated-1');
    expect(apiServiceSpy.getSearchProductSpecification).toHaveBeenCalledWith('urn:ngsi-ld:product-specification:federated-1');
    expect(apiServiceSpy.getProductById).not.toHaveBeenCalled();
    expect(apiServiceSpy.getProductSpecification).not.toHaveBeenCalled();
    expect(component.items[0].relatedParty).toEqual([{ id: 'seller-1', role: environment.SELLER_ROLE }]);
  });

  it('getProviderInfo should remove the cart item when federation-aware enrichment returns 404', async () => {
    component.items = [{ id: 'urn:ngsi-ld:product-offering:missing-1' }] as any;
    apiServiceSpy.getSearchProductById.and.rejectWith({ status: 404 });

    await component.getProviderInfo();

    expect(cartServiceSpy.removeItemShoppingCart).toHaveBeenCalledWith('urn:ngsi-ld:product-offering:missing-1');
    expect(eventMessageSpy.emitRemovedCartItem).toHaveBeenCalledWith(component.items[0] as any);
  });
});
