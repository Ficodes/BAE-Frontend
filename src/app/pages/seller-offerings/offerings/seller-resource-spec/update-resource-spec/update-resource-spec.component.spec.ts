import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { UpdateResourceSpecComponent } from './update-resource-spec.component';

describe('UpdateResourceSpecComponent', () => {
  let component: UpdateResourceSpecComponent;
  let fixture: ComponentFixture<UpdateResourceSpecComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateResourceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateResourceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    component.res = {
      id: 'res-1',
      name: 'Resource Spec',
      description: 'Resource description',
      lifecycleStatus: 'Active',
      resourceSpecCharacteristic: [],
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setResStatus should update status and trigger detectChanges', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.setResStatus('Launched');

    expect(component.resStatus).toBe('Launched');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('onTypeChange should toggle characteristic type flags', () => {
    component.onTypeChange({ target: { value: 'number' } });
    expect(component.numberCharSelected).toBeTrue();
    expect(component.stringCharSelected).toBeFalse();
    expect(component.rangeCharSelected).toBeFalse();

    component.onTypeChange({ target: { value: 'range' } });
    expect(component.rangeCharSelected).toBeTrue();
  });

  it('goBack should emit seller resource spec event', () => {
    spyOn(eventMessage, 'emitSellerResourceSpec');

    component.goBack();

    expect(eventMessage.emitSellerResourceSpec).toHaveBeenCalledWith(true);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
