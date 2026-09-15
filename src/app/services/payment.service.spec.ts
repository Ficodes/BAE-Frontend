import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should forward payment provider parameters', () => {
    service.completePayment({
      action: 'accept',
      ref: 'order-1',
      client: 'redsys',
      sig: 'internal-signature',
      Ds_MerchantParameters: 'merchant-parameters',
      Ds_Signature: 'redsys-signature',
      Ds_SignatureVersion: 'HMAC_SHA512_V2',
      futureProviderParam: 'future-value'
    }).subscribe();

    const request = httpMock.expectOne(
      `${PaymentService.BASE_URL}${PaymentService.CHARGING}/api/orderManagement/orders/confirm/`
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      Ds_MerchantParameters: 'merchant-parameters',
      Ds_Signature: 'redsys-signature',
      Ds_SignatureVersion: 'HMAC_SHA512_V2',
      futureProviderParam: 'future-value',
      confirm_action: 'accept',
      reference: 'order-1',
      client: 'redsys',
      signature: 'internal-signature'
    });

    request.flush({});
  });
});
