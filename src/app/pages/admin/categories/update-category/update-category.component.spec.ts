import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EventMessageService } from 'src/app/services/event-message.service';

import { UpdateCategoryComponent } from './update-category.component';

describe('UpdateCategoryComponent', () => {
  let component: UpdateCategoryComponent;
  let fixture: ComponentFixture<UpdateCategoryComponent>;
  let messages$: Subject<any>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

  beforeEach(async () => {
    messages$ = new Subject<any>();
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getLaunchedCategories',
      'updateCategory',
      'getCategoriesByParentId',
    ]);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      ['emitAdminCategories'],
      { messages$: messages$.asObservable() }
    );

    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      expire: Math.floor(Date.now() / 1000) + 300,
      organizations: [],
    } as any);
    apiSpy.getLaunchedCategories.and.resolveTo([]);
    apiSpy.updateCategory.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateCategoryComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
      ]
    })
    .overrideComponent(UpdateCategoryComponent, {
      set: { template: '' },
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateCategoryComponent);
    component = fixture.componentInstance;
    component.category = {
      id: 'cat-1',
      name: 'Category 1',
      description: 'Description',
      lifecycleStatus: 'Active',
      isRoot: true,
      parentId: 'root',
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should call initPartyInfo', () => {
    const initSpy = spyOn(component, 'initPartyInfo');

    component.ngOnInit();

    expect(initSpy).toHaveBeenCalled();
  });

  it('constructor should react to ChangedSession and CategoryAdded events', () => {
    const initSpy = spyOn(component, 'initPartyInfo');
    const addSpy = spyOn(component, 'addCategory');
    const cat = { id: 'cat-2' };

    messages$.next({ type: 'ChangedSession' });
    messages$.next({ type: 'CategoryAdded', value: cat });

    expect(initSpy).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(cat);
  });

  it('ngOnDestroy should unsubscribe from event stream', () => {
    const initSpy = spyOn(component, 'initPartyInfo');
    component.ngOnDestroy();

    messages$.next({ type: 'ChangedSession' });

    expect(initSpy).not.toHaveBeenCalled();
  });

  it('initPartyInfo should set partyId for user session and call data loaders', () => {
    const getCategoriesSpy = spyOn(component, 'getCategories');
    const populateSpy = spyOn(component, 'populateCatInfo');

    component.initPartyInfo();

    expect(component.partyId).toBe('party-user');
    expect(getCategoriesSpy).toHaveBeenCalled();
    expect(populateSpy).toHaveBeenCalled();
  });

  it('initPartyInfo should set partyId for organization session', () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      expire: Math.floor(Date.now() / 1000) + 300,
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
    } as any);
    spyOn(component, 'getCategories');
    spyOn(component, 'populateCatInfo');

    component.initPartyInfo();

    expect(component.partyId).toBe('party-org');
  });

  it('populateCatInfo should fill general form and parent flags for root category', () => {
    component.category = {
      name: 'Root Category',
      description: 'Root desc',
      lifecycleStatus: 'Active',
      isRoot: true,
    };

    component.populateCatInfo();

    expect(component.generalForm.value.name).toBe('Root Category');
    expect(component.generalForm.value.description).toBe('Root desc');
    expect(component.catStatus).toBe('Active');
    expect(component.isParent).toBeTrue();
    expect(component.parentSelectionCheck).toBeFalse();
  });

  it('populateCatInfo should set non-root flags for child category', () => {
    component.category = {
      name: 'Child',
      description: 'Child desc',
      lifecycleStatus: 'Launched',
      isRoot: false,
    };

    component.populateCatInfo();

    expect(component.isParent).toBeFalse();
    expect(component.parentSelectionCheck).toBeTrue();
    expect(component.checkDisableParent).toBeTrue();
  });

  it('goBack should emit admin categories event', () => {
    component.goBack();
    expect(eventMessageSpy.emitAdminCategories).toHaveBeenCalledWith(true);
  });

  it('toggleParent should invert parent flags', () => {
    component.isParent = true;
    component.parentSelectionCheck = false;
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.toggleParent();

    expect(component.isParent).toBeFalse();
    expect(component.parentSelectionCheck).toBeTrue();
    expect(cdrSpy).toHaveBeenCalled();
  });

  it('addCategory should select, unselect and replace selected category', () => {
    const first = { id: 'cat-1' };
    const second = { id: 'cat-2' };

    component.addCategory(first);
    expect(component.selectedCategory).toEqual(first);
    expect(component.selected).toEqual([first]);

    component.addCategory(first);
    expect(component.selectedCategory).toBeUndefined();
    expect(component.selected).toEqual([]);

    component.addCategory(second);
    expect(component.selectedCategory).toEqual(second);
    expect(component.selected).toEqual([second]);
  });

  it('showFinish should build categoryToUpdate for root category', () => {
    component.generalForm.patchValue({ name: 'New name', description: 'New desc' });
    component.catStatus = 'Launched';
    component.isParent = true;
    const stepSpy = spyOn(component, 'selectStep');

    component.showFinish();

    expect(component.categoryToUpdate).toEqual({
      name: 'New name',
      description: 'New desc',
      lifecycleStatus: 'Launched',
      isRoot: true,
    } as any);
    expect(component.showGeneral).toBeFalse();
    expect(component.showSummary).toBeTrue();
    expect(stepSpy).toHaveBeenCalledWith('summary', 'summary-circle');
  });

  it('showFinish should include parentId for non-root category', () => {
    component.generalForm.patchValue({ name: 'New child', description: 'Child desc' });
    component.isParent = false;
    component.selectedCategory = { id: 'parent-1' };

    component.showFinish();

    expect(component.categoryToUpdate?.parentId).toBe('parent-1');
  });

  it('updateCategory should call API and goBack on success', () => {
    component.categoryToUpdate = { name: 'Updated' } as any;
    component.category = { id: 'cat-1' };
    const goBackSpy = spyOn(component, 'goBack');
    apiSpy.updateCategory.and.returnValue(of({ ok: true }));

    component.updateCategory();

    expect(apiSpy.updateCategory).toHaveBeenCalledWith(component.categoryToUpdate, 'cat-1');
    expect(goBackSpy).toHaveBeenCalled();
  });

  it('updateCategory should set error message on API error', () => {
    component.categoryToUpdate = { name: 'Updated' } as any;
    component.category = { id: 'cat-1' };
    apiSpy.updateCategory.and.returnValue(
      throwError(() => ({ error: { error: 'Update failed' } }))
    );

    component.updateCategory();

    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: Update failed');
  });

  it('setCatStatus should update status and trigger detectChanges', () => {
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.setCatStatus('Retired');

    expect(component.catStatus).toBe('Retired');
    expect(cdrSpy).toHaveBeenCalled();
  });

  it('togglePreview should copy description to preview text', () => {
    component.generalForm.patchValue({ description: 'Markdown text' });
    component.togglePreview();
    expect(component.description).toBe('Markdown text');

    component.generalForm.patchValue({ description: '' });
    component.togglePreview();
    expect(component.description).toBe('');
  });
});
