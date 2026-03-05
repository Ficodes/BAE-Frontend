import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { UpdateServiceSpecComponent } from './update-service-spec.component';

describe('UpdateServiceSpecComponent', () => {
  let component: UpdateServiceSpecComponent;
  let fixture: ComponentFixture<UpdateServiceSpecComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateServiceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateServiceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    component.serv = {
      id: 'serv-1',
      name: 'Service Spec',
      description: 'Service description',
      lifecycleStatus: 'Active',
      specCharacteristic: [],
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setServStatus should update status and trigger detectChanges', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.setServStatus('Launched');

    expect(component.servStatus).toBe('Launched');
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

  it('goBack should emit seller service spec event', () => {
    spyOn(eventMessage, 'emitSellerServiceSpec');

    component.goBack();

    expect(eventMessage.emitSellerServiceSpec).toHaveBeenCalledWith(true);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
