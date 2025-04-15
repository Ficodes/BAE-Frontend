import {Component, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {SharedModule} from "../../../shared.module";
import {MarkdownTextareaComponent} from "../../markdown-textarea/markdown-textarea.component";
import {StatusSelectorComponent} from "../../status-selector/status-selector.component";
import {EventMessageService} from "../../../../services/event-message.service";
import {FormChangeState} from "../../../../models/interfaces";
import {Subscription} from "rxjs";
import {debounceTime} from "rxjs/operators";

interface GeneralInfo {
  name: string;
  status: string;
  description: string;
  version: string;
}

@Component({
  selector: 'app-general-info-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SharedModule,
    MarkdownTextareaComponent,
    StatusSelectorComponent
  ],
  templateUrl: './general-info.component.html',
  styleUrl: './general-info.component.css'
})
export class GeneralInfoComponent implements OnInit, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  private originalValue: GeneralInfo;
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;

  constructor(private eventMessage: EventMessageService) {
    console.log('🔄 Initializing GeneralInfoComponent');
  }

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  get nameControl(): FormControl | null {
    const control = this.formGroup.get('name');
    return control instanceof FormControl ? control : null;
  }

  get descControl(): FormControl | null {
    const control = this.formGroup.get('description');
    return control instanceof FormControl ? control : null;
  }

  get versionControl(): FormControl | null {
    const control = this.formGroup.get('version');
    return control instanceof FormControl ? control : null;
  }

  get statusControl(): FormControl | null {
    const control = this.formGroup.get('status');
    return control instanceof FormControl ? control : null;
  }

  ngOnInit() {
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';
    
    if (this.isEditMode && this.data) {
      console.log('Initializing form in update mode with data:', this.data);
      this.formGroup.addControl('name', new FormControl<string>(this.data.name, [Validators.required, Validators.maxLength(100)]));
      this.formGroup.addControl('status', new FormControl<string>(this.data.lifecycleStatus));
      this.formGroup.addControl('description', new FormControl<string>(this.data.description));
      this.formGroup.addControl('version', new FormControl<string>(this.data.version, [Validators.required,Validators.pattern('^-?[0-9]\\d*(\\.\\d*)?$')]));
      
      // Store original value only in edit mode
      this.originalValue = {
        name: this.data.name,
        status: this.data.lifecycleStatus,
        description: this.data.description,
        version: this.data.version
      };
      console.log('📝 Original value stored:', this.originalValue);
    } else {
      console.log('Initializing form in create mode');
      this.formGroup.addControl('name', new FormControl<string>('', [Validators.required, Validators.maxLength(100)]));
      this.formGroup.addControl('status', new FormControl<string>('Active', [Validators.required]));
      this.formGroup.addControl('description', new FormControl<string>('', [Validators.required]));
      this.formGroup.addControl('version', new FormControl<string>('0.1', [Validators.required,Validators.pattern('^-?[0-9]\\d*(\\.\\d*)?$')]));
    }

    // Subscribe to form changes only in edit mode
    if (this.isEditMode) {
      this.formGroup.valueChanges.pipe(
        debounceTime(500) // Esperar 500ms después del último cambio antes de emitir
      ).subscribe((newValue) => {
        console.log('📝 Form value changed:', newValue);
        const dirtyFields = this.getDirtyFields(newValue);
        
        if (dirtyFields.length > 0) {
          this.hasBeenModified = true;
          const changeState: FormChangeState = {
            subformType: 'generalInfo',
            isDirty: true,
            dirtyFields,
            originalValue: this.originalValue,
            currentValue: newValue
          };
          console.log('🚀 Emitting change state:', changeState);
          this.eventMessage.emitSubformChange(changeState);
        } else {
          this.hasBeenModified = false;
        }
      });
    }
  }

  ngOnDestroy() {
    console.log('🗑️ Destroying GeneralInfoComponent');
  }

  private getDirtyFields(currentValue: GeneralInfo): string[] {
    return Object.keys(currentValue).filter(key => {
      const currentFieldValue = currentValue[key as keyof GeneralInfo];
      const originalFieldValue = this.originalValue[key as keyof GeneralInfo];
      return JSON.stringify(currentFieldValue) !== JSON.stringify(originalFieldValue);
    });
  }

  protected readonly FormControl = FormControl;
}
