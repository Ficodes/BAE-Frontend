import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';

import { SellerProductSpecComponent } from './seller-product-spec.component';

describe('SellerProductSpecComponent', () => {
  let component: SellerProductSpecComponent;
  let fixture: ComponentFixture<SellerProductSpecComponent>;
  let eventMessage: EventMessageService;
  let productSpecService: ProductSpecServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SellerProductSpecComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerProductSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    productSpecService = TestBed.inject(ProductSpecServiceService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create product spec event', () => {
    spyOn(eventMessage, 'emitSellerCreateProductSpec');

    component.goToCreate();

    expect(eventMessage.emitSellerCreateProductSpec).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update product spec event', () => {
    const prod = { id: 'prod-1' };
    spyOn(eventMessage, 'emitSellerUpdateProductSpec');

    component.goToUpdate(prod);

    expect(eventMessage.emitSellerUpdateProductSpec).toHaveBeenCalledWith(prod);
  });

  it('onSortChange should map sort options and reload product specs', () => {
    const getProdSpecsSpy = spyOn(component, 'getProdSpecs');

    component.onSortChange({ target: { value: 'name' } });
    expect(component.sort).toBe('name');
    expect(getProdSpecsSpy).toHaveBeenCalledWith(false);

    component.onSortChange({ target: { value: 'none' } });
    expect(component.sort).toBeUndefined();
  });

  it('onTypeChange should map bundle filters and reload product specs', () => {
    const getProdSpecsSpy = spyOn(component, 'getProdSpecs');

    component.onTypeChange({ target: { value: 'simple' } });
    expect(component.isBundle).toBeFalse();
    expect(getProdSpecsSpy).toHaveBeenCalledWith(false);

    component.onTypeChange({ target: { value: 'bundle' } });
    expect(component.isBundle).toBeTrue();

    component.onTypeChange({ target: { value: 'all' } });
    expect(component.isBundle).toBeUndefined();
  });

  it('deleteProd should require confirmation before deleting a product spec', () => {
    const updateSpy = spyOn(productSpecService, 'updateProdSpec').and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    spyOn(component, 'getProdSpecs');
    spyOn(component, 'loadStatusCounts');
    const prod = { id: 'prod-2', name: 'Product Spec Two', lifecycleStatus: 'Launched' };

    component.deleteProd(prod);

    expect(component.deleteConfirmation).toBe(prod);
    expect(updateSpy).not.toHaveBeenCalled();

    component.confirmDeleteProd();

    expect(updateSpy).toHaveBeenCalledOnceWith({ lifecycleStatus: 'Retired' }, 'prod-2');
    expect(component.deleteConfirmation).toBeNull();
    expect(component.deleteLoading).toBeFalse();
  });

  it('deleteProd should archive an active product spec as obsolete with one request', () => {
    const updateSpy = spyOn(productSpecService, 'updateProdSpec').and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    spyOn(component, 'getProdSpecs');
    spyOn(component, 'loadStatusCounts');

    component.deleteProd({ id: 'prod-active', lifecycleStatus: 'Active' });
    component.confirmDeleteProd();

    expect(updateSpy).toHaveBeenCalledOnceWith({ lifecycleStatus: 'Obsolete' }, 'prod-active');
  });

  it('should only show actions for draft and validated product specs', () => {
    spyOn(component, 'initProdSpecs');
    component.prodSpecs = [
      { id: 'prod-active', name: 'Active', lifecycleStatus: 'Active' },
      { id: 'prod-launched', name: 'Launched', lifecycleStatus: 'Launched' },
      { id: 'prod-retired', name: 'Retired', lifecycleStatus: 'Retired' },
      { id: 'prod-obsolete', name: 'Obsolete', lifecycleStatus: 'Obsolete' }
    ];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-cy="prodSpecActions"]').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-cy="prodSpecNoActions"]').length).toBe(2);
  });

  it('cancelDeleteProd should clear pending delete without calling API', () => {
    const updateSpy = spyOn(productSpecService, 'updateProdSpec').and.returnValue(of({}) as any);

    component.deleteProd({ id: 'prod-3', name: 'Product Spec Three' });
    component.cancelDeleteProd();

    expect(component.deleteConfirmation).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should include the proxy reason when deleting a product spec fails', () => {
    const proxyReason = 'The user making the request is not the owner of the accessed resource';
    spyOn(productSpecService, 'updateProdSpec').and.returnValue(
      throwError(() => ({ error: { error: proxyReason } })) as any
    );
    const emitSpy = spyOn(eventMessage, 'emitSpecCreated');
    spyOn((component as any).translate, 'instant').and.callFake((key: string, params?: any) => {
      if (key === 'OFFERINGS._product_spec_delete_error') {
        return 'Could not delete this product specification.';
      }
      return `Reason: ${params.reason}`;
    });

    component.deleteProd({ id: 'prod-4', lifecycleStatus: 'Launched' });
    component.confirmDeleteProd();

    expect(emitSpy).toHaveBeenCalledWith(
      `Could not delete this product specification.\nReason: ${proxyReason}`,
      'error'
    );
  });

  it('should use only the generic message when the proxy does not return a reason', () => {
    spyOn(productSpecService, 'updateProdSpec').and.returnValue(
      throwError(() => ({ error: {} })) as any
    );
    const emitSpy = spyOn(eventMessage, 'emitSpecCreated');
    spyOn((component as any).translate, 'instant').and.returnValue(
      'Could not delete this product specification.'
    );

    component.deleteProd({ id: 'prod-5', lifecycleStatus: 'Launched' });
    component.confirmDeleteProd();

    expect(emitSpy).toHaveBeenCalledWith('Could not delete this product specification.', 'error');
  });

  it('should show the proxy reason when product spec validation fails', () => {
    const proxyReason = 'The user making the request is not the owner of the accessed resource';
    spyOn(productSpecService, 'updateProdSpec').and.returnValue(
      throwError(() => ({ error: { error: proxyReason } })) as any
    );
    const emitSpy = spyOn(eventMessage, 'emitSpecCreated');
    spyOn((component as any).translate, 'instant').and.callFake((key: string, params?: any) => {
      if (key === 'CREATE_PROD_SPEC._validate_error') {
        return 'There was an error while validating the product!';
      }
      return `Reason: ${params.reason}`;
    });

    component.validateProd({ id: 'prod-6' });

    expect(emitSpy).toHaveBeenCalledWith(
      `There was an error while validating the product!\nReason: ${proxyReason}`,
      'error'
    );
  });
});
