import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { CreateOfferComponent } from './create-offer.component';

describe('CreateOfferComponent', () => {
  let component: CreateOfferComponent;
  let fixture: ComponentFixture<CreateOfferComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [CreateOfferComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateOfferComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onClick should close floating panels when open', () => {
    component.showEmoji = true;
    component.showPriceComponents = true;
    component.showProfile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showEmoji).toBeFalse();
    expect(component.showPriceComponents).toBeFalse();
    expect(component.showProfile).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('goBack should emit seller offer event', () => {
    spyOn(eventMessage, 'emitSellerOffer');

    component.goBack();

    expect(eventMessage.emitSellerOffer).toHaveBeenCalledWith(true);
  });

  it('toggleGeneral should reset section visibility', () => {
    component.showGeneral = false;
    component.showBundle = true;
    component.showSummary = true;
    component.showPreview = true;
    spyOn(component, 'selectStep');

    component.toggleGeneral();

    expect(component.showGeneral).toBeTrue();
    expect(component.showBundle).toBeFalse();
    expect(component.showSummary).toBeFalse();
    expect(component.showPreview).toBeFalse();
    expect(component.selectStep).toHaveBeenCalledWith('general-info', 'general-circle');
  });
});
