import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { of } from 'rxjs';

import { SellerCatalogsComponent } from './seller-catalogs.component';

describe('SellerCatalogsComponent', () => {
  let component: SellerCatalogsComponent;
  let fixture: ComponentFixture<SellerCatalogsComponent>;
  let eventMessage: EventMessageService;
  let api: ApiServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerCatalogsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerCatalogsComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    api = TestBed.inject(ApiServiceService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create catalog event', () => {
    spyOn(eventMessage, 'emitSellerCreateCatalog');

    component.goToCreate();

    expect(eventMessage.emitSellerCreateCatalog).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update catalog event', () => {
    const cat = { id: 'cat-1' };
    spyOn(eventMessage, 'emitSellerUpdateCatalog');

    component.goToUpdate(cat);

    expect(eventMessage.emitSellerUpdateCatalog).toHaveBeenCalledWith(cat);
  });

  it('selectTab should set status filter and reload catalogs', () => {
    const getCatalogsSpy = spyOn(component, 'getCatalogs');

    component.selectTab('Published');

    expect(component.status).toEqual(['Launched']);
    expect(component.selectedTab).toBe('Published');
    expect(component.loading).toBeTrue();
    expect(component.page).toBe(0);
    expect(component.catalogs).toEqual([]);
    expect(component.nextCatalogs).toEqual([]);
    expect(getCatalogsSpy).toHaveBeenCalledWith(false);
  });

  it('selectTab should map the deleted tab to obsolete catalogs', () => {
    const getCatalogsSpy = spyOn(component, 'getCatalogs');

    component.selectTab('Deleted');

    expect(component.selectedTab).toBe('Deleted');
    expect(component.status).toEqual(['Obsolete']);
    expect(getCatalogsSpy).toHaveBeenCalledWith(false);
  });

  it('rowStatusBadge should map catalog lifecycle status to tab label', () => {
    expect(component.rowStatusBadge({ lifecycleStatus: 'Active' }).text).toBe('Draft');
    expect(component.rowStatusBadge({ lifecycleStatus: 'Launched' }).text).toBe('Published');
    expect(component.rowStatusBadge({ lifecycleStatus: 'Retired' }).text).toBe('Unpublished');
    expect(component.rowStatusBadge({ lifecycleStatus: 'Obsolete' }).text).toBe('Archived');
  });

  it('publishCatalog should update lifecycle from the row action menu', () => {
    spyOn(api, 'updateCatalog').and.returnValue(of({}));
    spyOn(eventMessage, 'emitSpecCreated');
    spyOn(component, 'getCatalogs');
    spyOn(component, 'loadStatusCounts');

    component.publishCatalog({ id: 'cat-1' });

    expect(api.updateCatalog).toHaveBeenCalledWith({ lifecycleStatus: 'Launched' }, 'cat-1');
    expect(eventMessage.emitSpecCreated).toHaveBeenCalled();
    expect(component.getCatalogs).toHaveBeenCalledWith(false);
    expect(component.loadStatusCounts).toHaveBeenCalled();
  });

  it('should not show the delete action for a published catalog', () => {
    spyOn(component, 'initCatalogs');
    component.openMenuCatalog = { id: 'cat-1', lifecycleStatus: 'Launched' } as any;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="catalogUnpublish"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="catalogArchive"]')).toBeNull();
  });

  it('should show the no-actions icon for an obsolete catalog', () => {
    spyOn(component, 'initCatalogs');
    component.catalogs = [{ id: 'cat-obsolete', name: 'Obsolete', lifecycleStatus: 'Obsolete' }] as any;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="catalogActions"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="catalogNoActions"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="catalogRestore"]')).toBeNull();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
