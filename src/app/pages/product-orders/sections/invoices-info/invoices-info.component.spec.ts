import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Subject, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { InvoicesService } from 'src/app/services/invoices-service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { environment } from 'src/environments/environment';

import { InvoicesInfoComponent } from './invoices-info.component';

describe('InvoiceInfoComponent', () => {
  let component: InvoicesInfoComponent;
  let fixture: ComponentFixture<InvoicesInfoComponent>;
  let messages$: Subject<any>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let invoicesServiceSpy: jasmine.SpyObj<InvoicesService>;
  let paginationSpy: jasmine.SpyObj<PaginationService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;

  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const apiSpy = {} as ApiServiceService;
  const accountSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['getBillingAccount']);

  beforeEach(async () => {
    messages$ = new Subject<any>();
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    invoicesServiceSpy = jasmine.createSpyObj<InvoicesService>('InvoicesService', ['getAppliedCustomerBillingRates', 'updateInvoice']);
    paginationSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated', 'getInvoices']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      [],
      { messages$: messages$.asObservable() }
    );

    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      expire: Math.floor(Date.now() / 1000) + 300,
      roles: [{ name: environment.SELLER_ROLE }],
      organizations: [],
    } as any);

    paginationSpy.getItemsPaginated.and.resolveTo({
      page_check: true,
      items: [],
      nextItems: [],
      page: 0,
      name: '',
    } as any);
    invoicesServiceSpy.getAppliedCustomerBillingRates.and.resolveTo([]);
    invoicesServiceSpy.updateInvoice.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [InvoicesInfoComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: AccountServiceService, useValue: accountSpy },
        { provide: InvoicesService, useValue: invoicesServiceSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: PaginationService, useValue: paginationSpy },
        { provide: Router, useValue: routerSpy },
      ]
    })
    .overrideComponent(InvoicesInfoComponent, {
      set: { template: '' },
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoicesInfoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should initialize date range and call initPartyInfo', () => {
    const initSpy = spyOn(component, 'initPartyInfo');

    component.ngOnInit();

    expect(component.loading).toBeTrue();
    expect(component.dateRange.value).toBe('month');
    expect(component.selectedDate).toBeDefined();
    expect(initSpy).toHaveBeenCalled();
  });

  it('constructor subscription should react to ChangedSession and ngOnDestroy should unsubscribe', () => {
    const initSpy = spyOn(component, 'initPartyInfo');

    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('initPartyInfo should set partyId and seller role for direct user login', () => {
    const getInvoicesSpy = spyOn(component, 'getInvoices').and.resolveTo();

    component.initPartyInfo();

    expect(component.partyId).toBe('party-user');
    expect(component.isSeller).toBeTrue();
    expect(component.page).toBe(0);
    expect(component.invoices).toEqual([]);
    expect(getInvoicesSpy).toHaveBeenCalledWith(false);
  });

  it('initPartyInfo should set partyId from logged organization', () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      partyId: 'party-user',
      expire: Math.floor(Date.now() / 1000) + 300,
      roles: [{ name: 'Buyer' }],
      organizations: [
        {
          id: 'org-1',
          partyId: 'party-org',
          roles: [{ name: environment.SELLER_ROLE }],
        },
      ],
    } as any);
    const getInvoicesSpy = spyOn(component, 'getInvoices').and.resolveTo();

    component.initPartyInfo();

    expect(component.partyId).toBe('party-org');
    expect(component.isSeller).toBeTrue();
    expect(getInvoicesSpy).toHaveBeenCalledWith(false);
  });

  it('getInvoices should call pagination service and update invoice state', async () => {
    component.page = 2;
    component.partyId = 'party-1';
    component.selectedDate = '2026-01-01T00:00:00.000Z';
    component.role = 'Buyer';
    component.name = 'Name';
    component.filters = ['sent'];
    paginationSpy.getItemsPaginated.and.resolveTo({
      page_check: false,
      items: [{ id: 'inv-1' }],
      nextItems: [{ id: 'inv-2' }],
      page: 3,
      name: 'Buyer Name',
    } as any);

    await component.getInvoices(false);
    await Promise.resolve();

    expect(paginationSpy.getItemsPaginated).toHaveBeenCalled();
    expect(component.page_check).toBeFalse();
    expect(component.invoices).toEqual([{ id: 'inv-1' }]);
    expect(component.nextInvoices).toEqual([{ id: 'inv-2' }]);
    expect(component.page).toBe(3);
    expect(component.name).toBe('Buyer Name');
    expect(component.loading).toBeFalse();
    expect(component.loading_more).toBeFalse();
  });

  it('next should call getInvoices(true)', async () => {
    const getInvoicesSpy = spyOn(component, 'getInvoices').and.resolveTo();

    await component.next();

    expect(getInvoicesSpy).toHaveBeenCalledWith(true);
  });

  it('onStateFilterChange should add/remove filters and reload', () => {
    component.filters = ['paid'];
    const getInvoicesSpy = spyOn(component, 'getInvoices').and.resolveTo();

    component.onStateFilterChange('sent');
    expect(component.filters).toEqual(['paid', 'sent']);

    component.onStateFilterChange('paid');
    expect(component.filters).toEqual(['sent']);
    expect(getInvoicesSpy).toHaveBeenCalledTimes(2);
  });

  it('isFilterSelected should reflect current filters', () => {
    component.filters = ['paid'];
    expect(component.isFilterSelected('paid')).toBeTrue();
    expect(component.isFilterSelected('sent')).toBeFalse();
  });

  it('filterOrdersByDate should update selectedDate and reload invoices', () => {
    const getInvoicesSpy = spyOn(component, 'getInvoices').and.resolveTo();

    component.dateRange.setValue('year');
    component.filterOrdersByDate();
    expect(component.selectedDate).toBeDefined();

    component.dateRange.setValue('all');
    component.filterOrdersByDate();
    expect(component.selectedDate).toBeUndefined();
    expect(getInvoicesSpy).toHaveBeenCalledTimes(2);
  });

  it('getProductImage should return profile picture first and fallback placeholder', () => {
    const withProfile = {
      attachment: [
        { name: 'Picture 1', attachmentType: 'Picture', url: 'https://img1' },
        { name: 'Profile Picture', attachmentType: 'Picture', url: 'https://profile' },
      ],
    } as any;
    const withoutImage = { attachment: [] } as any;

    expect(component.getProductImage(withProfile)).toBe('https://profile');
    expect(component.getProductImage(withoutImage)).toBe('https://placehold.co/600x400/svg');
  });

  it('getTotalPrice should aggregate non-custom prices and set custom flag', () => {
    const items = [
      { productOfferingPrice: { priceType: 'recurring', unit: 'EUR', text: 'month', price: 10 } },
      { productOfferingPrice: { priceType: 'recurring', unit: 'EUR', text: 'month', price: 5 } },
      { productOfferingPrice: { priceType: 'custom', unit: 'EUR', text: 'month', price: 99 } },
    ];

    const total = component.getTotalPrice(items as any);

    expect(total).toEqual([{ priceType: 'recurring', unit: 'EUR', text: 'month', price: 15 }]);
    expect(component.check_custom).toBeTrue();
  });

  it('toggleShowDetails should load applied rates and stop loading', async () => {
    const invoice = { id: 'inv-1' };
    invoicesServiceSpy.getAppliedCustomerBillingRates.and.resolveTo([{ id: 'rate-1' }] as any);

    await component.toggleShowDetails(invoice);

    expect(component.showInvoiceDetails).toBeTrue();
    expect(component.invoiceToShow).toEqual(invoice);
    expect(component.appliedCustomerBillingRates).toEqual([{ id: 'rate-1' }]);
    expect(component.loadingACBRs).toBeFalse();
  });

  it('toggleShowDetails should handle errors and stop loading', async () => {
    invoicesServiceSpy.getAppliedCustomerBillingRates.and.rejectWith(new Error('failed'));

    await component.toggleShowDetails({ id: 'inv-1' });

    expect(component.loadingACBRs).toBeFalse();
    expect(component.appliedCustomerBillingRates).toEqual([]);
  });

  it('onRoleChange should update role and reload invoices', async () => {
    const getInvoicesSpy = spyOn(component, 'getInvoices').and.resolveTo();

    await component.onRoleChange('Seller');

    expect(component.role).toBe('Seller');
    expect(getInvoicesSpy).toHaveBeenCalledWith(false);
  });

  it('goToProduct should navigate to product inventory', () => {
    component.goToProduct('prod-1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/product-inventory/', 'prod-1']);
  });

  it('editInvoice should enable editing mode for selected invoice', () => {
    component.editInvoice(2, { billNo: 'INV-001' });
    expect(component.editingIndex).toBe(2);
    expect(component.editableInvoiceName).toBe('INV-001');
  });

  it('saveInvoice should persist new billNo and clear editing index', () => {
    const invoice = { id: 'inv-1', billNo: 'OLD' };
    invoicesServiceSpy.updateInvoice.and.returnValue(of({}));

    component.editableInvoiceName = 'NEW';
    component.saveInvoice(0, invoice);

    expect(invoicesServiceSpy.updateInvoice).toHaveBeenCalledWith({ billNo: 'NEW' }, 'inv-1');
    expect(invoice.billNo).toBe('NEW');
    expect(component.editingIndex).toBeNull();
  });

  it('saveInvoice should revert billNo when update fails', () => {
    const invoice = { id: 'inv-1', billNo: 'OLD' };
    invoicesServiceSpy.updateInvoice.and.returnValue(throwError(() => new Error('error')));

    component.editableInvoiceName = 'NEW';
    component.saveInvoice(0, invoice);

    expect(invoice.billNo).toBe('OLD');
    expect(component.editingIndex).toBeNull();
  });

  it('downloadInvoice should open invoice URL in new tab', () => {
    const openSpy = spyOn(window, 'open');

    component.downloadInvoice({ id: 'inv-1' });

    expect(openSpy).toHaveBeenCalledWith(
      `${environment.BASE_URL}/invoicing/invoices/inv-1?format=xml-html`,
      '_blank'
    );
  });

  it('onClick should hide details modal and call detectChanges', () => {
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');
    component.showInvoiceDetails = true;

    component.onClick();

    expect(component.showInvoiceDetails).toBeFalse();
    expect(cdrSpy).toHaveBeenCalled();
  });
});
