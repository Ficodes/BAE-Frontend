import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';

import { CreateResourceSpecComponent } from './create-resource-spec.component';

describe('CreateResourceSpecComponent', () => {
  let component: CreateResourceSpecComponent;
  let fixture: ComponentFixture<CreateResourceSpecComponent>;
  let eventMessage: EventMessageService;
  let resourceSpecService: ResourceSpecServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateResourceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateResourceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    resourceSpecService = TestBed.inject(ResourceSpecServiceService);
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

  it('goBack should emit seller resource spec event', () => {
    spyOn(eventMessage, 'emitSellerResourceSpec');

    component.goBack();

    expect(eventMessage.emitSellerResourceSpec).toHaveBeenCalledWith(true);
  });

  it('should leave directly when leaving resource spec creation without draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerResourceSpec');

    component.onBackClick();

    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should show the leave modal when leaving resource spec creation with draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerResourceSpec');
    component.generalForm.patchValue({ name: 'Draft resource' });

    component.onBackClick();

    expect(component.showLeaveModal).toBeTrue();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should keep the leave modal open when saving resource draft without mandatory data', () => {
    const saveSpy = spyOn(resourceSpecService, 'postResSpec');
    component.showLeaveModal = true;
    component.generalForm.patchValue({ description: 'Draft description' });

    component.confirmLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
  });

  it('should discard resource spec draft changes without saving them', () => {
    const saveSpy = spyOn(resourceSpecService, 'postResSpec');
    const backSpy = spyOn(eventMessage, 'emitSellerResourceSpec');
    component.showLeaveModal = true;

    component.discardLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should save a valid resource spec draft when confirming leave', () => {
    const saveSpy = spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'res-1' }) as any);
    component.showLeaveModal = true;
    component.generalForm.patchValue({ name: 'Draft resource', description: 'Resource overview' });

    component.confirmLeave();

    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Draft resource',
      lifecycleStatus: 'Active'
    }) as any);
    expect(component.showLeaveModal).toBeFalse();
  });

  it('should open resource spec leave modal when the header leave event is emitted', () => {
    component.generalForm.patchValue({ name: 'Draft resource' });

    eventMessage.emitLeaveResourceSpecEditorRequest();

    expect(component.showLeaveModal).toBeTrue();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
