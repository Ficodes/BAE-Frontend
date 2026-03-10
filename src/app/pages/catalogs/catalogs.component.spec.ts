import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { CatalogsComponent } from './catalogs.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { environment } from 'src/environments/environment';

describe('CatalogsComponent', () => {
  let component: CatalogsComponent;
  let fixture: ComponentFixture<CatalogsComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiServiceService>;
  let paginationServiceSpy: jasmine.SpyObj<PaginationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getCatalogs']);
    apiServiceSpy.getCatalogs.and.returnValue(Promise.resolve([] as any));

    paginationServiceSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated']);
    paginationServiceSpy.getItemsPaginated.and.returnValue(
      Promise.resolve({
        page_check: true,
        items: [],
        nextItems: [],
        page: 0,
      }),
    );

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [CatalogsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiServiceSpy },
        { provide: PaginationService, useValue: paginationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set loading and request catalogs', () => {
    spyOn(component, 'getCatalogs');
    spyOn(document, 'querySelector').and.returnValue(null);

    component.ngOnInit();

    expect(component.loading).toBeTrue();
    expect(component.getCatalogs).toHaveBeenCalledWith(false);
  });

  it('ngOnInit should register input listener and reset filter when search field is empty', () => {
    let inputListener: ((event: Event) => void) | undefined;
    const inputMock = {
      addEventListener: (_name: string, callback: (event: Event) => void) => {
        inputListener = callback;
      },
    };
    spyOn(document, 'querySelector').and.returnValue(inputMock as any);
    spyOn(component, 'getCatalogs');
    component.searchField.setValue('seed');

    component.ngOnInit();
    expect(component.getCatalogs).toHaveBeenCalledWith(false);

    component.searchField.setValue('');
    inputListener!(new Event('input'));

    expect(component.filter).toBeUndefined();
    expect(component.getCatalogs).toHaveBeenCalledTimes(2);
    expect(component.getCatalogs).toHaveBeenCalledWith(false);
  });

  it('getCatalogs should call pagination service and update state while filtering out default catalog', async () => {
    const defaultCatalog = { id: environment.DFT_CATALOG_ID, name: 'Default' } as any;
    const customCatalog = { id: 'custom-cat', name: 'Custom' } as any;

    paginationServiceSpy.getItemsPaginated.and.returnValue(
      Promise.resolve({
        page_check: false,
        items: [defaultCatalog, customCatalog],
        nextItems: [{ id: 'next-cat' }],
        page: 3,
      }),
    );

    component.loading = false;
    component.loading_more = true;

    await component.getCatalogs(false);
    await flushPromises();

    const args = paginationServiceSpy.getItemsPaginated.calls.mostRecent().args;
    expect(args[0]).toBe(0);
    expect(args[1]).toBe(component.CATALOG_LIMIT);
    expect(args[2]).toBeFalse();
    expect(args[5]).toEqual({ keywords: undefined });
    expect(typeof args[6]).toBe('function');

    expect(component.page_check).toBeFalse();
    expect(component.catalogs).toEqual([customCatalog]);
    expect(component.nextCatalogs).toEqual([{ id: 'next-cat' } as any]);
    expect(component.page).toBe(3);
    expect(component.loading).toBeFalse();
    expect(component.loading_more).toBeFalse();
  });

  it('filterCatalogs should reset page and call getCatalogs with filter value', () => {
    spyOn(component, 'getCatalogs');
    component.page = 8;
    component.searchField.setValue('my-catalog');

    component.filterCatalogs();

    expect(component.filter).toBe('my-catalog');
    expect(component.page).toBe(0);
    expect(component.getCatalogs).toHaveBeenCalledWith(false);
  });

  it('next should request next page', async () => {
    spyOn(component, 'getCatalogs').and.returnValue(Promise.resolve());

    await component.next();

    expect(component.getCatalogs).toHaveBeenCalledWith(true);
  });

  it('goToCatalogSearch should navigate to catalog route', () => {
    component.goToCatalogSearch('cat-123');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search/catalogue', 'cat-123']);
  });

  it('showFullDesc should set visible description and selected catalog', () => {
    const cat = { id: 'cat-1', name: 'Catalog 1' };

    component.showFullDesc(cat);

    expect(component.showDesc).toBeTrue();
    expect(component.showingCat).toBe(cat);
  });

  it('onClick should close details and trigger change detection when description is open', () => {
    component.showDesc = true;
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showDesc).toBeFalse();
    expect(cdrSpy).toHaveBeenCalled();
  });

  it('onClick should do nothing when description is closed', () => {
    component.showDesc = false;
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showDesc).toBeFalse();
    expect(cdrSpy).not.toHaveBeenCalled();
  });

  it('hasLongWord should detect words over threshold and handle undefined values', () => {
    expect(component.hasLongWord('short words only', 20)).toBeFalse();
    expect(component.hasLongWord('this_contains_a_reallyreallyreallylongtoken', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
