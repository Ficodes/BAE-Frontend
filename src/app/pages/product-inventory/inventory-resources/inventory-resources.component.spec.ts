import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PaginationService } from 'src/app/services/pagination.service';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { InventoryResourcesComponent } from './inventory-resources.component';

describe('InventoryResourcesComponent', () => {
  let component: InventoryResourcesComponent;
  let fixture: ComponentFixture<InventoryResourcesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [InventoryResourcesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reloads the selected status from the first page without cached items', async () => {
    component.loading = false;
    component.page = 30;
    component.resources = [{ id: 'previous-status' }];
    component.nextResources = [{ id: 'cached-next-page' }];
    const paginate = spyOn(TestBed.inject(PaginationService), 'getItemsPaginated')
      .and.resolveTo({ items: [{ id: 'matching-item' }], nextItems: [], page: 10, page_check: false });

    await component.selectStatusTab('available');

    const [page, , next, items, nextItems, options] = paginate.calls.mostRecent().args;
    expect(page).toBe(0);
    expect(next).toBeFalse();
    expect(items).toEqual([]);
    expect(nextItems).toEqual([]);
    expect(options.filters).toEqual(['available']);
    expect(component.selectedStatus).toBe('available');
    expect(component.resources).toEqual([{ id: 'matching-item' }]);
  });

  it('starts on the first tab and uses its status for the initial request', async () => {
    expect(component.statusTabs.map(tab => tab.value)).toEqual(['reserved', 'available', 'suspended']);
    expect(component.selectedStatus).toBe(component.statusTabs[0].value);
    expect(component.status).toEqual(['reserved']);
    expect(component.statusTabs.some(tab => tab.value === 'all')).toBeFalse();
    const paginate = spyOn(TestBed.inject(PaginationService), 'getItemsPaginated')
      .and.resolveTo({ items: [], nextItems: [], page: 0, page_check: false });

    await component.getInventory(false);

    expect(paginate.calls.mostRecent().args[5].filters).toEqual(['reserved']);
  });

  it('ignores unsupported statuses', () => {
    component.loading = false;
    const reload = spyOn(component, 'getInventory');

    for (const status of ['all', 'standby', 'alarm', 'unknown']) {
      component.selectStatusTab(status);
    }

    expect(reload).not.toHaveBeenCalled();
    expect(component.status).toEqual(['reserved']);
  });

  it('does not reload an unchanged tab or switch while a page is loading', () => {
    component.loading = false;
    const reload = spyOn(component, 'getInventory');
    component.selectStatusTab(component.statusTabs[0].value);
    component.loading = true;
    component.selectStatusTab('available');
    component.loading = false;
    component.loading_more = true;
    component.selectStatusTab('available');

    expect(reload).not.toHaveBeenCalled();
    expect(component.selectedStatus).toBe(component.statusTabs[0].value);
  });
  it('opens a standalone inventory detail route', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.selectResource({ id: 'instance-id' });

    expect(navigate).toHaveBeenCalledOnceWith(['/product-inventory/resources', 'instance-id']);
  });
  it('starts on the first tab even when the URL contains a previous active status', () => {
    spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').and.callFake(key => key === 'status' ? 'active' : null);
    spyOn(component, 'initInventory');

    component.ngOnInit();

    expect(component.selectedStatus).toBe(component.statusTabs[0].value);
    expect(component.status).toEqual([component.statusTabs[0].value]);
  });
});
