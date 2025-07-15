import { Component, Input, Output, OnInit, OnDestroy, EventEmitter, forwardRef, ChangeDetectorRef } from '@angular/core';
import {DatePipe, NgClass, NgIf, NgTemplateOutlet} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {FormBuilder, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from "@angular/forms";
import { noWhitespaceValidator } from 'src/app/validators/validators';
import {EventMessageService} from "src/app/services/event-message.service";
import { FormChangeState } from 'src/app/models/interfaces';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'usage-spec-metrics',
  standalone: true,
  imports: [TranslateModule, ReactiveFormsModule, NgClass],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UsageSpecMetricsComponent),
      multi: true
    }
  ],
  templateUrl: './usage-spec-metrics.component.html',
  styleUrl: './usage-spec-metrics.component.css'
})
export class UsageSpecMetricsComponent {

  @Input() formType!: string;
  @Input() data: any;
  @Input() partyId: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  metrics:any[]=[];
  showCreateMetric:boolean=false;

  private originalValue: any[] = [];
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;

  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  //CHARS INFO
  metricsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('')
  });

  constructor(
    private eventMessage: EventMessageService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef) {

  }

  async ngOnInit() {
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';
    console.log(this.metrics)
  }

  deleteMetric(metric:any){
    const index = this.metrics.findIndex(m => m.id === metric.id);
    if (index !== -1) {
      this.metrics.splice(index, 1);
    }
    this.onChange([...this.metrics]);
    const currentValue = [...this.metrics];
    const dirtyFields = this.getDirtyFields(currentValue);
    const changeState: FormChangeState = {
      subformType: 'category',
      isDirty: true,
      dirtyFields,
      originalValue: this.originalValue,
      currentValue
    };
    console.log('🚀 Emitting change state:', changeState);
    this.eventMessage.emitSubformChange(changeState);
  }

  saveMetric(){
    this.metrics.push({
      id: uuidv4(),
      name: this.metricsForm.value.name,
      description: this.metricsForm.value.description,
      valueType: 'number'
    })
    this.onChange([...this.metrics]);
    this.cdr.detectChanges();
    this.showCreateMetric=false;
    const currentValue = [...this.metrics];
    const dirtyFields = this.getDirtyFields(currentValue);
    const changeState: FormChangeState = {
      subformType: 'metrics',
      isDirty: true,
      dirtyFields,
      originalValue: this.originalValue,
      currentValue
    };
    console.log('🚀 Emitting change state:', changeState);
    this.eventMessage.emitSubformChange(changeState);
    this.metricsForm.reset();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  ngOnDestroy() {
    console.log('🗑️ Destroying Usage Spec Metrics Component');
    
    // Solo emitir cambios si estamos en modo edición y hay cambios reales
    if (this.isEditMode && this.hasBeenModified) {
      const currentValue = [...this.metrics];
      const dirtyFields = this.getDirtyFields(currentValue);
      
      if (dirtyFields.length > 0) {
        const changeState: FormChangeState = {
          subformType: 'category',
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
  }

  private getDirtyFields(currentValue: any[]): string[] {
    const dirtyFields: string[] = [];
    
    // Comparar arrays de categorías
    if (JSON.stringify(currentValue) !== JSON.stringify(this.originalValue)) {
      dirtyFields.push('creatingMetrics');
    }
    
    return dirtyFields;
  }

  writeValue(metrics: any[]): void {
    console.log('📝 Writing value to form:', metrics);
    this.metrics = metrics || [];
    // Store original value only in edit mode
    if (this.isEditMode && metrics) {
      this.originalValue = JSON.parse(JSON.stringify(metrics));
      console.log('📝 Original value stored:', this.originalValue);
    }
  }

}
