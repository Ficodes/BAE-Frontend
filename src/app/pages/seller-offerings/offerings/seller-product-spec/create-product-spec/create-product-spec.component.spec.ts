import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { CreateProductSpecComponent } from './create-product-spec.component';

describe('CreateProductSpecComponent', () => {
  let component: CreateProductSpecComponent;
  let fixture: ComponentFixture<CreateProductSpecComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateProductSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateProductSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
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

    expect(eventMessage.emitSellerProductSpec).toHaveBeenCalledWith(true);
  });

  it('canNavigate should depend on general form validity and step index', () => {
    component.currentStep = 0;
    component.highestStep = 0;
    expect(component.canNavigate(0)).toBeFalse();

    component.generalForm.patchValue({
      name: 'My Product',
      brand: 'Brand',
      version: '1.0',
    });

    expect(component.canNavigate(0)).toBeTrue();
    expect(component.canNavigate(1)).toBeFalse();
  });
});
