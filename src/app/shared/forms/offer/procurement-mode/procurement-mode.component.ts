import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventMessageService } from "src/app/services/event-message.service";
import { environment } from 'src/environments/environment';
import { FormChangeState } from "../../../../models/interfaces";

interface ProcurementMode {
  id: string;
  name: string;
  labelKey?: string;
  extBillingEnabled?: boolean;
  plaSpecId?: string;
}

@Component({
  selector: 'app-procurement-mode',
  standalone: true,
  imports: [
    TranslateModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ProcurementModeComponent),
      multi: true
    }
  ],
  templateUrl: './procurement-mode.component.html',
  styleUrl: './procurement-mode.component.css'
})
export class ProcurementModeComponent implements ControlValueAccessor, AfterViewInit, OnInit, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  procurementModes = [{
    id: 'manual',
    name: 'Manual',
    labelKey: 'FORMS.PROCUREMENT_MODE._manual'
  }, {
    id: 'payment-automatic',
    name: 'Payment Automatic - Procurement Manual',
    labelKey: 'FORMS.PROCUREMENT_MODE._payment_automatic'
  }, {
    id: 'automatic',
    name: 'Automatic',
    labelKey: 'FORMS.PROCUREMENT_MODE._automatic'
  }];

  procurementMode: string = 'manual';
  showProcurementDropdown: boolean = false;
  private originalValue: ProcurementMode | null = null;
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;
  private formSub?: Subscription;
  private destroy$ = new Subject<void>();

  showProcurementError: boolean = false;
  errorMessageKey: string = '';
  gatewayUrl: string = '';
  gatewayCount: number | null = null;
  paymentInfoLoaded: boolean = false;
  paymentInfoError: boolean = false;

  constructor(private cdr: ChangeDetectorRef, private eventMessage: EventMessageService, private http: HttpClient) {
    console.log('🔄 Initializing ProcurementModeComponent');
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'UpdateOffer') {
          if (this.isEditMode && this.hasBeenModified && this.originalValue) {
            const currentValue = {
              id: this.procurementMode,
              name: this.procurementModes.find(m => m.id === this.procurementMode)?.name || 'Manual',
              extBillingEnabled: this.formGroup.get('extBillingEnabled')?.value ?? false,
              plaSpecId: this.formGroup.get('plaSpecId')?.value ?? ''
            };

            // Solo emitir si el valor es diferente al original
            if (JSON.stringify(currentValue) !== JSON.stringify(this.originalValue)) {
              console.log('📝 Emitting changes on destroy');
              this.formChange.emit({
                subformType: 'procurement',
                isDirty: true,
                dirtyFields: ['id', 'name'],
                originalValue: this.originalValue,
                currentValue: currentValue
              });
            }
          }
        }
      })
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => { };
  onTouched: () => void = () => { };

  writeValue(pmode: any): void {
    console.log('📝 writeValue - Input value:', pmode);
    if (pmode) {
      // Si es un objeto, usar el id directamente
      const selectedMode = pmode.id || pmode;
      console.log('📝 writeValue - Selected mode:', selectedMode);
      this.procurementMode = selectedMode;
      console.log('📝 writeValue - Updated procurementMode:', this.procurementMode);

      // Actualizar el FormGroup si existe
      if (this.formGroup) {
        this.formGroup.patchValue({
          mode: selectedMode
        });
      }

      // Emitir el valor completo
      const mode = this.procurementModes.find(m => m.id === selectedMode);
      this.onChange(mode || { id: selectedMode, name: 'Manual' });
    }
  }

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  get modeControl(): FormControl | null {
    const control = this.formGroup.get('mode');
    return control instanceof FormControl ? control : null;
  }

  get extBillingEnabledControl(): FormControl | null {
    const control = this.formGroup.get('extBillingEnabled');
    return control instanceof FormControl ? control : null;
  }

  get plaSpecIdControl(): FormControl | null {
    const control = this.formGroup.get('plaSpecId');
    return control instanceof FormControl ? control : null;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  getInitialProcurementMode(): string {
    if (this.formType === 'update' && this.data?.productOfferingTerm) {
      const procurementTerm = this.data.productOfferingTerm.find(
        (term: any) => term.name === 'procurement'
      );
      return procurementTerm?.description || 'manual';
    }
    // Por defecto, si es creación o no encuentra el valor adecuado
    return 'manual';
  }

  ngOnInit() {
    console.log('📝 ngOnInit - Form type:', this.formType);
    console.log('📝 ngOnInit - Form value:', this.data);
    const initialValue = this.getInitialProcurementMode();
    console.log('📝 ngOnInit - Initial value:', initialValue);
    this.isEditMode = this.formType === 'update';

    this.procurementMode = initialValue;

    const existingPlaSpecId = this.data?.pricingLogicAlgorithm?.[0]?.plaSpecId ?? '';
    this.upsertControl('mode', initialValue, [Validators.required]);
    this.upsertControl('extBillingEnabled', !!existingPlaSpecId);
    this.upsertControl('plaSpecId', existingPlaSpecId, !!existingPlaSpecId ? [Validators.required] : []);

    this.formGroup.get('extBillingEnabled')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((enabled: boolean) => {
      const plaControl = this.formGroup.get('plaSpecId')!;
      if (enabled) {
        plaControl.setValidators([Validators.required]);
      } else {
        plaControl.clearValidators();
      }
      plaControl.updateValueAndValidity();
    });

    // Guardar el valor original solo en modo edición
    if (this.isEditMode) {
      this.originalValue = {
        id: initialValue,
        name: this.procurementModes.find(m => m.id === initialValue)?.name || 'Manual',
        extBillingEnabled: !!existingPlaSpecId,
        plaSpecId: existingPlaSpecId
      };
      console.log('📝 Original value stored:', this.originalValue);
    }

    this.modeControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(modeId => this.handleModeChange(modeId));

    this.formSub = this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.hasBeenModified = true);

    this.loadPaymentInfo();
  }

  get selectedProcurementNameKey(): string {
    return this.procurementModes.find(mode => mode.id === this.procurementMode)?.labelKey
      || this.procurementModes[0].labelKey!;
  }

  private upsertControl(name: string, value: any, validators: any[] = []): void {
    const control = this.formGroup.get(name);
    if (control) {
      control.setValidators(validators);
      control.setValue(value, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
    } else {
      this.formGroup.addControl(name, new FormControl(value, validators));
    }
  }

  selectProcurementMode(id: string) {
    this.showProcurementDropdown = false;

    if (!this.canSelectProcurementMode(id)) {
      this.showProcurementModeError(this.getProcurementModeErrorKey());
      return;
    }

    this.formGroup.patchValue({ mode: id });

    const settledId = this.formGroup.get('mode')?.value ?? 'manual';
    const pm = this.procurementModes.find(mode => mode.id === settledId) || this.procurementModes[0];

    this.procurementMode = pm.id;
    this.hasBeenModified = true;

    // Emitir el valor completo
    this.onChange(pm);
  }

  isModeUnavailable(id: string): boolean {
    return !this.canSelectProcurementMode(id);
  }

  private loadPaymentInfo(): void {
    const paymentInfoUrl = `${environment.BASE_URL}/paymentInfo`;

    this.gatewayCount = null;
    this.paymentInfoLoaded = false;
    this.paymentInfoError = false;

    lastValueFrom(this.http.get<any>(paymentInfoUrl)).then(data => {
      this.gatewayUrl = data?.providerUrl ?? '';
      this.gatewayCount = Number(data?.gatewaysCount ?? 0);
      this.paymentInfoLoaded = true;
      this.paymentInfoError = false;
      this.resolvePendingPaymentError();
    }).catch(() => {
      this.gatewayCount = null;
      this.paymentInfoLoaded = true;
      this.paymentInfoError = true;
      this.resolvePendingPaymentError();
    });
  }

  private handleModeChange(modeId: string): void {
    if (!modeId) {
      return;
    }

    if (!this.canSelectProcurementMode(modeId)) {
      this.showProcurementModeError(this.getProcurementModeErrorKey());
      this.formGroup.patchValue({ mode: 'manual' }, { emitEvent: false });
      this.procurementMode = 'manual';
      return;
    }

    this.clearProcurementModeError();

    const mode = this.procurementModes.find(m => m.id === modeId) || this.procurementModes[0];
    this.procurementMode = mode.id;
  }

  private canSelectProcurementMode(modeId: string): boolean {
    if (modeId === 'manual') {
      return true;
    }

    return this.paymentInfoLoaded && !this.paymentInfoError && (this.gatewayCount ?? 0) > 0;
  }

  private getProcurementModeErrorKey(): string {
    let errorKey = 'FORMS.PROCUREMENT_MODE._payment_gateway_required';

    if (!this.paymentInfoLoaded) {
      errorKey = 'FORMS.PROCUREMENT_MODE._payment_check_pending';
    } else if (this.paymentInfoError) {
      errorKey = 'FORMS.PROCUREMENT_MODE._payment_check_failed';
    }

    return errorKey;
  }

  private showProcurementModeError(errorKey: string): void {
    this.errorMessageKey = errorKey;
    this.showProcurementError = true;
    this.form.setErrors({ invalidProcurement: true });
  }

  private clearProcurementModeError(): void {
    this.errorMessageKey = '';
    this.showProcurementError = false;
    this.form.setErrors(null);
  }

  private resolvePendingPaymentError(): void {
    if (this.errorMessageKey !== 'FORMS.PROCUREMENT_MODE._payment_check_pending') {
      return;
    }

    if (this.paymentInfoError) {
      this.showProcurementModeError('FORMS.PROCUREMENT_MODE._payment_check_failed');
    } else if ((this.gatewayCount ?? 0) > 0) {
      this.clearProcurementModeError();
    } else {
      this.showProcurementModeError('FORMS.PROCUREMENT_MODE._payment_gateway_required');
    }
  }

  ngAfterViewInit() {
    // Forzar la detección de cambios después de que la vista esté lista
    setTimeout(() => {
      console.log('📝 AfterViewInit - Current procurementMode:', this.procurementMode);
      this.cdr.detectChanges();
    }, 0);
  }

  ngOnDestroy() {
    // Solo emitir cambios en modo edición y si ha habido modificaciones
    this.formSub?.unsubscribe();

    if (this.isEditMode && this.hasBeenModified && this.originalValue) {
      const currentValue = {
        id: this.procurementMode,
        name: this.procurementModes.find(m => m.id === this.procurementMode)?.name || 'Manual'
      };

      // Solo emitir si el valor es diferente al original
      if (JSON.stringify(currentValue) !== JSON.stringify(this.originalValue)) {
        console.log('📝 Emitting changes on destroy');
        this.formChange.emit({
          subformType: 'procurement',
          isDirty: true,
          dirtyFields: ['id', 'name'],
          originalValue: this.originalValue,
          currentValue: currentValue
        });
      }
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
