import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { PriceServiceService } from 'src/app/services/price-service.service';

import { SellerOfferComponent } from './seller-offer.component';

describe('SellerOfferComponent', () => {
  let component: SellerOfferComponent;
  let fixture: ComponentFixture<SellerOfferComponent>;
  let messages$: Subject<any>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let paginationSpy: jasmine.SpyObj<PaginationService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let priceServiceSpy: jasmine.SpyObj<PriceServiceService>;

  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

  beforeEach(async () => {
    messages$ = new Subject<any>();
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getProductOfferByOwner']);
    paginationSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      ['emitSellerCreateOffer', 'emitSellerUpdateOffer', 'emitSellerCreateCustomOffer'],
      { messages$: messages$.asObservable() }
    );
    priceServiceSpy = jasmine.createSpyObj<PriceServiceService>('PriceServiceService', ['isCustomOffering']);
    priceServiceSpy.isCustomOffering.and.resolveTo(false);
    paginationSpy.getItemsPaginated.and.resolveTo({
      page_check: true,
      items: [],
      nextItems: [],
      page: 0,
    } as any);
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      organizations: [],
    } as any);

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerOfferComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: PaginationService, useValue: paginationSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: PriceServiceService, useValue: priceServiceSpy },
      ]
    })
    .overrideComponent(SellerOfferComponent, {
      set: { template: '' },
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerOfferComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should call initOffers', () => {
    const initSpy = spyOn(component, 'initOffers');

    component.ngOnInit();

    expect(initSpy).toHaveBeenCalled();
  });

  it('constructor subscription should call initOffers on ChangedSession message', () => {
    const initSpy = spyOn(component, 'initOffers');

    messages$.next({ type: 'ChangedSession' });

    expect(initSpy).toHaveBeenCalled();
  });

  it('ngOnDestroy should unsubscribe from ChangedSession stream', () => {
    const initSpy = spyOn(component, 'initOffers');
    component.ngOnDestroy();

    messages$.next({ type: 'ChangedSession' });

    expect(initSpy).not.toHaveBeenCalled();
  });

  it('initOffers should set partyId from user login and call getOffers(false)', () => {
    spyOn(document, 'querySelector').and.returnValue(undefined as any);
    const getOffersSpy = spyOn(component, 'getOffers');
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      organizations: [],
    } as any);

    component.initOffers();

    expect(component.partyId).toBe('party-user');
    expect(getOffersSpy).toHaveBeenCalledWith(false);
  });

  it('initOffers should set partyId from logged organization', () => {
    spyOn(document, 'querySelector').and.returnValue(undefined as any);
    const getOffersSpy = spyOn(component, 'getOffers');
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
    } as any);

    component.initOffers();

    expect(component.partyId).toBe('party-org');
    expect(getOffersSpy).toHaveBeenCalledWith(false);
  });

  it('getOffers should request paginated items and build customMap', async () => {
    component.partyId = 'party-user';
    component.status = ['Active', 'Launched'];
    component.sort = 'name';
    component.isBundle = false;
    component.offers = [];
    component.nextOffers = [];
    paginationSpy.getItemsPaginated.and.resolveTo({
      page_check: false,
      items: [{ id: 'off-1' }, { id: 'off-2' }],
      nextItems: [{ id: 'off-3' }],
      page: 1,
    } as any);
    priceServiceSpy.isCustomOffering.and.callFake(async (offer: any) => offer.id === 'off-1');

    await component.getOffers(false);
    await Promise.resolve();

    expect(paginationSpy.getItemsPaginated).toHaveBeenCalledWith(
      0,
      component.PROD_SPEC_LIMIT,
      false,
      [],
      [],
      {
        filters: ['Active', 'Launched'],
        partyId: 'party-user',
        sort: 'name',
        isBundle: false,
      },
      jasmine.any(Function)
    );
    expect(component.page).toBe(1);
    expect(component.page_check).toBeFalse();
    expect(component.offers.length).toBe(2);
    expect(component.nextOffers.length).toBe(1);
    expect(priceServiceSpy.isCustomOffering).toHaveBeenCalledTimes(2);
    expect(component.customMap['off-1']).toBeTrue();
  });

  it('next should call getOffers(true)', async () => {
    const getOffersSpy = spyOn(component, 'getOffers').and.resolveTo();

    await component.next();

    expect(getOffersSpy).toHaveBeenCalledWith(true);
  });

  it('onStateFilterChange should remove existing filter and reload offers', () => {
    component.status = ['Active', 'Launched'];
    const getOffersSpy = spyOn(component, 'getOffers');

    component.onStateFilterChange('Active');

    expect(component.status).toEqual(['Launched']);
    expect(getOffersSpy).toHaveBeenCalledWith(false);
  });

  it('onStateFilterChange should add non-existing filter and reload offers', () => {
    component.status = ['Active'];
    const getOffersSpy = spyOn(component, 'getOffers');

    component.onStateFilterChange('Launched');

    expect(component.status).toEqual(['Active', 'Launched']);
    expect(getOffersSpy).toHaveBeenCalledWith(false);
  });

  it('onSortChange should set sort and reload offers', () => {
    const getOffersSpy = spyOn(component, 'getOffers');

    component.onSortChange({ target: { value: 'name' } });
    expect(component.sort).toBe('name');
    expect(getOffersSpy).toHaveBeenCalledWith(false);

    component.onSortChange({ target: { value: 'none' } });
    expect(component.sort).toBeUndefined();
  });

  it('onTypeChange should set isBundle and reload offers', () => {
    const getOffersSpy = spyOn(component, 'getOffers');

    component.onTypeChange({ target: { value: 'simple' } });
    expect(component.isBundle).toBeFalse();
    expect(getOffersSpy).toHaveBeenCalledWith(false);

    component.onTypeChange({ target: { value: 'bundle' } });
    expect(component.isBundle).toBeTrue();

    component.onTypeChange({ target: { value: 'all' } });
    expect(component.isBundle).toBeUndefined();
  });

  it('goToCreate should emit seller create offer event', () => {
    component.goToCreate();
    expect(eventMessageSpy.emitSellerCreateOffer).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update offer event', () => {
    const offer = { id: 'off-1' };
    component.goToUpdate(offer);
    expect(eventMessageSpy.emitSellerUpdateOffer).toHaveBeenCalledWith(offer);
  });

  it('goToCreateCustom should emit seller create custom offer event', () => {
    const offer = { id: 'off-2' };
    component.goToCreateCustom(offer);
    expect(eventMessageSpy.emitSellerCreateCustomOffer).toHaveBeenCalledWith(offer);
  });

  it('hasLongWord should detect words above threshold', () => {
    expect(component.hasLongWord('short words only', 10)).toBeFalse();
    expect(component.hasLongWord('containsaveryverylongword here', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
