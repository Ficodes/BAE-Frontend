import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { SellerServiceSpecComponent } from './seller-service-spec.component';

describe('SellerServiceSpecComponent', () => {
  let component: SellerServiceSpecComponent;
  let fixture: ComponentFixture<SellerServiceSpecComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerServiceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerServiceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create service spec event', () => {
    spyOn(eventMessage, 'emitSellerCreateServiceSpec');

    component.goToCreate();

    expect(eventMessage.emitSellerCreateServiceSpec).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update service spec event', () => {
    const serv = { id: 'serv-1' };
    spyOn(eventMessage, 'emitSellerUpdateServiceSpec');

    component.goToUpdate(serv);

    expect(eventMessage.emitSellerUpdateServiceSpec).toHaveBeenCalledWith(serv);
  });

  it('onSortChange should map sort options and reload service specs', () => {
    const getServSpecsSpy = spyOn(component, 'getServSpecs');

    component.onSortChange({ target: { value: 'name' } });
    expect(component.sort).toBe('name');
    expect(getServSpecsSpy).toHaveBeenCalledWith(false);

    component.onSortChange({ target: { value: 'none' } });
    expect(component.sort).toBeUndefined();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
