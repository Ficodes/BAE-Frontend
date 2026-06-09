import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PriceServiceService } from './price-service.service';
import { environment } from 'src/environments/environment';

describe('PriceServiceService', () => {
  let service: PriceServiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(PriceServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isCustomOffering should use already loaded priceType without fetching the price again', async () => {
    const result = await service.isCustomOffering({
      productOfferingPrice: [{ id: 'federationRef::price-1', priceType: 'custom' }]
    } as any);

    expect(result).toBeTrue();
  });

  it('isCustomOffering should fetch the price only when priceType is not loaded', async () => {
    const resultPromise = service.isCustomOffering({
      productOfferingPrice: [{ id: 'price-1' }]
    } as any);

    const req = httpMock.expectOne(`${environment.BASE_URL}${environment.PRODUCT_CATALOG}/productOfferingPrice/price-1`);
    req.flush({ priceType: 'custom' });

    await expectAsync(resultPromise).toBeResolvedTo(true);
  });

  it('isCustomOffering should not fetch missing priceType when fallback fetching is disabled', async () => {
    const result = await service.isCustomOffering({
      productOfferingPrice: [{ id: 'federationRef::price-1' }]
    } as any, false);

    expect(result).toBeFalse();
  });
});
