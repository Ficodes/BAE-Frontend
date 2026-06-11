import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductOrderService } from './product-order-service.service';
import { environment } from 'src/environments/environment';

describe('ProductOrderService', () => {
  let service: ProductOrderService;
  let httpMock: HttpTestingController;
  let federationEnabled: boolean;

  beforeEach(() => {
    federationEnabled = environment.FEDERATION_ENABLED;
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ProductOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.FEDERATION_ENABLED = federationEnabled;
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('postProductOrder should include target as query parameter when provided', () => {
    const payload = { productOrderItem: [] };
    const target = 'federationRef::target';

    service.postProductOrder(payload, target).subscribe((response) => {
      expect(response.body).toEqual({ id: 'order-1' });
    });

    const req = httpMock.expectOne(request =>
      request.url === `${environment.BASE_URL}${environment.PRODUCT_ORDER}/productOrder` &&
      request.params.get('target') === target
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'order-1' });
  });

  it('getProductOrders should use ordering endpoint when federation is disabled', async () => {
    environment.FEDERATION_ENABLED = false;
    const responseBody = [{ id: 'order-1' }];

    const promise = service.getProductOrders('party-1', 0, ['acknowledged'], 'Buyer', ['add']);
    const req = httpMock.expectOne(
      `${environment.BASE_URL}${environment.PRODUCT_ORDER}/productOrder?limit=${environment.ORDER_LIMIT}&offset=0&relatedParty.id=party-1&relatedParty.role=Buyer&state=acknowledged&productOrderItem.action=add`
    );

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('getProductOrders should use federation ordering endpoint when federation is enabled', async () => {
    environment.FEDERATION_ENABLED = true;
    const responseBody = [{ id: 'order-1' }];

    const promise = service.getProductOrders('party-1', 10, [], 'Seller');
    const req = httpMock.expectOne(
      `${environment.BASE_URL}/federation${environment.PRODUCT_ORDER}/productOrder?limit=${environment.ORDER_LIMIT}&offset=10&relatedParty.id=party-1&relatedParty.role=Seller`
    );

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });
});
