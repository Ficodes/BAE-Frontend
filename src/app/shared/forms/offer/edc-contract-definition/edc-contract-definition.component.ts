import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn } from "@angular/forms";
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
              const changeState: FormChangeState = {
                subformType: 'contractDefinition',
                isDirty: true,
                dirtyFields,
                originalValue: this.originalValue,
                currentValue
              };

              console.log('🚀 Emitting final change state:', changeState);
              this.formChange.emit(changeState);
            } else {
              console.log('📝 No real changes detected, skipping emission');
            }
          }
        }
      })
  }

  freeLicenseSelected: boolean = false;
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

  ngOnInit() {
    console.log('🔄 Initializing LicenseComponent');
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';
    let contractDefinition = null;
    if (this.isEditMode && this.data) {
      console.log('📝 Data received:', this.data);

      if (this.data.productOfferingTerm && Array.isArray(this.data.productOfferingTerm)) {
        contractDefinition = this.data.productOfferingTerm?.find((element: { name: any; }) => element.name == 'edc:contractDefinition')
        if (contractDefinition) {
          this.formGroup.addControl('name', new FormControl<string>('edc:contractDefinition'));
          this.formGroup.addControl('accessPolicy', new FormControl<string>(contractDefinition.accessPolicy, jsonValidator));
          this.formGroup.addControl('contractPolicy', new FormControl<string>(contractDefinition.contractPolicy, jsonValidator));
          this.formGroup.addValidators(this.edcPoliciesRequiredValidator);

          // Store original value only in edit mode
          this.originalValue = {
            name: contractDefinition.name,
            accessPolicy: contractDefinition.accessPolicy,
            contractPolicy: contractDefinition.contractPolicy
          };
          console.log('📝 Original value stored:', this.originalValue);
        }
      }
    }
    if (!contractDefinition) {
      this.formGroup.addControl('name', new FormControl<string>('edc:contractDefinition'));
      this.formGroup.addControl('accessPolicy', new FormControl<string>('', jsonValidator));
      this.formGroup.addControl('contractPolicy', new FormControl<string>('', jsonValidator));
      this.formGroup.addValidators(this.edcPoliciesRequiredValidator);
    }

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
    console.log('🗑️ Destroying LicenseComponent');

    if (this.isEditMode && this.hasBeenModified && this.originalValue) {
      const currentValue: EdcContractDefinition = {
        name: 'edc:contractDefinition',
        accessPolicy: this.accessControl?.value || '',
        contractPolicy: this.contractControl?.value || ''
      };

      const dirtyFields = this.getDirtyFields(currentValue);

      if (dirtyFields.length > 0) {
        const changeState: FormChangeState = {
          subformType: 'license',
          isDirty: true,
          dirtyFields,
          originalValue: this.originalValue,
          currentValue
        };

        console.log('🚀 Emitting final change state:', changeState);
        this.formChange.emit(changeState);
      } else {
        console.log('📝 No real changes detected, skipping emission');
      }
    } else if (!this.isEditMode) {
      console.log('📝 Not in edit mode, skipping change detection');
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
  private edcPoliciesRequiredValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
    const access = form.get('accessPolicy')?.value?.trim() || '';
    const contract = form.get('contractPolicy')?.value?.trim() || '';
    const eitherFilled = access !== '' || contract !== '';
    if (eitherFilled && (access === '' || contract === '')) {
      return { policiesRequired: true };
    }
    return null;
  };


}
