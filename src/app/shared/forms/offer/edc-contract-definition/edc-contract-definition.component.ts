import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormChangeState } from 'src/app/models/interfaces';
import { EventMessageService } from 'src/app/services/event-message.service';
import { jsonValidator } from 'src/app/validators/validators';

interface EdcContractDefinition {
  name: 'edc:contractDefinition';
  accessPolicy: string;
  contractPolicy: string;
  dspCompatible: boolean;
}

@Component({
  selector: 'app-edc-contract-definition-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './edc-contract-definition.component.html',
  styleUrl: './edc-contract-definition.component.css'
})
export class EdcContractDefinitionComponent implements OnInit, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  private destroy$ = new Subject<void>();
  private originalValue: EdcContractDefinition | null = null;
  private hasBeenModified = false;
  private isEditMode = false;

  constructor(private eventMessage: EventMessageService) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'UpdateOffer') {
          this.emitChangeIfNeeded();
        }
      });
  }

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  get dspCompatible(): boolean {
    return !!this.formGroup.get('dspCompatible')?.value;
  }

  get dspCompatibleControl(): FormControl {
    return this.formGroup.get('dspCompatible') as FormControl;
  }

  get accessControl(): FormControl | null {
    const control = this.formGroup.get('accessPolicy');
    return control instanceof FormControl ? control : null;
  }

  get contractControl(): FormControl | null {
    const control = this.formGroup.get('contractPolicy');
    return control instanceof FormControl ? control : null;
  }

  ngOnInit(): void {
    this.isEditMode = this.formType === 'update';
    if (!this.formGroup.contains('accessPolicy')) {
      this.initializeControls();
    }

    this.updatePolicyValidators(this.dspCompatible);
    this.dspCompatibleControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(checked => {
        this.updatePolicyValidators(!!checked);
        if (checked && !this.originalValue) {
          this.originalValue = {
            name: 'edc:contractDefinition',
            accessPolicy: '',
            contractPolicy: '',
            dspCompatible: false
          };
        }
      });

    if (this.isEditMode) {
      this.formGroup.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.hasBeenModified = true;
        });
    }
  }

  ngOnDestroy(): void {
    this.emitChangeIfNeeded();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeControls(): void {
    const contractDefinition = this.findExistingContractDefinition();
    if (contractDefinition) {
      this.formGroup.addControl('dspCompatible', new FormControl(true));
      this.formGroup.addControl('name', new FormControl<string>('edc:contractDefinition'));
      this.formGroup.addControl('accessPolicy', new FormControl<string>(
        this.jsonToString(contractDefinition.accessPolicy),
        [Validators.required, jsonValidator]
      ));
      this.formGroup.addControl('contractPolicy', new FormControl<string>(
        this.jsonToString(contractDefinition.contractPolicy),
        [Validators.required, jsonValidator]
      ));
      this.originalValue = {
        name: contractDefinition.name,
        accessPolicy: this.jsonToString(contractDefinition.accessPolicy),
        contractPolicy: this.jsonToString(contractDefinition.contractPolicy),
        dspCompatible: true
      };
      return;
    }

    this.formGroup.addControl('dspCompatible', new FormControl(false));
    this.formGroup.addControl('name', new FormControl<string>('edc:contractDefinition'));
    this.formGroup.addControl('accessPolicy', new FormControl<string>('', [jsonValidator]));
    this.formGroup.addControl('contractPolicy', new FormControl<string>('', [jsonValidator]));
  }

  private findExistingContractDefinition(): any {
    const terms = this.data?.productOfferingTerm;
    return Array.isArray(terms)
      ? terms.find((term: any) => term?.name === 'edc:contractDefinition')
      : null;
  }

  private updatePolicyValidators(checked: boolean): void {
    const validators = checked ? [Validators.required, jsonValidator] : [jsonValidator];
    this.accessControl?.setValidators(validators);
    this.accessControl?.updateValueAndValidity({ emitEvent: false });
    this.contractControl?.setValidators(validators);
    this.contractControl?.updateValueAndValidity({ emitEvent: false });
    if (!checked) {
      this.accessControl?.reset('', { emitEvent: false });
      this.contractControl?.reset('', { emitEvent: false });
    }
  }

  private emitChangeIfNeeded(): void {
    if (!this.isEditMode || !this.hasBeenModified || !this.originalValue) return;

    const currentValue: EdcContractDefinition = {
      name: 'edc:contractDefinition',
      accessPolicy: this.accessControl?.value || '',
      contractPolicy: this.contractControl?.value || '',
      dspCompatible: this.dspCompatible
    };
    const dirtyFields = this.getDirtyFields(currentValue);
    if (dirtyFields.length > 0) {
      this.formChange.emit({
        subformType: 'contractDefinition',
        isDirty: true,
        dirtyFields,
        originalValue: this.originalValue,
        currentValue
      });
    }
  }

  private getDirtyFields(currentValue: EdcContractDefinition): string[] {
    if (!this.originalValue) return [];
    const dirtyFields: string[] = [];
    if (currentValue.accessPolicy !== this.originalValue.accessPolicy) dirtyFields.push('accessPolicy');
    if (currentValue.contractPolicy !== this.originalValue.contractPolicy) dirtyFields.push('contractPolicy');
    if (currentValue.dspCompatible !== this.originalValue.dspCompatible) dirtyFields.push('dspCompatible');
    return dirtyFields;
  }

  private jsonToString(json: any): string {
    try {
      return typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    } catch {
      return '';
    }
  }
}
