import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProductSpecServiceService } from './product-spec-service.service';

describe('ProductSpecServiceService', () => {
  let service: ProductSpecServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ProductSpecServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
