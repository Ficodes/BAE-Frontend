import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';

import { CreateServiceSpecComponent } from './create-service-spec.component';

describe('CreateServiceSpecComponent', () => {
  let component: CreateServiceSpecComponent;
  let fixture: ComponentFixture<CreateServiceSpecComponent>;
  let eventMessage: EventMessageService;
  let serviceSpecService: ServiceSpecServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateServiceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateServiceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    serviceSpecService = TestBed.inject(ServiceSpecServiceService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onTypeChange should toggle characteristic type flags', () => {
    component.onTypeChange({ target: { value: 'number' } });
    expect(component.stringCharSelected).toBeFalse();
    expect(component.numberCharSelected).toBeTrue();
    expect(component.rangeCharSelected).toBeFalse();

    component.onTypeChange({ target: { value: 'range' } });
    expect(component.stringCharSelected).toBeFalse();
    expect(component.numberCharSelected).toBeFalse();
    expect(component.rangeCharSelected).toBeTrue();
  });

  it('addCharValue should create default string characteristic value', () => {
    component.stringCharSelected = true;
    component.stringValue = 'basic';

    component.addCharValue();

    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[0].value).toBe('basic' as any);
    expect(component.stringValue).toBe('');
  });

  it('goBack should emit seller service spec event', () => {
    spyOn(eventMessage, 'emitSellerServiceSpec');

    component.goBack();

    expect(eventMessage.emitSellerServiceSpec).toHaveBeenCalledWith(true);
  });

  it('should leave directly when leaving service spec creation without draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerServiceSpec');

    component.onBackClick();

    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should show the leave modal when leaving service spec creation with draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerServiceSpec');
    component.generalForm.patchValue({ name: 'Draft service' });

    component.onBackClick();

    expect(component.showLeaveModal).toBeTrue();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should keep the leave modal open when saving service draft without mandatory data', () => {
    const saveSpy = spyOn(serviceSpecService, 'postServSpec');
    component.showLeaveModal = true;
    component.generalForm.patchValue({ description: 'Draft description' });

    component.confirmLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
  });

  it('should discard service spec draft changes without saving them', () => {
    const saveSpy = spyOn(serviceSpecService, 'postServSpec');
    const backSpy = spyOn(eventMessage, 'emitSellerServiceSpec');
    component.showLeaveModal = true;

    component.discardLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should save a valid service spec draft when confirming leave', () => {
    const saveSpy = spyOn(serviceSpecService, 'postServSpec').and.returnValue(of({ id: 'serv-1' }) as any);
    component.showLeaveModal = true;
    component.generalForm.patchValue({ name: 'Draft service', description: 'Service overview' });

    component.confirmLeave();

    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Draft service',
      lifecycleStatus: 'Active'
    }) as any);
    expect(component.showLeaveModal).toBeFalse();
  });

  it('should open service spec leave modal when the header leave event is emitted', () => {
    component.generalForm.patchValue({ name: 'Draft service' });

    eventMessage.emitLeaveServiceSpecEditorRequest();

    expect(component.showLeaveModal).toBeTrue();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
