import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { takeUntil } from 'rxjs/operators';
import { EventMessageService } from "src/app/services/event-message.service";
import { jsonValidator } from "src/app/validators/validators";
import { FormChangeState } from "../../../../models/interfaces";

interface EdcContractDefinition {
  name: 'edc:contractDefinition';
  accessPolicy: string;
  contractPolicy: string;
}

@Component({
  selector: 'app-edc-contract-definition-form',
  standalone: true,
  imports: [
    FormsModule,
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

  constructor(
    private eventMessage: EventMessageService) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'UpdateOffer') {
          if (this.isEditMode && this.hasBeenModified && this.originalValue) {
            const currentValue: EdcContractDefinition = {
              name: 'edc:contractDefinition',
              accessPolicy: this.accessControl?.value || '',
              contractPolicy: this.contractControl?.value || '',
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
        }
      })
  }

  dspCompatible = false;
  private originalValue: EdcContractDefinition | null = null;
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  get accessControl(): FormControl | null {
    const control = this.formGroup.get('accessPolicy');
    return control instanceof FormControl ? control : null;
  }

  get contractControl(): FormControl | null {
    const control = this.formGroup.get('contractPolicy');
    return control instanceof FormControl ? control : null;
  }

  onDspCompatibleChange(checked: boolean): void {
    this.updatePolicyValidators(checked);
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

  ngOnInit() {
    this.isEditMode = this.formType === 'update';
    let contractDefinition = null;
    if (this.isEditMode && this.data) {
      if (this.data.productOfferingTerm && Array.isArray(this.data.productOfferingTerm)) {
        contractDefinition = this.data.productOfferingTerm?.find((element: { name: any; }) => element.name == 'edc:contractDefinition')
        if (contractDefinition) {
          this.formGroup.addControl('name', new FormControl<string>('edc:contractDefinition'));
          this.formGroup.addControl('accessPolicy', new FormControl<string>(contractDefinition.accessPolicy, [Validators.required, jsonValidator]));
          this.formGroup.addControl('contractPolicy', new FormControl<string>(contractDefinition.contractPolicy, [Validators.required, jsonValidator]));
          this.originalValue = {
            name: contractDefinition.name,
            accessPolicy: contractDefinition.accessPolicy,
            contractPolicy: contractDefinition.contractPolicy
          };
        }
      }
    }
    if (!contractDefinition) {
      this.formGroup.addControl('name', new FormControl<string>('edc:contractDefinition'));
      this.formGroup.addControl('accessPolicy', new FormControl<string>('', [jsonValidator]));
      this.formGroup.addControl('contractPolicy', new FormControl<string>('', [jsonValidator]));
    }

    this.updatePolicyValidators(this.dspCompatible);

    // Subscribe to form changes only in edit mode
    if (this.isEditMode) {
      this.formGroup.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.hasBeenModified = true;
        });
    }
  }

  ngOnDestroy() {
    if (this.isEditMode && this.hasBeenModified && this.originalValue) {
      const currentValue: EdcContractDefinition = {
        name: 'edc:contractDefinition',
        accessPolicy: this.accessControl?.value || '',
        contractPolicy: this.contractControl?.value || ''
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getDirtyFields(currentValue: EdcContractDefinition): string[] {
    const dirtyFields: string[] = [];

    if (!this.originalValue) return dirtyFields;

    if (currentValue.name !== this.originalValue.name) {
      dirtyFields.push('name');
    }

    if (currentValue.accessPolicy !== this.originalValue.accessPolicy) {
      dirtyFields.push('accessPolicy');
    }

    if (currentValue.contractPolicy !== this.originalValue.contractPolicy) {
      dirtyFields.push('contractPolicy');
    }

    return dirtyFields;
  }
}
