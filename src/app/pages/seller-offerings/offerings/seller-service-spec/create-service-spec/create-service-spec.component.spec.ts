import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { environment } from 'src/environments/environment';
import { AssetType } from 'src/app/models/asset-type.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';

import { CreateServiceSpecComponent } from './create-service-spec.component';

describe('CreateServiceSpecComponent', () => {
  let component: CreateServiceSpecComponent;
  let fixture: ComponentFixture<CreateServiceSpecComponent>;
  let eventMessage: EventMessageService;
  let serviceSpecService: ServiceSpecServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateServiceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateServiceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    serviceSpecService = TestBed.inject(ServiceSpecServiceService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const assetType: AssetType = {
    id: 'example_plugin', href: '/charging/api/assetManagement/assetTypes/example_plugin',
    name: 'Example Plugin', author: 'Provider', version: '1.0',
    categoryId: 'service-category-id', mediaTypes: [], formats: ['URL'], overrides: []
  };

  it('loads types on opening and renders the optional selector', () => {
    const request = spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([assetType]));
    fixture.detectChanges();
    expect(request).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('#serv-type').textContent).toContain('Example Plugin');
    expect(component.steps.length).toBe(2);
  });

  it('keeps the original flow when no plugins are installed', () => {
    spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#serv-type')).toBeNull();
    expect(component.steps.length).toBe(2);
  });

  it('inserts the details step after selection and removes it when cleared', () => {
    spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([assetType]));
    fixture.detectChanges();
    component.generalForm.controls.name.setValue('Service');
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#serv-type');
    select.value = assetType.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.steps.length).toBe(3);
    component.goToStep(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('_step_service_details');
    component.detailsForm.patchValue({ url: 'https://service.example', mediaType: 'application/json' });
    component.goToStep(2);
    expect(component.currentStep).toBe(component.configurationStep);
    component.goToStep(0);
    fixture.detectChanges();
    const updatedSelect: HTMLSelectElement = fixture.nativeElement.querySelector('#serv-type');
    updatedSelect.value = '';
    updatedSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.steps.length).toBe(2);
    expect(component.highestStep).toBe(0);
  });

  it('disables unsynchronized plugins', () => {
    spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([{ ...assetType, categoryId: null }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#serv-type option[value="example_plugin"]').disabled).toBeTrue();
  });

  it('shows a recoverable load error and allows the generic flow', () => {
    const request = spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(throwError(() => ({ status: 401 })));
    fixture.detectChanges();
    expect(component.assetTypesError).toBeTrue();
    expect(component.assetTypesLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    request.and.returnValue(of([assetType]));
    component.loadAssetTypes();
    expect(component.assetTypesError).toBeFalse();
    expect(component.assetTypes).toEqual([assetType]);
  });

  it('serializes the public category id once and removes the association when cleared', () => {
    component.assetTypes = [assetType];
    component.generalForm.patchValue({ name: 'Service', serviceType: assetType.id });
    component.onServiceTypeChange();
    component.prodChars = [
      { name: 'sErViCe TyPe', characteristicValueSpecification: [{ value: { id: 'old' } as any }] },
      { name: 'Other', characteristicValueSpecification: [{ value: 'keep' as any }] }
    ];
    component.buildServiceToCreate();
    expect(component.serviceToCreate?.specCharacteristic).toEqual([
      jasmine.objectContaining({ name: 'Other' }),
      { name: 'Service Type', characteristicValueSpecification: [{ value: { id: assetType.categoryId } as any }] },
      { name: 'URL', characteristicValueSpecification: [{ value: '' as any }] },
      { name: 'Media Type', characteristicValueSpecification: [{ value: '' as any }] }
    ]);
    component.generalForm.controls.serviceType.setValue('');
    component.onServiceTypeChange();
    component.buildServiceToCreate();
    expect(component.serviceToCreate?.specCharacteristic).toEqual([]);
  });

  it('restores an existing association using categoryId and preserves it on load failure', () => {
    component.serv = {
      id: 'spec-id', name: 'Existing',
      specCharacteristic: [{ name: 'SERVICE TYPE', characteristicValueSpecification: [{ value: { id: assetType.categoryId } }] }]
    };
    const request = spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([assetType]));
    component.ngOnInit();
    expect(component.generalForm.controls.serviceType.value).toBe(assetType.id);
    expect(component.steps.length).toBe(3);
    request.and.returnValue(throwError(() => new Error('Unavailable')));
    component.loadAssetTypes();
    component.buildServiceToCreate();
    expect(component.serviceToCreate?.specCharacteristic?.[0].name).toBe('Service Type');
  });

  const loggingType: AssetType = {
    ...assetType, formats: ['URL', 'FILE'], mediaTypes: ['application/json', 'text/plain'],
    formOrder: ['display_name', 'region', 'enabled', 'notes', 'reference', 'notifications'],
    form: {
      reference: { type: 'text', placeholder: 'External reference' },
      notifications: { type: 'checkbox', default: true },
      display_name: { type: 'text', label: 'Display name', mandatory: true, default: 'Demo service' },
      enabled: { type: 'checkbox', mandatory: true, default: false },
      notes: { type: 'textarea', default: 'Line one\nLine two' },
      region: { type: 'select', mandatory: true, default: 'eu', options: [
        { text: 'Europe', value: 'eu' }, { text: 'United States', value: 'us' }, { text: 'Asia Pacific', value: 'apac' }
      ] }
    }
  };

  function selectLoggingType(type = loggingType): void {
    spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([type]));
    fixture.detectChanges();
    component.generalForm.patchValue({ name: 'Logging', serviceType: type.id });
    component.onServiceTypeChange();
    component.goToStep(1);
    fixture.detectChanges();
  }

  function chooseFile(file = new File(['{}'], 'service.json', { type: 'application/json' })): void {
    const input = { files: [file], value: 'service.json' };
    component.onAssetFileSelected({ target: input } as unknown as Event);
    expect(input.value).toBe('');
  }

  function mockFileRead(): void {
    spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function(this: FileReader) {
      Object.defineProperty(this, 'result', { value: 'data:application/json;base64,e30=' });
      this.onload?.call(this, new ProgressEvent('load') as ProgressEvent<FileReader>);
    });
  }

  it('renders ordered plugin inputs, initializes typed defaults and leaves placeholders empty', () => {
    selectLoggingType();
    const inputs = [...fixture.nativeElement.querySelectorAll('[id^="asset-field-"]')] as HTMLInputElement[];
    expect(inputs.map(input => input.id.replace('asset-field-', ''))).toEqual(loggingType.formOrder!);
    expect(inputs.map(input => input.tagName)).toEqual(['INPUT', 'SELECT', 'INPUT', 'TEXTAREA', 'INPUT', 'INPUT']);
    expect(component.metadataForm.value).toEqual({
      display_name: 'Demo service', region: 'eu', enabled: false,
      notes: 'Line one\nLine two', reference: '', notifications: true
    });
    expect(fixture.nativeElement.querySelector('#asset-field-reference').placeholder).toBe('External reference');
    expect(fixture.nativeElement.querySelector('#asset-field-enabled').checked).toBeFalse();
    expect(fixture.nativeElement.querySelector('#asset-media-type').tagName).toBe('SELECT');
    expect(fixture.nativeElement.querySelector('#asset-source')).toBeTruthy();
  });

  it('blocks next, direct navigation, finish and draft saves until all required details are valid', () => {
    selectLoggingType();
    const post = spyOn(serviceSpecService, 'postServSpec');
    component.goToStep(2);
    expect(component.currentStep).toBe(1);
    component.createService();
    expect(post).not.toHaveBeenCalled();
    expect(component.canSaveDraftServiceSpec()).toBeFalse();
    component.detailsForm.patchValue({ url: 'https://logging.example', mediaType: 'application/json' });
    expect(component.serviceDetailsValid).toBeTrue();
    component.metadataForm.controls['display_name'].setValue(' ');
    expect(component.serviceDetailsValid).toBeFalse();
    component.metadataForm.controls['display_name'].setValue('Logging');
    component.metadataForm.controls['region'].setValue('invalid');
    expect(component.serviceDetailsValid).toBeFalse();
    component.metadataForm.controls['region'].setValue('us');
    component.detailsForm.controls.mediaType.setValue('image/png');
    expect(component.serviceDetailsValid).toBeFalse();
    component.detailsForm.controls.mediaType.setValue('application/json');
    expect(component.serviceDetailsValid).toBeTrue();
    component.goToStep(2);
    expect(component.currentStep).toBe(2);
  });

  it('marks required inputs and disables Continue whenever a mandatory value is missing', () => {
    selectLoggingType();
    const root: HTMLElement = fixture.nativeElement;
    const input = (id: string) => root.querySelector('#' + id) as HTMLInputElement;
    const next = () => root.querySelector('[data-cy="servSpecNext"]') as HTMLButtonElement;
    expect(input('asset-url').required).toBeTrue();
    expect(input('asset-media-type').required).toBeTrue();
    expect(input('asset-field-display_name').required).toBeTrue();
    expect(input('asset-field-region').required).toBeTrue();
    expect(input('asset-field-reference').required).toBeFalse();
    expect(input('asset-field-enabled').getAttribute('aria-required')).toBe('true');
    expect(input('asset-field-enabled').required).toBeFalse();
    expect(root.querySelector('label[for="asset-field-display_name"]')?.textContent).toContain('*');
    expect(root.querySelector('label[for="asset-field-enabled"]')?.textContent).toContain('*');
    expect(next().disabled).toBeTrue();

    input('asset-url').value = 'https://logging.example';
    input('asset-url').dispatchEvent(new Event('input'));
    const media = input('asset-media-type');
    media.value = 'application/json';
    media.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(next().disabled).toBeFalse(); // Required false checkbox is supplied.

    input('asset-field-display_name').value = '';
    input('asset-field-display_name').dispatchEvent(new Event('input'));
    input('asset-field-display_name').dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(next().disabled).toBeTrue();
    expect(input('asset-field-display_name').getAttribute('aria-invalid')).toBe('true');

    component.metadataForm.controls['display_name'].setValue('Name');
    component.goToStep(2);
    component.metadataForm.controls['region'].setValue('');
    fixture.detectChanges();
    expect((root.querySelector('[data-cy="servSpecFinish"]') as HTMLButtonElement).disabled).toBeTrue();
    expect(component.canSaveDraftServiceSpec()).toBeFalse();
  });

  it('resets details and configuration when the service type changes from General info', () => {
    selectLoggingType();
    const nextType: AssetType = {
      ...assetType, id: 'another-plugin', categoryId: 'another-category', mediaTypes: [],
      form: { required_value: { type: 'text', mandatory: true }, initial: { type: 'text', default: 'New default' } }
    };
    component.assetTypes.push(nextType);
    component.detailsForm.patchValue({ url: 'https://old.example', mediaType: 'application/json' });
    component.metadataForm.patchValue({ display_name: 'Old name', reference: 'Old reference' });
    component.prodChars = [{ name: 'Old config' }];
    component.goToStep(0);
    component.generalForm.controls.description.setValue('Description');
    component.charsForm.patchValue({ name: 'Unfinished option', description: 'Old description' });
    component.charIsOptional = true;
    component.editingCharIdx = 0;
    component.assetFileName = 'old.json';
    component.assetUploadError = 'Old error';
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#serv-type') as HTMLSelectElement;
    select.value = nextType.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.currentStep).toBe(0);
    expect(component.highestStep).toBe(0);
    expect(component.detailsForm.value).toEqual({ source: 'URL', url: '', mediaType: '' });
    expect(component.detailsForm.pristine).toBeTrue();
    expect(component.detailsForm.untouched).toBeTrue();
    expect(component.metadataForm.value).toEqual({ required_value: '', initial: 'New default' });
    expect(component.metadataForm.pristine).toBeTrue();
    expect(component.metadataForm.untouched).toBeTrue();
    expect(component.assetFileName).toBe('');
    expect(component.assetUploadError).toBe('');
    expect(component.prodChars).toEqual([]);
    expect(component.charsForm.value).toEqual({ name: null, description: null });
    expect(component.editingCharIdx).toBeNull();
    expect(component.charIsOptional).toBeFalse();
    expect(component.generalForm.value.name).toBe('Logging');
    expect(component.generalForm.value.description).toBe('Description');
    component.goToStep(1);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[data-cy="servSpecNext"]') as HTMLButtonElement).disabled).toBeTrue();

    component.goToStep(0);
    fixture.detectChanges();
    const originalSelect = fixture.nativeElement.querySelector('#serv-type') as HTMLSelectElement;
    originalSelect.value = loggingType.id;
    originalSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.metadataForm.controls['display_name'].value).toBe('Demo service');
    expect(component.metadataForm.controls['reference'].value).toBe('');
    expect(component.detailsForm.controls.url.value).toBe('');
  });

  it('submits false booleans, multiline defaults and one value per field, omitting blank optional strings', () => {
    selectLoggingType();
    component.detailsForm.patchValue({ url: 'https://logging.example', mediaType: 'application/json' });
    component.prodChars.push({ name: 'Unrelated', characteristicValueSpecification: [{ value: 'keep' as any }] });
    const post = spyOn(serviceSpecService, 'postServSpec').and.returnValue(of({ id: 'saved' }));
    component.createService();
    const characteristics = post.calls.mostRecent().args[0].specCharacteristic;
    expect(characteristics.every((c: any) => c.characteristicValueSpecification.length === 1)).toBeTrue();
    const values = Object.fromEntries(characteristics.map((c: any) => [c.name, c.characteristicValueSpecification[0].value]));
    expect(values).toEqual({
      Unrelated: 'keep', 'Service Type': { id: loggingType.categoryId },
      URL: 'https://logging.example', 'Media Type': 'application/json',
      display_name: 'Demo service', region: 'eu', enabled: false,
      notes: 'Line one\nLine two', notifications: true
    });
  });

  it('uses a media type text input for unrestricted plugins and supports missing formOrder', () => {
    selectLoggingType({ ...loggingType, mediaTypes: [], formats: ['URL'], formOrder: [] });
    expect(fixture.nativeElement.querySelector('#asset-media-type').tagName).toBe('INPUT');
    expect(fixture.nativeElement.querySelector('#asset-source')).toBeNull();
    expect(component.metadataFields.map(field => field.key)).toEqual(Object.keys(loggingType.form!));
    component.detailsForm.patchValue({ url: 'https://logging.example', mediaType: 'custom/type' });
    expect(component.serviceDetailsValid).toBeTrue();
  });

  it('restores case-insensitive saved values including false and blank strings instead of defaults', () => {
    component.serv = {
      id: 'spec-id', name: 'Existing',
      specCharacteristic: [
        { name: 'service TYPE', characteristicValueSpecification: [{ value: { id: loggingType.categoryId } }] },
        { name: 'url', characteristicValueSpecification: [{ value: 'https://existing.example' }] },
        { name: 'media TYPE', characteristicValueSpecification: [{ value: 'application/json' }] },
        { name: 'DISPLAY_NAME', characteristicValueSpecification: [{ value: '' }] },
        { name: 'NOTIFICATIONS', characteristicValueSpecification: [{ value: false }] },
        { name: 'REGION', characteristicValueSpecification: [{ value: 'apac' }] },
        { name: 'Unrelated', characteristicValueSpecification: [{ value: 'keep' }] }
      ]
    };
    spyOn(serviceSpecService, 'getAssetTypes').and.returnValue(of([loggingType]));
    fixture.detectChanges();
    expect(component.metadataForm.controls['display_name'].value).toBe('');
    expect(component.metadataForm.controls['notifications'].value).toBeFalse();
    expect(component.metadataForm.controls['region'].value).toBe('apac');
    expect(component.detailsForm.controls.url.value).toBe('https://existing.example');
    expect(component.prodChars.map(c => c.name)).toEqual(['Unrelated']);
    component.metadataForm.controls['display_name'].setValue('Updated');
    const patch = spyOn(serviceSpecService, 'updateServSpec').and.returnValue(of({}));
    component.createService();
    const characteristics = patch.calls.mostRecent().args[0].specCharacteristic;
    const names = characteristics.map((c: any) => c.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('unrelated');
  });

  it('keeps the selected file local, then uploads and submits the returned URL on Save', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'], mediaTypes: ['application/json'] });
    expect(fixture.nativeElement.querySelector('#asset-file')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#asset-url')).toBeNull();
    mockFileRead();
    const response = new Subject<any>();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile').and.returnValue(response);
    const saved = new Subject<any>();
    const post = spyOn(serviceSpecService, 'postServSpec').and.returnValue(saved);
    chooseFile();
    fixture.detectChanges();
    expect(upload).not.toHaveBeenCalled();
    expect(FileReader.prototype.readAsDataURL).not.toHaveBeenCalled();
    expect(component.uploadingAsset).toBeFalse();
    expect(component.canSaveDraftServiceSpec()).toBeTrue();
    expect(component.detailsForm.controls.url.value).toBe('');
    expect((fixture.nativeElement.querySelector('[data-cy="servSpecNext"]') as HTMLButtonElement).disabled).toBeFalse();

    component.goToStep(2);
    component.createService();
    fixture.detectChanges();
    expect(component.uploadingAsset).toBeTrue();
    expect(component.canSaveDraftServiceSpec()).toBeFalse();
    expect(post).not.toHaveBeenCalled();
    expect(upload.calls.mostRecent().args[0]).toEqual({
      content: { name: jasmine.stringMatching(/_service.json$/), data: 'e30=' },
      contentType: 'application/json', isPublic: true
    });
    component.createService(); // Ignore repeated clicks while saving.
    expect(upload).toHaveBeenCalledTimes(1);
    response.next({ content: '/assets/uploaded.json' });
    response.complete();
    expect(post).toHaveBeenCalledTimes(1);
    expect(component.loading).toBeTrue(); // Save stays busy until the spec request completes.
    const url = post.calls.mostRecent().args[0].specCharacteristic.find((c: any) => c.name === 'URL');
    expect(url.characteristicValueSpecification).toEqual([{ value: environment.BASE_URL + '/assets/uploaded.json' }]);
    expect(component.pendingAssetFile).toBeNull();
    saved.next({ id: 'saved-spec' });
    saved.complete();
    expect(component.loading).toBeFalse();
    expect(component.showSuccessModal).toBeTrue();
  });

  it('does not upload invalid details or when the selected file is discarded', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile');
    const post = spyOn(serviceSpecService, 'postServSpec');
    chooseFile();
    component.metadataForm.controls['display_name'].setValue('');
    component.createService();
    expect(upload).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    component.discardLeave();
    expect(upload).not.toHaveBeenCalled();
  });

  it('stops submission on upload failure or missing URL and allows retrying the same local file', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    mockFileRead();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile')
      .and.returnValue(throwError(() => ({ status: 500 })));
    const post = spyOn(serviceSpecService, 'postServSpec').and.returnValue(of({ id: 'saved' }));
    chooseFile();
    component.createService();
    expect(component.assetUploadError).toBeTruthy();
    expect(component.uploadingAsset).toBeFalse();
    expect(component.loading).toBeFalse();
    expect(post).not.toHaveBeenCalled();
    expect(component.pendingAssetFile).toBeTruthy();
    expect(component.canSaveDraftServiceSpec()).toBeTrue();
    upload.and.returnValue(of({}));
    component.createService();
    expect(component.assetUploadError).toBeTruthy();
    expect(component.detailsForm.controls.url.value).toBe('');
    expect(post).not.toHaveBeenCalled();
    upload.and.returnValue(of({ content: 'https://files.example/service.json' }));
    component.createService();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reuses an uploaded URL if service specification creation fails and is retried', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    mockFileRead();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile')
      .and.returnValue(of({ content: 'https://files.example/service.json' }));
    const post = spyOn(serviceSpecService, 'postServSpec').and.returnValue(throwError(() => ({ status: 500 })));
    chooseFile();
    component.createService();
    expect(component.loading).toBeFalse();
    expect(component.pendingAssetFile).toBeNull();
    post.and.returnValue(of({ id: 'saved' }));
    component.createService();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('uploads before updating an existing service specification', () => {
    component.serv = { id: 'existing', name: 'Existing', specCharacteristic: [] };
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    mockFileRead();
    const response = new Subject<any>();
    spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile').and.returnValue(response);
    const patch = spyOn(serviceSpecService, 'updateServSpec').and.returnValue(of({}));
    chooseFile();
    expect(patch).not.toHaveBeenCalled();
    component.createService();
    expect(patch).not.toHaveBeenCalled();
    response.next({ content: '/updated.json' });
    response.complete();
    expect(patch).toHaveBeenCalledWith(jasmine.objectContaining({
      specCharacteristic: jasmine.arrayContaining([
        { name: 'URL', characteristicValueSpecification: [{ value: environment.BASE_URL + '/updated.json' }] }
      ])
    }), 'existing');
  });

  it('uploads before saving a draft on leaving the editor', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    mockFileRead();
    const response = new Subject<any>();
    spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile').and.returnValue(response);
    const post = spyOn(serviceSpecService, 'postServSpec').and.returnValue(of({ id: 'draft' }));
    chooseFile();
    component.showLeaveModal = true;
    component.confirmLeave();
    expect(post).not.toHaveBeenCalled();
    response.next({ content: '/draft.json' });
    response.complete();
    expect(post).toHaveBeenCalledTimes(1);
    expect(component.showSuccessModal).toBeFalse();
  });

  it('rejects unsupported and oversized files before uploading', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile');
    chooseFile(new File(['x'], 'image.png', { type: 'image/png' }));
    expect(component.assetUploadError).toBeTruthy();
    expect(component.pendingAssetFile).toBeNull();
    const large = new File(['x'], 'large.json', { type: 'application/json' });
    Object.defineProperty(large, 'size', { value: environment.MAX_FILE_SIZE + 1 });
    chooseFile(large);
    expect(component.assetUploadError).toContain('_asset_file_size_error');
    component.createService();
    expect(upload).not.toHaveBeenCalled();
  });

  it('clears local files when switching source or service type without uploading', () => {
    selectLoggingType();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile');
    component.detailsForm.controls.source.setValue('FILE');
    component.onAssetSourceChange();
    chooseFile();
    expect(component.pendingAssetFile).toBeTruthy();
    component.detailsForm.controls.source.setValue('URL');
    component.onAssetSourceChange();
    expect(component.pendingAssetFile).toBeNull();
    component.detailsForm.controls.source.setValue('FILE');
    component.onAssetSourceChange();
    chooseFile();
    component.goToStep(0);
    component.generalForm.controls.serviceType.setValue('');
    component.onServiceTypeChange();
    expect(component.pendingAssetFile).toBeNull();
    expect(component.detailsForm.controls.url.value).toBe('');
    expect(upload).not.toHaveBeenCalled();
  });

  it('cancels an in-progress save on destroy without submitting a late upload URL', () => {
    selectLoggingType({ ...loggingType, formats: ['FILE'] });
    mockFileRead();
    const response = new Subject<any>();
    spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile').and.returnValue(response);
    const post = spyOn(serviceSpecService, 'postServSpec');
    chooseFile();
    component.createService();
    component.ngOnDestroy();
    response.next({ content: '/stale.json' });
    expect(post).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('onTypeChange should toggle characteristic type flags', () => {
    component.onTypeChange({ target: { value: 'number' } });
    expect(component.stringCharSelected).toBeFalse();
    expect(component.numberCharSelected).toBeTrue();
    expect(component.rangeCharSelected).toBeFalse();

    component.onTypeChange({ target: { value: 'range' } });
    expect(component.stringCharSelected).toBeFalse();
    expect(component.numberCharSelected).toBeFalse();
    expect(component.rangeCharSelected).toBeTrue();
  });

  it('addCharValue should create default string characteristic value', () => {
    component.stringCharSelected = true;
    component.stringValue = 'basic';

    component.addCharValue();

    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[0].value).toBe('basic' as any);
    expect(component.stringValue).toBe('');
  });

  it('goBack should emit seller service spec event', () => {
    spyOn(eventMessage, 'emitSellerServiceSpec');

    component.goBack();

    expect(eventMessage.emitSellerServiceSpec).toHaveBeenCalledWith(true);
  });

  it('should leave directly when leaving service spec creation without draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerServiceSpec');

    component.onBackClick();

    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should show the leave modal when leaving service spec creation with draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerServiceSpec');
    component.generalForm.patchValue({ name: 'Draft service' });

    component.onBackClick();

    expect(component.showLeaveModal).toBeTrue();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should keep the leave modal open when saving service draft without mandatory data', () => {
    const saveSpy = spyOn(serviceSpecService, 'postServSpec');
    component.showLeaveModal = true;
    component.generalForm.patchValue({ description: 'Draft description' });

    component.confirmLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
  });

  it('should discard service spec draft changes without saving them', () => {
    const saveSpy = spyOn(serviceSpecService, 'postServSpec');
    const backSpy = spyOn(eventMessage, 'emitSellerServiceSpec');
    component.showLeaveModal = true;

    component.discardLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should save a valid service spec draft when confirming leave', () => {
    const saveSpy = spyOn(serviceSpecService, 'postServSpec').and.returnValue(of({ id: 'serv-1' }) as any);
    component.showLeaveModal = true;
    component.generalForm.patchValue({ name: 'Draft service', description: 'Service overview' });

    component.confirmLeave();

    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Draft service',
      lifecycleStatus: 'Active'
    }) as any);
    expect(component.showLeaveModal).toBeFalse();
  });

  it('should open service spec leave modal when the header leave event is emitted', () => {
    component.generalForm.patchValue({ name: 'Draft service' });

    eventMessage.emitLeaveServiceSpecEditorRequest();

    expect(component.showLeaveModal).toBeTrue();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
