import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { BrowseComponent } from './browse.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SEARCH_ACTIVE_CATEGORY_STORAGE_KEY } from 'src/app/data/availableFilters';

describe('BrowseComponent', () => {
  let component: BrowseComponent;
  let fixture: ComponentFixture<BrowseComponent>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getCategoriesByParentId',
      'getDefaultCategories',
      'getProducts',
      'getProductsDetails',
    ]);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
      'addCategoryFilter',
      'removeItem',
      'setItem',
    ]);

    apiSpy.getDefaultCategories.and.resolveTo([]);
    apiSpy.getProducts.and.resolveTo([]);
    apiSpy.getProductsDetails.and.resolveTo([]);
    apiSpy.getCategoriesByParentId.and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [BrowseComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrowseComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select the clicked category children before navigating to search', async () => {
    const parent = { id: 'parent-1', name: 'Cloud' };
    const childA = { id: 'child-1', name: 'IaaS' };
    const childB = { id: 'child-2', name: 'PaaS' };
    apiSpy.getCategoriesByParentId.and.resolveTo([childA, childB]);

    await component.onCategoryClick(parent);

    expect(localStorageSpy.removeItem).toHaveBeenCalledWith('selected_categories');
    expect(localStorageSpy.setItem).toHaveBeenCalledWith(SEARCH_ACTIVE_CATEGORY_STORAGE_KEY, 'parent-1');
    expect(localStorageSpy.addCategoryFilter).toHaveBeenCalledWith(childA);
    expect(localStorageSpy.addCategoryFilter).toHaveBeenCalledWith(childB);
    expect(localStorageSpy.addCategoryFilter).not.toHaveBeenCalledWith(parent);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search']);
  });

  it('should fall back to selecting the parent category when no children are available', async () => {
    const parent = { id: 'parent-1', name: 'Cloud' };
    apiSpy.getCategoriesByParentId.and.resolveTo([]);

    await component.onCategoryClick(parent);

    expect(localStorageSpy.addCategoryFilter).toHaveBeenCalledOnceWith(parent);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search']);
  });
});
