import { ChangeDetectorRef, Component, DoCheck, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormRecord, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import moment from 'moment';
import { Observable, Subject, Subscription, finalize, map, of, switchMap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AssetType, AssetTypeFormField } from 'src/app/models/asset-type.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';
import { TranslateService } from '@ngx-translate/core';
import { formatApiErrorMessage } from 'src/app/shared/error-message/api-error-message';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { LifecycleStatus } from 'src/app/models/provider-stats.model';

import { components } from "src/app/models/service-catalog";
import { environment } from 'src/environments/environment';
type ServiceSpecification_Create = components["schemas"]["ServiceSpecification_Create"];
type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
type ProductSpecificationCharacteristic = components["schemas"]["CharacteristicSpecification"];

@Component({
  selector: 'create-service-spec',
  templateUrl: './create-service-spec.component.html',
  styleUrl: './create-service-spec.component.css'
})
export class CreateServiceSpecComponent implements OnInit, OnDestroy, DoCheck {

  @Input() serv: any = null;
  isEditMode: boolean = false;
  partyId: any = '';

  serviceToCreate: ServiceSpecification_Create | undefined;

  stepsElements: string[] = ['general-info', 'chars'];
  stepsCircles: string[] = ['general-circle', 'chars-circle'];
  currentStep = 0;
  highestStep = 0;
  assetTypes: AssetType[] = [];
  assetTypesLoading = false;
  assetTypesError = false;
  private serviceTypeChanged = false;

  get selectedAssetType(): AssetType | undefined {
    return this.assetTypes.find(type => type.id === this.generalForm.controls.serviceType.value);
  }

  get configurationStep(): number {
    return this.selectedAssetType ? 2 : 1;
  }

  get steps(): string[] {
    return [
      'CREATE_SERV_SPEC._step_general_info',
      ...(this.selectedAssetType ? ['CREATE_SERV_SPEC._step_service_details'] : []),
      'CREATE_SERV_SPEC._step_configuration_options'
    ];
  }

  detailsForm = new FormGroup({
    fileId: new FormControl('', { nonNullable: true, validators: [Validators.required, noWhitespaceValidator] })
  });
  metadataForm = new FormRecord<FormControl<string | boolean | null>>({});
  metadataFields: { key: string; definition: AssetTypeFormField }[] = [];
  uploadingAsset = false;
  pendingAssetFile: File | null = null;
  assetFileName = '';
  assetUploadError = '';
  private assetUpload?: Subscription;
  private managedCharacteristicNames = new Set<string>();

  get serviceDetailsValid(): boolean {
    return !this.selectedAssetType || (
      !!this.selectedAssetType.categoryId &&
      (!this.selectedAssetType.requiresFile || !!this.pendingAssetFile || this.detailsForm.controls.fileId.valid) &&
      this.metadataForm.valid && !this.uploadingAsset
    );
  }

  //markdown variables:
  showPreview: boolean = false;
  showEmoji: boolean = false;
  description: string = '';

  //CONTROL VARIABLES:
  showGeneral: boolean = true;
  showChars: boolean = false;
  showSummary: boolean = false;
  //Check if step was done
  generalDone: boolean = false;
  charsDone: boolean = false;
  finishDone: boolean = false;

  //SERVICE GENERAL INFO:
  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
    serviceType: new FormControl('', { nonNullable: true }),
  });

  //CHARS INFO
  charsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('')
  });
  charIsOptional: boolean = false;
  stringCharSelected: boolean = true;
  numberCharSelected: boolean = false;
  rangeCharSelected: boolean = false;
  booleanCharSelected: boolean = false;
  booleanDefaultTrue: boolean = true;
  prodChars: ProductSpecificationCharacteristic[] = [];
  creatingChars: CharacteristicValueSpecification[] = [];
  showCreateChar: boolean = false;

  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;
  editingCharIdx: number | null = null;
  openCharMenuIdx: number | null = null;
  showLeaveModal: boolean = false;
  showSuccessModal: boolean = false;
  createdServiceId: string | null = null;

  //CHARS
  stringValue: string = '';
  numberValue: string = '';
  numberUnit: string = '';
  fromValue: string = '';
  toValue: string = '';
  rangeUnit: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private elementRef: ElementRef,
    private servSpecService: ServiceSpecServiceService,
    private translate: TranslateService,
    private attachmentService: AttachmentServiceService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        } else if (ev.type === 'LeaveServiceSpecEditorRequest') {
          this.onBackClick();
        }
      })
  }

  @HostListener('document:click')
  onClick() {
    if (this.showEmoji == true) {
      this.showEmoji = false;
      this.cdr.detectChanges();
    }
    if (this.openCharMenuIdx !== null) {
      this.openCharMenuIdx = null;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.initPartyInfo();
    if (this.serv) {
      this.isEditMode = true;
      this.createdServiceId = this.serv.id;
      this.generalForm.patchValue({
        name: this.serv.name || '',
        description: this.serv.description || ''
      });
      this.prodChars = (this.serv.specCharacteristic || []).map((c: any) => ({
        ...c,
        _lastUpdate: c._lastUpdate || this.serv.lastUpdate || new Date(),
        _isOptional: c._isOptional || false
      }));
      this.highestStep = 1;
    }
    this.loadAssetTypes();
  }

  loadAssetTypes(): void {
    this.assetTypesLoading = true;
    this.assetTypesError = false;
    this.servSpecService.getAssetTypes().pipe(takeUntil(this.destroy$)).subscribe({
      next: types => {
        this.assetTypes = types;
        this.assetTypesLoading = false;
        // Existing associations use the public category identifier, never the plugin id.
        const characteristic = this.serv?.specCharacteristic?.find(
          (c: any) => c.name?.toLowerCase() === 'service type');
        const categoryId = characteristic?.characteristicValueSpecification?.[0]?.value;
        const assetType = types.find(type => !!type.categoryId && type.categoryId === categoryId);
        if (!this.serviceTypeChanged && assetType) {
          this.generalForm.controls.serviceType.setValue(assetType.id);
          this.configureServiceDetails(true);
          this.highestStep = this.configurationStep;
        }
      },
      error: () => {
        this.assetTypesLoading = false;
        this.assetTypesError = true;
      }
    });
  }

  onServiceTypeChange(): void {
    if (this.loading) return;
    this.serviceTypeChanged = true;
    this.currentStep = 0;
    this.highestStep = 0;
    this.serviceToCreate = undefined;
    this.prodChars = [];
    this.managedCharacteristicNames.clear();
    this.charsForm.reset();
    this.refreshChars();
    this.showCreateChar = false;
    this.editingCharIdx = null;
    this.openCharMenuIdx = null;
    this.charIsOptional = false;
    this.configureServiceDetails();
  }

  private configureServiceDetails(restore = false): void {
    this.cancelAssetUpload();
    this.pendingAssetFile = null;
    this.assetFileName = '';
    this.assetUploadError = '';
    this.metadataForm = new FormRecord<FormControl<string | boolean | null>>({});
    this.metadataFields = [];
    const type = this.selectedAssetType;
    this.detailsForm.reset({ fileId: '' });
    if (!type) return;

    const fields = type.form || {};
    const order = [...(type.formOrder || []), ...Object.keys(fields)];
    this.metadataFields = [...new Set(order)].filter(key => !!fields[key])
      .map(key => ({ key, definition: fields[key] }));
    const names = ['Service Type', 'File', ...this.metadataFields.map(field => field.key)];
    const existingValue = (name: string): unknown => restore
      ? this.serv?.specCharacteristic?.find((c: any) => c.name?.toLowerCase() === name.toLowerCase())
        ?.characteristicValueSpecification?.[0]?.value
      : undefined;

    const fileId = existingValue('File');
    if (type.requiresFile && typeof fileId === 'string') {
      this.detailsForm.controls.fileId.setValue(fileId);
    }
    for (const { key, definition } of this.metadataFields) {
      const saved = existingValue(key);
      const value = saved !== undefined ? saved
        : definition.default !== undefined ? definition.default
        : definition.type === 'checkbox' ? false : '';
      const validators: ValidatorFn[] = [];
      if (definition.type === 'checkbox') {
        // Validators.required rejects false, which is a valid supplied boolean here.
        validators.push(control => typeof control.value === 'boolean' ? null : { boolean: true });
      } else {
        if (definition.mandatory) validators.push(Validators.required, noWhitespaceValidator);
        if (definition.type === 'select') {
          validators.push(control => !control.value || definition.options?.some(option => option.value === control.value)
            ? null : { option: true });
        }
      }
      this.metadataForm.addControl(key, new FormControl(value as string | boolean, validators));
    }
    names.forEach(name => this.managedCharacteristicNames.add(name.toLowerCase()));
    // Managed values have their own inputs, rather than editable configuration rows.
    this.prodChars = this.prodChars.filter(c => !this.managedCharacteristicNames.has(c.name?.toLowerCase() || ''));
  }

  private cancelAssetUpload(): void {
    this.assetUpload?.unsubscribe();
    this.assetUpload = undefined;
    this.uploadingAsset = false;
  }

  onAssetFileSelected(event: Event): void {
    if (this.loading) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.selectedAssetType?.requiresFile) return;
    this.cancelAssetUpload();
    this.detailsForm.controls.fileId.setValue('');
    this.pendingAssetFile = null;
    this.assetFileName = file.name;
    this.assetUploadError = '';
    if (file.size > environment.MAX_FILE_SIZE) {
      this.assetUploadError = this.translate.instant('CREATE_SERV_SPEC._asset_file_size_error');
      return;
    }
    const acceptedTypes = this.selectedAssetType.mediaTypes;
    const mediaType = file.type || 'application/octet-stream';
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(mediaType)) {
      this.assetUploadError = this.translate.instant('CREATE_SERV_SPEC._asset_media_type_error');
      return;
    }
    this.pendingAssetFile = file;
  }

  private uploadPendingAsset(file: File): Observable<string> {
    this.uploadingAsset = true;
    return this.attachmentService.uploadManagedFile(file, {
      contentType: file.type || 'application/octet-stream',
      isPublic: false
    }).pipe(
      map(data => {
        // Only the Resource ID establishes the managed-file relationship.
        if (typeof data?.id !== 'string' || !data.id.trim()) {
          throw new Error(this.translate.instant('CREATE_SERV_SPEC._asset_upload_error'));
        }
        return data.id;
      })
    );
  }

  ngDoCheck() {
    const open = !!(this.showCreateChar || this.showSuccessModal || this.showLeaveModal);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    this.cancelAssetUpload();
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  goBack() {
    this.eventMessage.emitSellerServiceSpec(true);
  }

  onBackClick(): void {
    if (this.loading) return;
    if (!this.isEditMode && this.hasAnyDraftData()) {
      this.showLeaveModal = true;
    } else {
      this.goBack();
    }
  }

  hasAnyDraftData(): boolean {
    return !!(
      this.generalForm.value.name ||
      this.generalForm.value.description ||
      this.generalForm.value.serviceType ||
      this.prodChars.length > 0 ||
      this.charsForm.value.name ||
      this.charsForm.value.description ||
      this.creatingChars.length > 0 ||
      this.stringValue ||
      this.numberValue ||
      this.numberUnit ||
      this.fromValue ||
      this.toValue ||
      this.rangeUnit
    );
  }

  cancelLeave(): void {
    this.showLeaveModal = false;
  }

  discardLeave(): void {
    this.showLeaveModal = false;
    this.goBack();
  }

  canSaveDraftServiceSpec(): boolean {
    return !this.loading && this.generalForm.valid && this.serviceDetailsValid;
  }

  confirmLeave(): void {
    if (!this.canSaveDraftServiceSpec()) {
      this.generalForm.markAllAsTouched();
      this.detailsForm.markAllAsTouched();
      this.metadataForm.markAllAsTouched();
      return;
    }

    this.showLeaveModal = false;
    this.persistService(false);
  }

  finishAsDraft() {
    this.eventMessage.emitSpecCreated(this.translate.instant(this.isEditMode ? 'CREATE_SERV_SPEC._update_success' : 'CREATE_SERV_SPEC._create_success'));
    if (!this.isEditMode) {
      this.eventMessage.emitProviderStatsTransition({
        entity: 'serviceSpecification',
        previousLifecycleStatus: null,
        nextLifecycleStatus: 'Active'
      });
    }
    this.showSuccessModal = false;
    this.eventMessage.emitSellerServiceSpec(true);
  }

  validateService() {
    if (!this.createdServiceId) {
      this.finishAsDraft();
      return;
    }
    this.loading = true;
    this.servSpecService.updateServSpec({ lifecycleStatus: 'Launched' }, this.createdServiceId).subscribe({
      next: () => {
        this.loading = false;
        this.eventMessage.emitSpecCreated(this.translate.instant('CREATE_SERV_SPEC._validate_success'));
        this.eventMessage.emitProviderStatsTransition({
          entity: 'serviceSpecification',
          previousLifecycleStatus: this.isEditMode ? this.serv?.lifecycleStatus as LifecycleStatus : null,
          nextLifecycleStatus: 'Launched'
        });
        this.showSuccessModal = false;
        this.eventMessage.emitSellerServiceSpec(true);
      },
      error: (error: any) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(error, 'CREATE_SERV_SPEC._validate_error');
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 3000);
      }
    });
  }

  private getErrorMessage(error: any, fallbackKey: string): string {
    return formatApiErrorMessage(this.translate, fallbackKey, error);
  }

  toggleGeneral() {
    this.selectStep('general-info', 'general-circle');
    this.showGeneral = true;
    this.showChars = false;
    this.showSummary = false;
    this.showPreview = false;
    this.refreshChars();
  }

  toggleChars() {
    this.selectStep('chars', 'chars-circle');
    this.showGeneral = false;
    this.showChars = true;
    this.showSummary = false;
    this.showPreview = false;
    this.refreshChars();
  }

  onTypeChange(event: any) {
    const value = event.target.value;
    this.stringCharSelected = value == 'string';
    this.numberCharSelected = value == 'number';
    this.rangeCharSelected = value == 'range';
    this.booleanCharSelected = value == 'boolean';
    this.creatingChars = [];
    if (this.booleanCharSelected) {
      this.booleanDefaultTrue = true;
      this.setBooleanDefaultValues();
    }
  }

  setBooleanDefaultValues() {
    this.creatingChars = [
      {
        isDefault: this.booleanDefaultTrue,
        value: true as any
      },
      {
        isDefault: !this.booleanDefaultTrue,
        value: false as any
      }
    ];
  }

  onBooleanDefaultChange() {
    if (this.booleanCharSelected) {
      this.setBooleanDefaultValues();
    }
  }

  addCharValue() {
    if (this.stringCharSelected) {
      console.log('string')
      if (this.creatingChars.length == 0) {
        this.creatingChars.push({
          isDefault: true,
          value: this.stringValue as any
        })
      } else {
        this.creatingChars.push({
          isDefault: false,
          value: this.stringValue as any
        })
      }
      this.stringValue = '';
    } else if (this.numberCharSelected) {
      console.log('number')
      if (this.creatingChars.length == 0) {
        this.creatingChars.push({
          isDefault: true,
          value: this.numberValue as any,
          unitOfMeasure: this.numberUnit
        })
      } else {
        this.creatingChars.push({
          isDefault: false,
          value: this.numberValue as any,
          unitOfMeasure: this.numberUnit
        })
      }
      this.numberUnit = '';
      this.numberValue = '';
    } else {
      console.log('range')
      if (this.creatingChars.length == 0) {
        this.creatingChars.push({
          isDefault: true,
          valueFrom: this.fromValue as any,
          valueTo: this.toValue as any,
          unitOfMeasure: this.rangeUnit
        })
      } else {
        this.creatingChars.push({
          isDefault: false,
          valueFrom: this.fromValue as any,
          valueTo: this.toValue as any,
          unitOfMeasure: this.rangeUnit
        })
      }
    }
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
  }

  selectDefaultChar(char: any, idx: any) {
    for (let i = 0; i < this.creatingChars.length; i++) {
      if (i == idx) {
        this.creatingChars[i].isDefault = true;
      } else {
        this.creatingChars[i].isDefault = false;
      }
    }
  }

  saveChar() {
    if (this.charsForm.value.name != null) {
      const existing: any = this.editingCharIdx !== null ? this.prodChars[this.editingCharIdx] : null;
      const charData: any = {
        id: existing ? existing.id : 'urn:ngsi-ld:characteristic:' + uuidv4(),
        name: this.charsForm.value.name,
        description: this.charsForm.value.description != null ? this.charsForm.value.description : '',
        characteristicValueSpecification: this.creatingChars,
        _lastUpdate: new Date(),
        _isOptional: this.charIsOptional
      };
      if (existing) {
        this.prodChars[this.editingCharIdx as number] = charData;
        this.editingCharIdx = null;
      } else {
        this.editingCharIdx = null;
        this.prodChars.push(charData);
      }
    }

    this.charsForm.reset();
    this.creatingChars = [];
    this.showCreateChar = false;
    this.stringCharSelected = true;
    this.numberCharSelected = false;
    this.rangeCharSelected = false;
    this.booleanCharSelected = false;
    this.booleanDefaultTrue = true;
    this.charIsOptional = false;
    this.refreshChars();
    this.cdr.detectChanges();
  }

  editChar(idx: number) {
    const char: any = this.prodChars[idx];
    this.editingCharIdx = idx;
    this.charsForm.patchValue({
      name: char.name,
      description: char.description
    });
    this.charIsOptional = char._isOptional || false;
    this.creatingChars = [...(char.characteristicValueSpecification || [])];
    const vals = this.creatingChars as any[];
    const first = vals[0];
    const isBoolean = vals.length > 0 && vals.every(c =>
      c.value === true || c.value === false || c.value === 'true' || c.value === 'false');
    if (first?.valueFrom !== undefined) {
      this.stringCharSelected = false;
      this.numberCharSelected = false;
      this.rangeCharSelected = true;
      this.booleanCharSelected = false;
    } else if (isBoolean) {
      this.stringCharSelected = false;
      this.numberCharSelected = false;
      this.rangeCharSelected = false;
      this.booleanCharSelected = true;
      const def = vals.find(c => c.isDefault);
      this.booleanDefaultTrue = def ? (def.value === true || def.value === 'true') : true;
    } else if (first?.unitOfMeasure) {
      this.stringCharSelected = false;
      this.numberCharSelected = true;
      this.rangeCharSelected = false;
      this.booleanCharSelected = false;
    } else {
      this.stringCharSelected = true;
      this.numberCharSelected = false;
      this.rangeCharSelected = false;
      this.booleanCharSelected = false;
    }
    this.openCharMenuIdx = null;
    this.showCreateChar = true;
  }

  formatCharValues(prod: any): string {
    const values = prod.characteristicValueSpecification || [];
    return values.map((c: any) => {
      if (c.valueFrom !== undefined && c.valueFrom !== null) {
        return `${c.valueFrom}-${c.valueTo}${c.unitOfMeasure ? ' ' + c.unitOfMeasure : ''}`;
      }
      return c.unitOfMeasure ? `${c.value} ${c.unitOfMeasure}` : `${c.value}`;
    }).join(',');
  }

  formatLastUpdate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} - ${hh}:${mi}`;
  }

  toggleCharMenu(idx: number, event: Event) {
    event.stopPropagation();
    this.openCharMenuIdx = this.openCharMenuIdx === idx ? null : idx;
  }

  removeCharValue(char: any, idx: any) {
    console.log(this.creatingChars)
    this.creatingChars.splice(idx, 1);
    console.log(this.creatingChars)
  }

  deleteChar(char: any) {
    const index = this.prodChars.findIndex(item => item.id === char.id);
    if (index !== -1) {
      this.prodChars.splice(index, 1);
      if (this.editingCharIdx === index) {
        this.editingCharIdx = null;
        this.showCreateChar = false;
        this.charsForm.reset();
        this.refreshChars();
        this.charIsOptional = false;
      } else if (this.editingCharIdx !== null && this.editingCharIdx > index) {
        this.editingCharIdx = this.editingCharIdx - 1;
      }
    }
    this.cdr.detectChanges();
  }

  buildServiceToCreate() {
    if (this.generalForm.value.name != null) {
      const cleanChars = this.prodChars.map((c: any) => {
        const { _lastUpdate, _isOptional, ...rest } = c;
        return rest;
      });
      const type = this.selectedAssetType;
      if (type || this.serviceTypeChanged) {
        const managed = new Set([...this.managedCharacteristicNames, 'service type']);
        for (let i = cleanChars.length - 1; i >= 0; i--) {
          if (managed.has(cleanChars[i].name?.toLowerCase())) cleanChars.splice(i, 1);
        }
      }
      const addCharacteristic = (name: string, value: unknown) => {
        cleanChars.push({ name, characteristicValueSpecification: [{ value }] });
      };
      if (type?.categoryId) {
        addCharacteristic('Service Type', type.categoryId);
        if (type.requiresFile) addCharacteristic('File', this.detailsForm.controls.fileId.value);
        for (const { key } of this.metadataFields) {
          const value = this.metadataForm.controls[key].value;
          if (value !== null && value !== '') addCharacteristic(key, value);
        }
      }
      this.serviceToCreate = {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: "Active",
        specCharacteristic: cleanChars,
        relatedParty: [
          {
            id: this.partyId,
            role: environment.SELLER_ROLE,
            "@referredType": ''
          }
        ],
      }
    }
  }

  createService() {
    this.persistService(true);
  }

  private persistService(showReadyModal: boolean) {
    if (!this.canSaveDraftServiceSpec()) {
      this.generalForm.markAllAsTouched();
      this.detailsForm.markAllAsTouched();
      this.metadataForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.assetUploadError = '';
    const prepareFile = this.selectedAssetType?.requiresFile && this.pendingAssetFile
      ? this.uploadPendingAsset(this.pendingAssetFile)
      : of(this.detailsForm.controls.fileId.value);
    this.assetUpload = prepareFile.pipe(
      switchMap(fileId => {
        this.detailsForm.controls.fileId.setValue(fileId);
        this.pendingAssetFile = null;
        this.uploadingAsset = false;
        this.buildServiceToCreate();
        if (this.isEditMode && this.createdServiceId) {
          const { relatedParty, lifecycleStatus, ...patchBody } = this.serviceToCreate as any;
          return this.servSpecService.updateServSpec(patchBody, this.createdServiceId);
        }
        return this.servSpecService.postServSpec(this.serviceToCreate);
      }),
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading = false;
        this.uploadingAsset = false;
      })
    ).subscribe({
      next: (data: any) => {
        if (!this.isEditMode) this.createdServiceId = data?.id || null;
        if (showReadyModal) {
          this.showSuccessModal = true;
        } else {
          this.finishAsDraft();
        }
      },
      error: error => {
        const fallback = this.uploadingAsset
          ? (error?.status === 413 ? 'CREATE_SERV_SPEC._asset_file_size_error' : 'CREATE_SERV_SPEC._asset_upload_error')
          : (this.isEditMode ? 'CREATE_SERV_SPEC._update_error' : 'CREATE_SERV_SPEC._create_error');
        this.errorMessage = this.getErrorMessage(error, fallback);
        if (this.uploadingAsset) this.assetUploadError = this.errorMessage;
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 3000);
      }
    });
  }

  refreshChars() {
    this.stringValue = '';
    this.numberValue = '';
    this.numberUnit = '';
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
    this.stringCharSelected = true;
    this.numberCharSelected = false;
    this.rangeCharSelected = false;
    this.booleanCharSelected = false;
    this.booleanDefaultTrue = true;
    this.creatingChars = [];
  }

  //STEPS METHODS
  removeClass(elem: HTMLElement, cls: string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls: string) {
    elem.className += (" " + cls);
  }

  unselectMenu(elem: HTMLElement | null, cls: string) {
    if (elem != null) {
      if (elem.className.match(cls)) {
        this.removeClass(elem, cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectMenu(elem: HTMLElement | null, cls: string) {
    if (elem != null) {
      if (elem.className.match(cls)) {
        console.log('already selected')
      } else {
        this.addClass(elem, cls)
      }
    }
  }

  //STEPS CSS EFFECTS:
  selectStep(step: string, stepCircle: string) {
    const index = this.stepsElements.findIndex(item => item === step);
    if (index !== -1) {
      this.stepsElements.splice(index, 1);
      this.selectMenu(document.getElementById(step), 'text-primary-100 dark:text-primary-50')
      this.unselectMenu(document.getElementById(step), 'text-offerings-muted-text')
      for (let i = 0; i < this.stepsElements.length; i++) {
        this.unselectMenu(document.getElementById(this.stepsElements[i]), 'text-primary-100 dark:text-primary-50')
        this.selectMenu(document.getElementById(this.stepsElements[i]), 'text-offerings-muted-text')
      }
      this.stepsElements.push(step);
    }
    const circleIndex = this.stepsCircles.findIndex(item => item === stepCircle);
    if (index !== -1) {
      this.stepsCircles.splice(circleIndex, 1);
      this.selectMenu(document.getElementById(stepCircle), 'border-primary-100 dark:border-primary-50')
      this.unselectMenu(document.getElementById(stepCircle), 'border-offerings-border-strong');
      for (let i = 0; i < this.stepsCircles.length; i++) {
        this.unselectMenu(document.getElementById(this.stepsCircles[i]), 'border-primary-100 dark:border-primary-50')
        this.selectMenu(document.getElementById(this.stepsCircles[i]), 'border-offerings-border-strong');
      }
      this.stepsCircles.push(stepCircle);
    }
  }

  //Markdown actions:
  addBold() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + ' **bold text** '
    });
  }

  addItalic() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + ' _italicized text_ '
    });
  }

  addList() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n- First item\n- Second item'
    });
  }

  addOrderedList() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n1. First item\n2. Second item'
    });
  }

  addCode() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n`code`'
    });
  }

  addCodeBlock() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n```\ncode\n```'
    });
  }

  addBlockquote() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n> blockquote'
    });
  }

  addLink() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + ' [title](https://www.example.com) '
    });
  }

  addTable() {
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
    });
  }

  addEmoji(event: any) {
    console.log(event)
    this.showEmoji = false;
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + event.emoji.native
    });
  }

  togglePreview() {
    if (this.generalForm.value.description) {
      this.description = this.generalForm.value.description;
    } else {
      this.description = ''
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  goToStep(index: number) {
    if (this.loading) return;
    if (index < 0 || index >= this.steps.length) return;
    // Solo validar en modo creación
    if (index > this.currentStep) {
      // Validar el paso actual
      const currentStepValid = this.generalForm.valid &&
        (index <= 1 || this.serviceDetailsValid);
      if (!currentStepValid) {
        return; // No permitir avanzar si el paso actual no es válido
      }
    }

    this.currentStep = index;
    if (this.currentStep > this.highestStep) {
      this.highestStep = this.currentStep
    }
    this.refreshChars();
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0: // General Info
        return this.generalForm?.valid || false;
      case 1:
        return this.serviceDetailsValid;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    return !this.loading && this.generalForm.valid && index <= this.highestStep;
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }

}
