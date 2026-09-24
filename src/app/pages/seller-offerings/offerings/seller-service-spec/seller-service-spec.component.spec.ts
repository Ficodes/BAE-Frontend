import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';

import { SellerServiceSpecComponent } from './seller-service-spec.component';

describe('SellerServiceSpecComponent', () => {
  let component: SellerServiceSpecComponent;
  let fixture: ComponentFixture<SellerServiceSpecComponent>;
  let eventMessage: EventMessageService;
  let serviceSpecService: ServiceSpecServiceService;

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
    serviceSpecService = TestBed.inject(ServiceSpecServiceService);
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

  it('deleteServ should require confirmation before deleting a service spec', () => {
    const updateSpy = spyOn(serviceSpecService, 'updateServSpec').and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    spyOn(component, 'getServSpecs');
    spyOn(component, 'loadStatusCounts');
    const serv = { id: 'serv-2', name: 'Service Spec Two', lifecycleStatus: 'Launched' };

    component.deleteServ(serv);

    expect(component.deleteConfirmation).toBe(serv);
    expect(updateSpy).not.toHaveBeenCalled();

    component.confirmDeleteServ();

    expect(updateSpy).toHaveBeenCalledOnceWith({ lifecycleStatus: 'Retired' }, 'serv-2');
    expect(component.deleteConfirmation).toBeNull();
    expect(component.deleteLoading).toBeFalse();
  });

  it('deleteServ should archive an active service spec as obsolete with one request', () => {
    const updateSpy = spyOn(serviceSpecService, 'updateServSpec').and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    spyOn(component, 'getServSpecs');
    spyOn(component, 'loadStatusCounts');

    component.deleteServ({ id: 'serv-active', lifecycleStatus: 'Active' });
    component.confirmDeleteServ();

    expect(updateSpy).toHaveBeenCalledOnceWith({ lifecycleStatus: 'Obsolete' }, 'serv-active');
  });

  it('should only show actions for draft and validated service specs', () => {
    spyOn(component, 'initServices');
    component.servSpecs = [
      { id: 'serv-active', name: 'Active', lifecycleStatus: 'Active' },
      { id: 'serv-launched', name: 'Launched', lifecycleStatus: 'Launched' },
      { id: 'serv-retired', name: 'Retired', lifecycleStatus: 'Retired' },
      { id: 'serv-obsolete', name: 'Obsolete', lifecycleStatus: 'Obsolete' }
    ];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-cy="servSpecActions"]').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-cy="servSpecNoActions"]').length).toBe(2);
  });

  it('cancelDeleteServ should clear pending delete without calling API', () => {
    const updateSpy = spyOn(serviceSpecService, 'updateServSpec').and.returnValue(of({}) as any);

    component.deleteServ({ id: 'serv-3', name: 'Service Spec Three' });
    component.cancelDeleteServ();

    expect(component.deleteConfirmation).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
