import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { UpdateCatalogComponent } from './update-catalog.component';

describe('UpdateCatalogComponent', () => {
  let component: UpdateCatalogComponent;
  let fixture: ComponentFixture<UpdateCatalogComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateCatalogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateCatalogComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    component.cat = {
      id: 'cat-1',
      name: 'Current Catalog',
      description: 'Current description',
      lifecycleStatus: 'Active',
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setCatStatus should update status and trigger change detection', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.setCatStatus('Launched');

    expect(component.catStatus).toBe('Launched');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('setCatalogData should include changed name and status', () => {
    component.catStatus = 'Launched';
    component.generalForm.patchValue({ name: 'Updated Catalog', description: 'New desc' });

    component.setCatalogData();

    expect(component.catalogToUpdate?.description).toBe('New desc');
    expect(component.catalogToUpdate?.lifecycleStatus).toBe('Launched');
    expect(component.catalogToUpdate?.name).toBe('Updated Catalog');
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
