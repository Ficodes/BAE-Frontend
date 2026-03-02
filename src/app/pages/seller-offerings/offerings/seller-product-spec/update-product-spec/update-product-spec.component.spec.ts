import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { UpdateProductSpecComponent } from './update-product-spec.component';

describe('UpdateProductSpecComponent', () => {
  let component: UpdateProductSpecComponent;
  let fixture: ComponentFixture<UpdateProductSpecComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateProductSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateProductSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    component.prod = {
      id: 'prod-1',
      name: 'Product',
      description: 'Description',
      lifecycleStatus: 'Active',
      productSpecCharacteristic: [],
      resourceSpecification: [],
      serviceSpecification: [],
      attachment: [],
      productSpecificationRelationship: [],
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onClick should hide emoji and upload panel when open', () => {
    component.showEmoji = true;
    component.showUploadFile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showEmoji).toBeFalse();
    expect(component.showUploadFile).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('onTypeChange should switch characteristic input type flags', () => {
    component.onTypeChange({ target: { value: 'number' } });
    expect(component.stringCharSelected).toBeFalse();
    expect(component.numberCharSelected).toBeTrue();
    expect(component.rangeCharSelected).toBeFalse();

    component.onTypeChange({ target: { value: 'range' } });
    expect(component.stringCharSelected).toBeFalse();
    expect(component.numberCharSelected).toBeFalse();
    expect(component.rangeCharSelected).toBeTrue();
  });

  it('goBack should emit seller product spec event', () => {
    spyOn(eventMessage, 'emitSellerProductSpec');

    component.goBack();

    expect(eventMessage.emitSellerProductSpec).toHaveBeenCalledWith(false);
  });

  it('canNavigate should depend on general form validity', () => {
    expect(component.canNavigate(0)).toBeFalse();

    component.generalForm.patchValue({
      name: 'My Product',
      brand: 'Brand',
      version: '1.0',
    });

    expect(component.canNavigate(0)).toBeTrue();
  });
});
