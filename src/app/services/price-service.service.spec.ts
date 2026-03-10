import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PriceServiceService } from './price-service.service';

describe('PriceServiceService', () => {
  let service: PriceServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(PriceServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
