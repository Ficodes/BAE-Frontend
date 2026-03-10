import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';
import { environment } from 'src/environments/environment';

import { CreateCatalogComponent } from './create-catalog.component';

describe('CreateCatalogComponent', () => {
  let component: CreateCatalogComponent;
  let fixture: ComponentFixture<CreateCatalogComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateCatalogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateCatalogComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onClick should hide emoji picker when open', () => {
    component.showEmoji = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showEmoji).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('setCatalogData should build catalog payload from form values', () => {
    component.partyId = 'party-1';
    component.generalForm.patchValue({
      name: 'My Catalog',
      description: 'Catalog description',
    });

    component.setCatalogData();

    expect(component.catalogToCreate?.name).toBe('My Catalog');
    expect(component.catalogToCreate?.description).toBe('Catalog description');
    expect(component.catalogToCreate?.lifecycleStatus).toBe('Active');
    expect(component.catalogToCreate?.relatedParty?.[0]?.id).toBe('party-1');
    expect(component.catalogToCreate?.relatedParty?.[0]?.role).toBe(environment.SELLER_ROLE);
  });

  it('goBack should emit seller catalog event', () => {
    spyOn(eventMessage, 'emitSellerCatalog');

    component.goBack();

    expect(eventMessage.emitSellerCatalog).toHaveBeenCalledWith(true);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
