import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PaginationService } from './pagination.service';
import { ApiServiceService } from './product-service.service';

describe('PaginationService', () => {
  let service: PaginationService;
  let api: ApiServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(PaginationService);
    api = TestBed.inject(ApiServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not prefetch after a short or empty initial page when requested', async () => {
    for (const items of [[], [{ id: '1' }, { id: '2' }, { id: '3' }]]) {
      const handler = jasmine.createSpy('handler').and.resolveTo(items);
      const result = await service.getItemsPaginated(0, 6, false, [], [], { stopOnShortPage: true }, handler);

      expect(handler).toHaveBeenCalledOnceWith(0);
      expect(result.items).toEqual(items);
      expect(result.nextItems).toEqual([]);
      expect(result.page_check).toBeFalse();
    }
  });

  it('should append a short buffered page without fetching again', async () => {
    const firstPage = Array.from({ length: 6 }, (_, id) => ({ id }));
    const lastPage = [{ id: 6 }, { id: 7 }];
    const handler = jasmine.createSpy('handler').and.returnValues(Promise.resolve(firstPage), Promise.resolve(lastPage));
    const options = { stopOnShortPage: true };
    const first = await service.getItemsPaginated(0, 6, false, [], [], options, handler);

    expect(first.page_check).toBeTrue();
    expect(first.items).toEqual(firstPage);
    expect(first.nextItems).toEqual(lastPage);

    const last = await service.getItemsPaginated(first.page, 6, true, first.items, first.nextItems, options, handler);
    expect(handler.calls.allArgs()).toEqual([[0], [6]]);
    expect(last.items.map((item: any) => item.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(last.nextItems).toEqual([]);
    expect(last.page_check).toBeFalse();
  });

  it('should stop when prefetching returns an empty page', async () => {
    const page = Array.from({ length: 6 }, (_, id) => ({ id }));
    const handler = jasmine.createSpy('handler').and.returnValues(Promise.resolve(page), Promise.resolve([]));
    const result = await service.getItemsPaginated(0, 6, false, [], [], { stopOnShortPage: true }, handler);

    expect(handler.calls.allArgs()).toEqual([[0], [6]]);
    expect(result.items).toEqual(page);
    expect(result.page_check).toBeFalse();
  });

  it('should continue prefetching full pages', async () => {
    const pages = [0, 6, 12].map(offset => Array.from({ length: 6 }, (_, id) => ({ id: offset + id })));
    const handler = jasmine.createSpy('handler').and.callFake((offset: number) => Promise.resolve(pages[offset / 6]));
    const options = { stopOnShortPage: true };
    const first = await service.getItemsPaginated(0, 6, false, [], [], options, handler);
    const next = await service.getItemsPaginated(first.page, 6, true, first.items, first.nextItems, options, handler);

    expect(handler.calls.allArgs()).toEqual([[0], [6], [12]]);
    expect(next.items.length).toBe(12);
    expect(next.nextItems).toEqual(pages[2]);
    expect(next.page_check).toBeTrue();
  });

  it('should retain prefetching after short pages for existing callers', async () => {
    const handler = jasmine.createSpy('handler').and.returnValues(Promise.resolve([{ id: '1' }]), Promise.resolve([]));
    const result = await service.getItemsPaginated(0, 6, false, [], [], {}, handler);

    expect(handler.calls.allArgs()).toEqual([[0], [6]]);
    expect(result.page_check).toBeFalse();
  });

  it('should pass catalog keywords to unfiltered and category-filtered catalog product requests', async () => {
    const getByCatalogSpy = spyOn(api, 'getProductsByCatalog').and.resolveTo([]);
    const getByCategoryAndCatalogSpy = spyOn(api, 'getProductsByCategoryAndCatalog').and.resolveTo([]);

    await service.getProductsByCatalog(0, 'edge', [], 'catalog-1');
    expect(getByCatalogSpy).toHaveBeenCalledWith('catalog-1', 0, 'edge');

    await service.getProductsByCatalog(0, 'edge', [{ id: 'category-1', name: 'IaaS' }], 'catalog-1');
    expect(getByCategoryAndCatalogSpy).toHaveBeenCalledWith(
      [{ id: 'category-1', name: 'IaaS' }],
      'catalog-1',
      0,
      'edge'
    );
  });
});
