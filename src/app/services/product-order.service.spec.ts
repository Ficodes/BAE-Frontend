import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductOrderService } from './product-order-service.service';
import { environment } from 'src/environments/environment';

describe('ProductOrderService', () => {
  let service: ProductOrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ProductOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
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
});
