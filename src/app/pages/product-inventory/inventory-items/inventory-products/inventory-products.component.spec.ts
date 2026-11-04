import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PaginationService } from 'src/app/services/pagination.service';
import { TranslateModule } from '@ngx-translate/core';
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
});
