import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PaginationService } from './pagination.service';
import { ProductOrderService } from './product-order-service.service';
import { AccountServiceService } from './account-service.service';
import { ApiServiceService } from './product-service.service';

describe('PaginationService', () => {
  let service: PaginationService;
  let orderService: ProductOrderService;
  let accountService: AccountServiceService;
  let apiService: ApiServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(PaginationService);
    orderService = TestBed.inject(ProductOrderService);
    accountService = TestBed.inject(AccountServiceService);
    apiService = TestBed.inject(ApiServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getOrders should use federation-aware catalog methods for order item details', async () => {
    const order = {
      id: 'order-1',
      billingAccount: { id: 'billing-1' },
      productOrderItem: [
        {
          id: 'order-item-1',
          productOffering: { id: 'federationRef::offer-1' }
        }
      ]
    };
    const offer = {
      id: 'federationRef::offer-1',
      name: 'Federated offer',
      productSpecification: { id: 'federationRef::spec-1' },
      productOfferingPrice: [{ id: 'federationRef::price-1' }]
    };
    const spec = { id: 'federationRef::spec-1', attachment: [{ id: 'attachment-1' }] };
    const price = { id: 'federationRef::price-1', priceType: 'recurring' };

    spyOn(orderService, 'getProductOrders').and.resolveTo([order]);
    spyOn(accountService, 'getBillingAccountById').and.resolveTo({ id: 'billing-1', name: 'Billing account' });
    spyOn(apiService, 'getSearchProductById').and.resolveTo(offer);
    spyOn(apiService, 'getSearchProductSpecification').and.resolveTo(spec);
    spyOn(apiService, 'getSearchProductPrice').and.resolveTo(price);
    spyOn(apiService, 'getProductById');
    spyOn(apiService, 'getProductSpecification');
    spyOn(apiService, 'getProductPrice');

    const orders = await service.getOrders(0, [], 'party-1', [], 'Buyer');

    expect(orderService.getProductOrders).toHaveBeenCalledWith('party-1', 0, [], 'Buyer', []);
    expect(apiService.getSearchProductById).toHaveBeenCalledWith('federationRef::offer-1');
    expect(apiService.getSearchProductSpecification).toHaveBeenCalledWith('federationRef::spec-1');
    expect(apiService.getSearchProductPrice).toHaveBeenCalledWith('federationRef::price-1');
    expect(apiService.getProductById).not.toHaveBeenCalled();
    expect(apiService.getProductSpecification).not.toHaveBeenCalled();
    expect(apiService.getProductPrice).not.toHaveBeenCalled();
    expect(orders[0].productOrderItems[0].attachment).toEqual(spec.attachment);
  });
});
