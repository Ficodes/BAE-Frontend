import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { SellerProductSpecComponent } from './seller-product-spec.component';

describe('SellerProductSpecComponent', () => {
  let component: SellerProductSpecComponent;
  let fixture: ComponentFixture<SellerProductSpecComponent>;
  let eventMessage: EventMessageService;

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
});
