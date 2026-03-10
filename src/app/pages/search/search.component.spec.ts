import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { SearchComponent } from './search.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { EventMessageService } from '../../services/event-message.service';
import { SearchStateService } from '../../services/search-state.service';
import { LoginServiceService } from 'src/app/services/login-service.service';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let paginationSpy: jasmine.SpyObj<PaginationService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let stateMock: {
    products: any[];
    nextProducts: any[];
    page: number;
    page_check: boolean;
    keywords: string | undefined;
    hasState: jasmine.Spy;
    save: jasmine.Spy;
    clear: jasmine.Spy;
  };
  let routerSpy: jasmine.SpyObj<Router>;
  let routeParamGetSpy: jasmine.Spy;
  let messages$: Subject<any>;
  let routerEvents$: Subject<any>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getProductsDetails']);
    paginationSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated', 'getProducts']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
      'getObject',
      'removeCategoryFilter',
      'setItem',
      'setObject',
    ]);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', [
      'emitFilterShown',
      'emitRemovedFilter',
    ]);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      events: undefined,
    });
    messages$ = new Subject<any>();
    (eventMessageSpy as any).messages$ = messages$.asObservable();

    routerEvents$ = new Subject<any>();
    Object.defineProperty(routerSpy, 'events', { value: routerEvents$.asObservable() });

    routeParamGetSpy = jasmine.createSpy('paramMap.get').and.returnValue(null);

    stateMock = {
      products: [],
      nextProducts: [],
      page: 0,
      page_check: true,
      keywords: undefined,
      hasState: jasmine.createSpy('hasState').and.returnValue(false),
      save: jasmine.createSpy('save'),
      clear: jasmine.createSpy('clear'),
    };

    paginationSpy.getItemsPaginated.and.resolveTo({
      items: [],
      nextItems: [],
      page: 0,
      page_check: false,
    });
    apiSpy.getProductsDetails.and.callFake(async (items: any[]) => items as any);
    localStorageSpy.getObject.and.callFake((key: string) => {
      if (key === 'selected_categories') return [];
      if (key === 'login_items') return {};
      if (key === 'feedback') return {};
      return {};
    });
    spyOn(window, 'scrollTo');

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SearchComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: PaginationService, useValue: paginationSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: SearchStateService, useValue: stateMock },
        { provide: LoginServiceService, useValue: {} },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: routeParamGetSpy },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    routerEvents$.complete();
    messages$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('constructor should react to AddedFilter and RemovedFilter events', async () => {
    component.aiSearchEnabled = false;
    const getProductsSpy = spyOn(component, 'getProducts').and.resolveTo();
    const checkPanelSpy = spyOn(component, 'checkPanel').and.stub();

    messages$.next({ type: 'AddedFilter' });
    messages$.next({ type: 'RemovedFilter' });
    await flushPromises();

    expect(getProductsSpy).toHaveBeenCalledTimes(2);
    expect(getProductsSpy).toHaveBeenCalledWith(false);
    expect(checkPanelSpy).toHaveBeenCalledTimes(2);
  });

  it('constructor should close feedback when CloseFeedback event arrives', () => {
    component.feedback = true;

    messages$.next({ type: 'CloseFeedback' });

    expect(component.feedback).toBeFalse();
  });

  it('ngOnInit should restore state and skip loading when cached state exists', async () => {
    stateMock.products = [{ id: 'p1' }];
    stateMock.nextProducts = [{ id: 'p2' }];
    stateMock.page = 20;
    stateMock.page_check = false;
    stateMock.keywords = 'edge';
    stateMock.hasState.and.returnValue(true);
    routeParamGetSpy.and.callFake((key: string) => (key === 'keywords' ? 'from-route' : null));

    await component.ngOnInit();

    expect(component.products).toEqual([{ id: 'p1' }] as any);
    expect(component.nextProducts).toEqual([{ id: 'p2' }] as any);
    expect(component.page).toBe(20);
    expect(component.page_check).toBeFalse();
    expect(component.keywords).toBe('edge');
    expect(component.searchField.value).toBe('edge');
    expect(paginationSpy.getItemsPaginated).not.toHaveBeenCalled();
  });

  it('ngOnInit should load products when there is no cached state', async () => {
    component.aiSearchEnabled = false;
    stateMock.hasState.and.returnValue(false);
    routeParamGetSpy.and.callFake((key: string) => (key === 'keywords' ? 'cloud' : null));
    paginationSpy.getItemsPaginated.and.resolveTo({
      items: [{ id: 'p1' }],
      nextItems: [{ id: 'p2' }],
      page: 10,
      page_check: true,
    });

    await component.ngOnInit();
    await flushPromises();

    expect(component.keywords).toBe('cloud');
    expect(component.searchField.value).toBe('cloud');
    expect(paginationSpy.getItemsPaginated).toHaveBeenCalled();
    expect(component.products).toEqual([{ id: 'p1' }] as any);
    expect(component.nextProducts).toEqual([{ id: 'p2' }] as any);
    expect(component.page).toBe(10);
    expect(component.page_check).toBeTrue();
    expect(stateMock.save).toHaveBeenCalled();
  });

  it('ngOnInit should mark navigation target on router navigation events', async () => {
    await component.ngOnInit();

    routerEvents$.next(new NavigationStart(1, '/search/urn:ngsi-ld:product-offering:1'));
    expect((component as any).navigatingToDetail).toBeTrue();

    routerEvents$.next(new NavigationStart(2, '/search'));
    expect((component as any).navigatingToDetail).toBeFalse();
  });

  it('getProducts should request paginated data and persist state', async () => {
    component.page = 30;
    component.products = [{ id: 'old' }] as any;
    component.nextProducts = [{ id: 'next-old' }] as any;
    component.keywords = 'gpu';
    localStorageSpy.getObject.and.callFake((key: string) => {
      if (key === 'selected_categories') return [{ id: 'cat-1' }];
      return {};
    });
    paginationSpy.getItemsPaginated.and.resolveTo({
      items: [{ id: 'p1' }],
      nextItems: [{ id: 'p2' }],
      page: 40,
      page_check: true,
    });

    await component.getProducts(false);
    await flushPromises();

    expect(stateMock.clear).toHaveBeenCalled();
    expect(paginationSpy.getItemsPaginated).toHaveBeenCalledWith(
      30,
      component.PRODUCT_LIMIT,
      false,
      [{ id: 'old' }],
      [{ id: 'next-old' }],
      { keywords: 'gpu', filters: [{ id: 'cat-1' }] },
      jasmine.any(Function),
    );
    expect(apiSpy.getProductsDetails).toHaveBeenCalledTimes(2);
    expect(component.products).toEqual([{ id: 'p1' }] as any);
    expect(component.nextProducts).toEqual([{ id: 'p2' }] as any);
    expect(component.page).toBe(40);
    expect(component.page_check).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.loading_more).toBeFalse();
    expect(stateMock.save).toHaveBeenCalledWith({
      products: [{ id: 'p1' }],
      nextProducts: [{ id: 'p2' }],
      page: 40,
      page_check: true,
      keywords: 'gpu',
    });
  });

  it('next should delegate to getProducts with next=true', async () => {
    const getProductsSpy = spyOn(component, 'getProducts').and.resolveTo();

    await component.next();

    expect(getProductsSpy).toHaveBeenCalledWith(true);
  });

  it('filterSearch should use search text when provided', async () => {
    const event = { preventDefault: jasmine.createSpy('preventDefault') };
    component.searchField.setValue('kubernetes');
    const updateSpy = spyOn(component, 'updateQueryParams').and.stub();
    const getProductsSpy = spyOn(component, 'getProducts').and.resolveTo();

    await component.filterSearch(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.keywords).toBe('kubernetes');
    expect(updateSpy).toHaveBeenCalledWith('kubernetes');
    expect(getProductsSpy).toHaveBeenCalledWith(false);
  });

  it('filterSearch should clear keywords when search field is empty', async () => {
    const event = { preventDefault: jasmine.createSpy('preventDefault') };
    component.searchField.setValue('');
    const updateSpy = spyOn(component, 'updateQueryParams').and.stub();
    const getProductsSpy = spyOn(component, 'getProducts').and.resolveTo();

    await component.filterSearch(event);

    expect(component.keywords).toBeUndefined();
    expect(updateSpy).toHaveBeenCalledWith(undefined as any);
    expect(getProductsSpy).toHaveBeenCalledWith(false);
  });

  it('updateQueryParams should navigate with and without keywords', () => {
    component.updateQueryParams('ai');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search', { keywords: 'ai' }], { replaceUrl: true });

    component.updateQueryParams(null);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search'], { replaceUrl: true });
  });

  it('checkPanel should toggle panel visibility and emit only on state change', () => {
    localStorageSpy.getObject.and.returnValue([{ id: 'cat-1' }] as any);
    component.showPanel = false;

    component.checkPanel();

    expect(component.showPanel).toBeTrue();
    expect(eventMessageSpy.emitFilterShown).toHaveBeenCalledWith(true);
    expect(localStorageSpy.setItem).toHaveBeenCalledWith('is_filter_panel_shown', 'true');

    eventMessageSpy.emitFilterShown.calls.reset();
    localStorageSpy.setItem.calls.reset();
    component.checkPanel();

    expect(eventMessageSpy.emitFilterShown).not.toHaveBeenCalled();
    expect(localStorageSpy.setItem).not.toHaveBeenCalled();
  });

  it('onClick should close drawer when open', () => {
    component.showDrawer = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showDrawer).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('ngOnDestroy should clear selected filters and state when not navigating to detail', () => {
    const catA = { id: 'c1' };
    const catB = { id: 'c2' };
    localStorageSpy.getObject.and.callFake((key: string) => {
      if (key === 'selected_categories') return [catA, catB];
      return {};
    });
    (component as any).navigatingToDetail = false;

    component.ngOnDestroy();

    expect(localStorageSpy.removeCategoryFilter).toHaveBeenCalledWith(catA as any);
    expect(localStorageSpy.removeCategoryFilter).toHaveBeenCalledWith(catB as any);
    expect(eventMessageSpy.emitRemovedFilter).toHaveBeenCalledWith(catA as any);
    expect(eventMessageSpy.emitRemovedFilter).toHaveBeenCalledWith(catB as any);
    expect(stateMock.clear).toHaveBeenCalled();
  });

  it('ngOnDestroy should skip cleanup when navigating to product detail', () => {
    (component as any).navigatingToDetail = true;

    component.ngOnDestroy();

    expect(localStorageSpy.removeCategoryFilter).not.toHaveBeenCalled();
    expect(eventMessageSpy.emitRemovedFilter).not.toHaveBeenCalled();
    expect(stateMock.clear).not.toHaveBeenCalled();
  });
});
