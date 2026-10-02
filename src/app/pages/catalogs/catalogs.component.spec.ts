import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { CatalogsComponent } from './catalogs.component';
import { ThemeService } from 'src/app/services/theme.service';
import { CataloguesDirectorySourceFactory } from './catalogues-directory-source.factory';
import { CataloguesDirectoryCard, CataloguesDirectorySource } from './catalogues-directory.model';

describe('CatalogsComponent', () => {
  let component: CatalogsComponent;
  let fixture: ComponentFixture<CatalogsComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let themeSubject: BehaviorSubject<any>;
  let directorySource: jasmine.SpyObj<CataloguesDirectorySource>;
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeEach(async () => {
    directorySource = jasmine.createSpyObj<CataloguesDirectorySource>('CataloguesDirectorySource', ['loadPage', 'routeFor'], {
      mode: 'catalog'
    });
    directorySource.loadPage.and.returnValue(Promise.resolve({
      items: [],
      continuationToken: null,
      hasMore: false
    }));
    directorySource.routeFor.and.callFake((card: CataloguesDirectoryCard) => ['/search/catalogue', card.id]);

    themeSubject = new BehaviorSubject<any>(null);

    await TestBed.configureTestingModule({
      declarations: [CatalogsComponent],
      imports: [ReactiveFormsModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        {
          provide: CataloguesDirectorySourceFactory,
          useValue: {
            getSource: () => directorySource
          }
        },
        {
          provide: ThemeService,
          useValue: {
            currentTheme$: themeSubject.asObservable()
          }
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
    fixture = TestBed.createComponent(CatalogsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request the initial launched catalog page without a continuation token', async () => {
    directorySource.loadPage.and.returnValue(
      Promise.resolve({
        items: [card('catalog-1', 'Catalog 1')],
        continuationToken: null,
        hasMore: false
      })
    );

    await component.getProviders(false);

    expect(directorySource.loadPage).toHaveBeenCalledTimes(1);
    expect(directorySource.loadPage.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      offset: 0,
      limit: component.CATALOG_LIMIT,
      keyword: undefined,
      continuationToken: null
    }));
    expect(component.providers.map(provider => provider.id)).toEqual(['catalog-1']);
    expect(component.hasPrefetchedPage).toBeFalse();
  });

  it('should store the returned continuation token and show load more', async () => {
    directorySource.loadPage.and.returnValues(
      Promise.resolve({ items: [card('catalog-1', 'Catalog 1')], continuationToken: 'token-page-1', hasMore: true }),
      Promise.resolve({ items: [card('catalog-2', 'Catalog 2')], continuationToken: 'token-page-2', hasMore: true })
    );

    await component.getProviders(false);

    expect(directorySource.loadPage).toHaveBeenCalledTimes(2);
    expect(directorySource.loadPage.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      offset: component.CATALOG_LIMIT,
      limit: component.CATALOG_LIMIT,
      continuationToken: 'token-page-1'
    }));
    expect(component.providers.map(provider => provider.id)).toEqual(['catalog-1']);
    expect(component.hasPrefetchedPage).toBeTrue();
    expect((component as any).paginationToken).toBe('token-page-2');
  });

  it('should send the stored continuation token when loading more catalogs', async () => {
    directorySource.loadPage.and.returnValues(
      Promise.resolve({ items: [card('catalog-1', 'Catalog 1')], continuationToken: 'token-page-1', hasMore: true }),
      Promise.resolve({ items: [card('catalog-2', 'Catalog 2')], continuationToken: 'token-page-2', hasMore: true }),
      Promise.resolve({ items: [card('catalog-3', 'Catalog 3')], continuationToken: 'token-page-3', hasMore: true })
    );

    await component.getProviders(false);
    await component.next();

    expect(directorySource.loadPage.calls.argsFor(2)[0]).toEqual(jasmine.objectContaining({
      offset: component.CATALOG_LIMIT * 2,
      limit: component.CATALOG_LIMIT,
      continuationToken: 'token-page-2'
    }));
    expect(component.providers.map(provider => provider.id)).toEqual(['catalog-1', 'catalog-2']);
    expect(component.hasPrefetchedPage).toBeTrue();
    expect((component as any).paginationToken).toBe('token-page-3');
  });

  it('should reveal the prefetched page and disable load more when there is no further continuation token', async () => {
    directorySource.loadPage.and.returnValues(
      Promise.resolve({ items: [card('catalog-1', 'Catalog 1')], continuationToken: 'token-page-1', hasMore: true }),
      Promise.resolve({ items: [card('catalog-2', 'Catalog 2')], continuationToken: null, hasMore: false })
    );

    await component.getProviders(false);
    await component.next();

    expect(directorySource.loadPage.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({
      offset: component.CATALOG_LIMIT,
      limit: component.CATALOG_LIMIT,
      continuationToken: 'token-page-1'
    }));
    expect(directorySource.loadPage).toHaveBeenCalledTimes(2);
    expect(component.providers.map(provider => provider.id)).toEqual(['catalog-1', 'catalog-2']);
    expect(component.hasPrefetchedPage).toBeFalse();
    expect((component as any).paginationToken).toBeNull();
  });

  it('should clear the continuation token when the search filter changes', async () => {
    (component as any).paginationToken = 'stale-token';
    component.searchField.setValue('cloud');
    directorySource.loadPage.and.returnValues(
      Promise.resolve({ items: [card('catalog-1', 'Cloud catalog')], continuationToken: null, hasMore: false }),
      Promise.resolve({ items: [], continuationToken: null, hasMore: false })
    );

    component.filterProviders();
    await flushPromises();

    expect(directorySource.loadPage.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      offset: 0,
      keyword: 'cloud',
      continuationToken: null
    }));
    expect((component as any).paginationToken).toBeNull();
  });

  it('should reset the token and reload catalogs when sort changes', async () => {
    (component as any).paginationToken = 'stale-token';
    directorySource.loadPage.and.returnValues(
      Promise.resolve({ items: [card('catalog-1', 'Cloud catalog')], continuationToken: null, hasMore: false }),
      Promise.resolve({ items: [], continuationToken: null, hasMore: false })
    );

    component.selectSort('name_asc', new Event('click'));
    await flushPromises();

    expect(directorySource.loadPage.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
      offset: 0,
      keyword: undefined,
      continuationToken: null
    }));
    expect(component.sortOption).toBe('name_asc');
    expect((component as any).paginationToken).toBeNull();
  });

  it('should navigate using the selected directory source route', () => {
    const selected = card('cat-123', 'Catalog');

    component.goToProvider(selected);

    expect(directorySource.routeFor).toHaveBeenCalledWith(selected);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search/catalogue', 'cat-123']);
  });

  it('should close the sort dropdown on document click', () => {
    component.showSortDropdown = true;
    const detectChangesSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showSortDropdown).toBeFalse();
    expect(detectChangesSpy).toHaveBeenCalled();
  });

  it('should detect long words and handle undefined values', () => {
    expect(component.hasLongWord('short words only', 20)).toBeFalse();
    expect(component.hasLongWord('this_contains_a_reallyreallyreallylongtoken', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });

  function card(id: string, name: string): CataloguesDirectoryCard {
    return {
      id,
      name,
      description: '',
      logo: '',
      mode: 'catalog'
    };
  }
});
