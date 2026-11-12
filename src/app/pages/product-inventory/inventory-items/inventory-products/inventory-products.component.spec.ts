import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PaginationService } from 'src/app/services/pagination.service';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { InventoryProductsComponent } from './inventory-products.component';

describe('InventoryProductsComponent', () => {
  let component: InventoryProductsComponent;
  let fixture: ComponentFixture<InventoryProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [InventoryProductsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reloads the selected status from the first page without cached items', async () => {
    component.loading = false;
    component.page = 30;
    component.inventory = [{ id: 'previous-status' }];
    component.nextInventory = [{ id: 'cached-next-page' }];
    const paginate = spyOn(TestBed.inject(PaginationService), 'getItemsPaginated')
      .and.resolveTo({ items: [{ id: 'matching-item' }], nextItems: [], page: 10, page_check: false });

    await component.selectStatusTab('active');

    const [page, , next, items, nextItems, options] = paginate.calls.mostRecent().args;
    expect(page).toBe(0);
    expect(next).toBeFalse();
    expect(items).toEqual([]);
    expect(nextItems).toEqual([]);
    expect(options.filters).toEqual(['active']);
    expect(component.selectedStatus).toBe('active');
    expect(component.inventory).toEqual([{ id: 'matching-item' }]);
  });

  it('starts on the first tab and uses its status for the initial request', async () => {
    expect(component.statusTabs.map(tab => tab.value)).toEqual(['created', 'active', 'suspended', 'terminated']);
    expect(component.selectedStatus).toBe(component.statusTabs[0].value);
    expect(component.filters).toEqual(['created']);
    expect(component.statusTabs.some(tab => tab.value === 'all')).toBeFalse();
    const paginate = spyOn(TestBed.inject(PaginationService), 'getItemsPaginated')
      .and.resolveTo({ items: [], nextItems: [], page: 0, page_check: false });

    await component.getInventory(false);

    expect(paginate.calls.mostRecent().args[5].filters).toEqual(['created']);
  });

  it('ignores unsupported statuses', () => {
    component.loading = false;
    const reload = spyOn(component, 'getInventory');

    component.selectStatusTab('all');

    expect(reload).not.toHaveBeenCalled();
    expect(component.filters).toEqual(['created']);
  });

  it('does not reload an unchanged tab or switch while a page is loading', () => {
    component.loading = false;
    const reload = spyOn(component, 'getInventory');
    component.selectStatusTab(component.statusTabs[0].value);
    component.loading = true;
    component.selectStatusTab('active');
    component.loading = false;
    component.loading_more = true;
    component.selectStatusTab('active');

    expect(reload).not.toHaveBeenCalled();
    expect(component.selectedStatus).toBe(component.statusTabs[0].value);
  });
  it('switches between cards and rows without refetching or changing the inventory', () => {
    const product = { id: 'owned-product', status: 'active', product: { name: 'Example', version: 'hidden-version' } };
    component.loading = false;
    component.inventory = [product];
    const reload = spyOn(component, 'getInventory');
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    (root.querySelector('[data-cy="inventoryListView"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(root.querySelector('[data-cy="productInventory"]')?.getAttribute('data-view-mode')).toBe('list');
    expect(root.querySelector('[data-cy="inventoryListView"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.textContent).not.toContain('hidden-version');
    expect(component.inventory).toEqual([product]);
    expect(reload).not.toHaveBeenCalled();

    (root.querySelector('[data-cy="inventoryGridView"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(root.querySelector('[data-cy="productInventory"]')?.getAttribute('data-view-mode')).toBe('grid');
    expect(root.querySelector('[data-cy="inventoryGridView"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps subscription actions available in rows without opening product details', () => {
    const product = { id: 'owned-product', status: 'active', product: { name: 'Example' } };
    component.loading = false;
    component.viewMode = 'list';
    component.inventory = [product];
    const modify = spyOn(component, 'openModifyFromCard');
    const unsubscribe = spyOn(component, 'showUnsubscribeModal');
    const details = spyOn(component, 'goToProductDetails');
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    (root.querySelector('[data-cy="modifyInvProduct"]') as HTMLButtonElement).click();
    (root.querySelector('[data-cy="terminateInvProduct"]') as HTMLButtonElement).click();

    expect(modify).toHaveBeenCalledOnceWith(product);
    expect(unsubscribe).toHaveBeenCalledOnceWith(product);
    expect(details).not.toHaveBeenCalled();
  });
  it('opens the inventory instance page from both the image and title', () => {
    const product = { id: 'inventory-id', status: 'active', product: { id: 'offering-id', name: 'Example' } };
    component.loading = false;
    component.viewMode = 'list';
    component.inventory = [product];
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.detectChanges();

    const card: HTMLElement = fixture.nativeElement.querySelector('[data-cy="productInventory"]');
    (card.querySelector('button') as HTMLButtonElement).click();
    (card.querySelector('h3 button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/product-inventory', 'inventory-id'], {
      queryParams: { view: 'list' }
    });
  });

  it('prepares modification data without navigating away', async () => {
    const product = { id: 'inventory-id' };
    const prepare = spyOn(component, 'loadProductForModification').and.resolveTo();
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    await component.openModifyFromCard(product);

    expect(prepare).toHaveBeenCalledOnceWith(product);
    expect(component.isModifyDrawerOpen).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('starts on the first tab even when the URL contains a previous active status', () => {
    spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').and.callFake(key => key === 'status' ? 'active' : null);
    spyOn(component, 'initInventory');

    component.ngOnInit();

    expect(component.selectedStatus).toBe(component.statusTabs[0].value);
    expect(component.filters).toEqual([component.statusTabs[0].value]);
  });
});
