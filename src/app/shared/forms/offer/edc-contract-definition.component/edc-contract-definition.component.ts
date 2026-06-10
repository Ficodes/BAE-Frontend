import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { takeUntil } from 'rxjs/operators';
import { EventMessageService } from "src/app/services/event-message.service";
import { FormChangeState } from "../../../../models/interfaces";
import { MarkdownTextareaComponent } from "../../markdown-textarea/markdown-textarea.component";

interface License {
  treatment: string;
  description: string;
}

@Component({
  selector: 'app-license-form',
  standalone: true,
  imports: [
    MarkdownTextareaComponent,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './license.component.html',
  styleUrl: './license.component.css'
})
export class LicenseComponent implements OnInit, OnDestroy {
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
            const currentValue = {
              treatment: 'License',
              description: this.descControl?.value || ''
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
          }
        }
      })
  }

  freeLicenseSelected: boolean = false;
  private originalValue: License | null = null;
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;

  get formGroup(): FormGroup {
    return this.form as FormGroup;  // Lo convierte en FormGroup
  }

  get descControl(): FormControl | null {
    const control = this.formGroup.get('description');
    return control instanceof FormControl ? control : null;
  }

  ngOnInit() {
    console.log('🔄 Initializing LicenseComponent');
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';

    if (this.isEditMode && this.data) {
      console.log('📝 Data received:', this.data);
      //LICENSE
      if (this.data.productOfferingTerm && Array.isArray(this.data.productOfferingTerm)) {
        let license = this.data.productOfferingTerm?.find((element: { name: any; }) => element.name == 'License')
        if (license) {
          this.formGroup.addControl('name', new FormControl<string>('License'));
          this.formGroup.addControl('description', new FormControl<string>(license.description));

          // Store original value only in edit mode
          this.originalValue = {
            treatment: license.name,
            description: license.description
          };
          console.log('📝 Original value stored:', this.originalValue);
        } else {
          this.formGroup.addControl('name', new FormControl<string>('License'));
          this.formGroup.addControl('description', new FormControl<string>(''));
        }
      } else {
        this.formGroup.addControl('name', new FormControl<string>('License'));
        this.formGroup.addControl('description', new FormControl<string>(''));
      }
    } else {
      this.formGroup.addControl('name', new FormControl<string>('License'));
      this.formGroup.addControl('description', new FormControl<string>(''));
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

    // Solo emitir cambios si estamos en modo edición y hay cambios reales
    if (this.isEditMode && this.hasBeenModified && this.originalValue) {
      const currentValue = {
        treatment: 'License',
        description: this.descControl?.value || ''
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

  private getDirtyFields(currentValue: License): string[] {
    const dirtyFields: string[] = [];

    if (!this.originalValue) return dirtyFields;

    if (currentValue.treatment !== this.originalValue.treatment) {
      dirtyFields.push('treatment');
    }

    if (currentValue.description !== this.originalValue.description) {
      dirtyFields.push('description');
    }

    return dirtyFields;
  }
}
