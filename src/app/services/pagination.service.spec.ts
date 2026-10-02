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
