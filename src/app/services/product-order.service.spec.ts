import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProductOrderService } from './product-order-service.service';

describe('ProductOrderService', () => {
  let service: ProductOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ProductOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
