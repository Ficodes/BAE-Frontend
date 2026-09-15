import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { EdcContractDefinitionComponent } from './edc-contract-definition.component';

describe('EdcContractDefinitionComponent', () => {
  let component: EdcContractDefinitionComponent;
  let fixture: ComponentFixture<EdcContractDefinitionComponent>;
  let messagesSubject: Subject<any>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;

  function createForm(): FormGroup {
    return new FormGroup({});
  }

  beforeEach(async () => {
    messagesSubject = new Subject<any>();
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      ['emitSellerProductSpec'],
      { messages$: messagesSubject.asObservable() }
    );

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [EdcContractDefinitionComponent, ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [{ provide: EventMessageService, useValue: eventMessageSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(EdcContractDefinitionComponent);
    component = fixture.componentInstance;
    component.form = createForm();
    component.formType = 'create';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- ngOnInit: create mode, no data ---

  it('ngOnInit should add dspCompatible=false, accessPolicy and contractPolicy controls in create mode', () => {
    fixture.detectChanges();
    expect(component.formGroup.contains('dspCompatible')).toBeTrue();
    expect(component.formGroup.contains('accessPolicy')).toBeTrue();
    expect(component.formGroup.contains('contractPolicy')).toBeTrue();
    expect(component.dspCompatible).toBeFalse();
  });

  it('ngOnInit should not re-add controls if already initialized', () => {
    fixture.detectChanges();
    const spy = spyOn(component.formGroup, 'addControl').and.callThrough();
    component.ngOnInit();
    expect(spy).not.toHaveBeenCalled();
  });

  // --- ngOnInit: update mode with contractDefinition data ---

  it('ngOnInit should add controls with existing data in update mode', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: { '@type': 'Policy' },
        contractPolicy: { '@type': 'Policy' }
      }]
    };
    fixture.detectChanges();
    expect(component.dspCompatible).toBeTrue();
    expect(component.accessControl?.value).toContain('"@type"');
    expect(component.contractControl?.value).toContain('"@type"');
  });

  it('ngOnInit should add controls without data in update mode (no contractDefinition term)', () => {
    component.formType = 'update';
    component.data = { productOfferingTerm: [] };
    fixture.detectChanges();
    expect(component.dspCompatible).toBeFalse();
  });

  // --- getters ---

  it('formGroup getter should return the form as FormGroup', () => {
    fixture.detectChanges();
    expect(component.formGroup).toBe(component.form as FormGroup);
  });

  it('dspCompatible getter should reflect dspCompatible control value', () => {
    fixture.detectChanges();
    component.dspCompatibleControl.setValue(true);
    expect(component.dspCompatible).toBeTrue();
    component.dspCompatibleControl.setValue(false);
    expect(component.dspCompatible).toBeFalse();
  });

  it('accessControl getter should return the accessPolicy FormControl', () => {
    fixture.detectChanges();
    expect(component.accessControl).toBeTruthy();
    expect(component.accessControl).toBe(component.formGroup.get('accessPolicy') as any);
  });

  it('contractControl getter should return the contractPolicy FormControl', () => {
    fixture.detectChanges();
    expect(component.contractControl).toBeTruthy();
    expect(component.contractControl).toBe(component.formGroup.get('contractPolicy') as any);
  });

  // --- updatePolicyValidators via dspCompatibleControl.valueChanges ---

  it('enabling dspCompatible should add required validator to policy controls', () => {
    fixture.detectChanges();
    component.dspCompatibleControl.setValue(true);
    component.accessControl?.setValue('');
    component.accessControl?.markAsTouched();
    expect(component.accessControl?.hasError('required')).toBeTrue();
    component.contractControl?.setValue('');
    component.contractControl?.markAsTouched();
    expect(component.contractControl?.hasError('required')).toBeTrue();
  });

  it('disabling dspCompatible should remove required validator and reset policy controls', () => {
    fixture.detectChanges();
    component.dspCompatibleControl.setValue(true);
    component.accessControl?.setValue('{"a":1}');
    component.contractControl?.setValue('{"b":2}');

    component.dspCompatibleControl.setValue(false);

    expect(component.accessControl?.hasError('required')).toBeFalse();
    expect(component.accessControl?.value).toBe('');
    expect(component.contractControl?.value).toBe('');
  });

  it('should mark invalid when policy controls contain invalid JSON', () => {
    fixture.detectChanges();
    component.dspCompatibleControl.setValue(true);
    component.accessControl?.setValue('not json');
    component.accessControl?.markAsTouched();
    expect(component.accessControl?.hasError('invalidJson')).toBeTrue();
  });

  it('should mark valid when policy controls contain valid JSON', () => {
    fixture.detectChanges();
    component.dspCompatibleControl.setValue(true);
    component.accessControl?.setValue('{"valid": true}');
    component.contractControl?.setValue('{"valid": true}');
    expect(component.accessControl?.valid).toBeTrue();
    expect(component.contractControl?.valid).toBeTrue();
  });

  it('enabling dspCompatible sets originalValue when none existed', () => {
    fixture.detectChanges();
    component.dspCompatibleControl.setValue(true);
    expect((component as any).originalValue).not.toBeNull();
  });

  // --- edit mode: formGroup.valueChanges sets hasBeenModified ---

  it('should mark hasBeenModified when form changes in update mode', () => {
    component.formType = 'update';
    fixture.detectChanges();
    expect((component as any).hasBeenModified).toBeFalse();
    component.accessControl?.setValue('{}');
    expect((component as any).hasBeenModified).toBeTrue();
  });

  it('should not mark hasBeenModified in create mode', () => {
    fixture.detectChanges();
    component.accessControl?.setValue('{}');
    expect((component as any).hasBeenModified).toBeFalse();
  });

  // --- UpdateOffer event ---

  it('UpdateOffer event should emit formChange when in edit mode with dirty fields', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: { '@type': 'Policy' },
        contractPolicy: { '@type': 'OldPolicy' }
      }]
    };
    fixture.detectChanges();

    const emitSpy = spyOn(component.formChange, 'emit');
    component.accessControl?.setValue('{"@type":"NewPolicy"}');

    messagesSubject.next({ type: 'UpdateOffer' });

    expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      subformType: 'contractDefinition',
      isDirty: true,
      dirtyFields: jasmine.arrayContaining(['accessPolicy'])
    }));
  });

  it('UpdateOffer event should not emit formChange when nothing changed', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: {},
        contractPolicy: {}
      }]
    };
    fixture.detectChanges();
    const emitSpy = spyOn(component.formChange, 'emit');

    messagesSubject.next({ type: 'UpdateOffer' });
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('UpdateOffer event should not emit in create mode', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.formChange, 'emit');
    messagesSubject.next({ type: 'UpdateOffer' });
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('other event types should not trigger formChange', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: {},
        contractPolicy: {}
      }]
    };
    fixture.detectChanges();
    component.accessControl?.setValue('{"changed":true}');
    const emitSpy = spyOn(component.formChange, 'emit');

    messagesSubject.next({ type: 'SomethingElse' });
    expect(emitSpy).not.toHaveBeenCalled();
  });

  // --- ngOnDestroy ---

  it('ngOnDestroy should emit formChange when in edit mode with dirty fields', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: {},
        contractPolicy: {}
      }]
    };
    fixture.detectChanges();
    const emitSpy = spyOn(component.formChange, 'emit');
    component.accessControl?.setValue('{"changed":true}');

    component.ngOnDestroy();

    expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      subformType: 'contractDefinition',
      isDirty: true
    }));
  });

  it('ngOnDestroy should not emit when in create mode', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.formChange, 'emit');
    component.ngOnDestroy();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('ngOnDestroy should not emit when form was not modified', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: {},
        contractPolicy: {}
      }]
    };
    fixture.detectChanges();
    const emitSpy = spyOn(component.formChange, 'emit');
    component.ngOnDestroy();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('ngOnDestroy should not emit when dirty fields are empty', () => {
    // Update mode with no pre-existing contractDefinition so originalValue starts as null.
    // Enabling dspCompatible sets originalValue with empty strings; keeping policies empty
    // means getDirtyFields returns []. Even though form was modified, no fields differ.
    component.formType = 'update';
    component.data = { productOfferingTerm: [] };
    fixture.detectChanges();

    // Enabling dspCompatible sets originalValue = {accessPolicy:'', contractPolicy:'', ...}
    // and also triggers hasBeenModified=true via formGroup.valueChanges
    component.dspCompatibleControl.setValue(true);

    // Keep policies as empty strings (identical to originalValue)
    component.accessControl?.setValue('');
    component.contractControl?.setValue('');

    const emitSpy = spyOn(component.formChange, 'emit');
    component.ngOnDestroy();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('ngOnDestroy should complete the destroy$ subject', () => {
    fixture.detectChanges();
    const completeSpy = spyOn((component as any).destroy$, 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should stop reacting to UpdateOffer events after ngOnDestroy', () => {
    component.formType = 'update';
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: {},
        contractPolicy: {}
      }]
    };
    fixture.detectChanges();
    component.accessControl?.setValue('{"changed":true}');
    component.ngOnDestroy();
    const emitSpy = spyOn(component.formChange, 'emit');
    messagesSubject.next({ type: 'UpdateOffer' });
    expect(emitSpy).not.toHaveBeenCalled();
  });

  // --- jsonToString (private via side effect) ---

  it('should handle non-stringifiable data gracefully by returning empty string', () => {
    component.formType = 'update';
    const circular: any = {};
    circular.self = circular;
    component.data = {
      productOfferingTerm: [{
        name: 'edc:contractDefinition',
        accessPolicy: circular,
        contractPolicy: {}
      }]
    };
    fixture.detectChanges();
    expect(component.accessControl?.value).toBe('');
  });
});
