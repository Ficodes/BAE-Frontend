import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';

import { SellerResourceSpecComponent } from './seller-resource-spec.component';

describe('SellerResourceSpecComponent', () => {
  let component: SellerResourceSpecComponent;
  let fixture: ComponentFixture<SellerResourceSpecComponent>;
  let eventMessage: EventMessageService;
  let resourceSpecService: ResourceSpecServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerResourceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerResourceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    resourceSpecService = TestBed.inject(ResourceSpecServiceService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create resource spec event', () => {
    spyOn(eventMessage, 'emitSellerCreateResourceSpec');

    component.goToCreate();

    expect(eventMessage.emitSellerCreateResourceSpec).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update resource spec event', () => {
    const res = { id: 'res-1' };
    spyOn(eventMessage, 'emitSellerUpdateResourceSpec');

    component.goToUpdate(res);

    expect(eventMessage.emitSellerUpdateResourceSpec).toHaveBeenCalledWith(res);
  });

  it('onSortChange should map sort options and reload resource specs', () => {
    const getResSpecsSpy = spyOn(component, 'getResSpecs');

    component.onSortChange({ target: { value: 'name' } });
    expect(component.sort).toBe('name');
    expect(getResSpecsSpy).toHaveBeenCalledWith(false);

    component.onSortChange({ target: { value: 'none' } });
    expect(component.sort).toBeUndefined();
  });

  it('deleteRes should require confirmation before deleting a resource spec', () => {
    const updateSpy = spyOn(resourceSpecService, 'updateResSpec').and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    spyOn(component, 'getResSpecs');
    spyOn(component, 'loadStatusCounts');
    const res = { id: 'res-2', name: 'Resource Spec Two', lifecycleStatus: 'Launched' };

    component.deleteRes(res);

    expect(component.deleteConfirmation).toBe(res);
    expect(updateSpy).not.toHaveBeenCalled();

    component.confirmDeleteRes();

    expect(updateSpy).toHaveBeenCalledWith({ lifecycleStatus: 'Retired' }, 'res-2');
    expect(component.deleteConfirmation).toBeNull();
    expect(component.deleteLoading).toBeFalse();
  });

  it('cancelDeleteRes should clear pending delete without calling API', () => {
    const updateSpy = spyOn(resourceSpecService, 'updateResSpec').and.returnValue(of({}) as any);

    component.deleteRes({ id: 'res-3', name: 'Resource Spec Three' });
    component.cancelDeleteRes();

    expect(component.deleteConfirmation).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
