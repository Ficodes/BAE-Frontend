import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProductInventoryServiceService } from './product-inventory-service.service';

describe('ProductInventoryServiceService', () => {
  let service: ProductInventoryServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ProductInventoryServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
