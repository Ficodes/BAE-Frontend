import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { AttachmentServiceService, ManagedFileUpload } from 'src/app/services/attachment-service.service';
import { environment } from 'src/environments/environment';
import { AssetType } from 'src/app/models/asset-type.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';

import { CreateResourceSpecComponent } from './create-resource-spec.component';

describe('CreateResourceSpecComponent', () => {
  let component: CreateResourceSpecComponent;
  let fixture: ComponentFixture<CreateResourceSpecComponent>;
  let eventMessage: EventMessageService;
  let resourceSpecService: ResourceSpecServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateResourceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateResourceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
    resourceSpecService = TestBed.inject(ResourceSpecServiceService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const assetType: AssetType = {
    id: 'example_plugin', href: '/charging/api/assetManagement/assetTypes/example_plugin',
    name: 'Example Plugin', author: 'Provider', version: '1.0',
    categoryId: 'resource-category-id', mediaTypes: [], requiresFile: false, overrides: []
  };

  // Mirrors the backend's examples/plugins/logging-service/package.json.
  const loggingType: AssetType = {
    ...assetType, requiresFile: true, mediaTypes: ['application/json', 'text/plain', 'application/octet-stream'],
    formOrder: ['display_name', 'region', 'enabled', 'notes', 'reference', 'notifications'],
    form: {
      display_name: { type: 'text', label: 'Display name', placeholder: 'Enter a test service name', mandatory: true, default: 'Demo service' },
      notes: { type: 'textarea', label: 'Notes', placeholder: 'Describe the test service', default: 'First line of notes\nSecond line of notes' },
      region: { type: 'select', label: 'Region', mandatory: true, default: 'eu', options: [
        { text: 'Europe', value: 'eu' }, { text: 'United States', value: 'us' }, { text: 'Asia Pacific', value: 'apac' }
      ] },
      enabled: { type: 'checkbox', label: 'Enable test flag', mandatory: true, default: false },
      reference: { type: 'text', label: 'Optional reference', placeholder: 'Leave empty to test an omitted optional field' },
      notifications: { type: 'checkbox', label: 'Test notifications flag', default: true }
    }
  };
  const uploaded: ManagedFileUpload = {
    id: '507f1f77bcf86cd799439011', href: '/assets/resource', content: 'https://files.example/file.json', contentType: 'application/json'
  };

  function selectPlugin(type = loggingType): void {
    spyOn(resourceSpecService, 'getAssetTypes').and.returnValue(of([type]));
    fixture.detectChanges();
    component.generalForm.patchValue({ name: 'Logging', resourceType: type.id });
    component.onResourceTypeChange();
    component.goToStep(1);
    fixture.detectChanges();
  }

  function chooseFile(file = new File(['{}'], 'service.json', { type: 'application/json' })): File {
    const input = { files: [file], value: file.name };
    component.onAssetFileSelected({ target: input } as unknown as Event);
    expect(input.value).toBe('');
    return file;
  }

  function payloadValues(): Record<string, any> {
    return Object.fromEntries((component.resourceToCreate?.resourceSpecCharacteristic || [])
      .map((c: any) => [c.name, c.resourceSpecCharacteristicValue[0].value]));
  }

  it('loads installed types on opening and keeps the selector optional', () => {
    const request = spyOn(resourceSpecService, 'getAssetTypes').and.returnValue(of([assetType]));
    fixture.detectChanges();
    expect(request).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('#res-type').textContent).toContain('Example Plugin');
    expect(component.steps.length).toBe(2);
  });

  it('keeps ordinary resources usable without plugin characteristics or uploads', () => {
    spyOn(resourceSpecService, 'getAssetTypes').and.returnValue(of([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#res-type')).toBeNull();
    expect(component.steps.length).toBe(2);
    component.generalForm.controls.name.setValue('Ordinary');
    component.prodChars = [{ name: 'Unrelated', resourceSpecCharacteristicValue: [{ value: 'keep' as any }] }];
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile');
    const post = spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'ordinary' }));
    component.createResource();
    expect(upload).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalled();
    expect(payloadValues()).toEqual({ Unrelated: 'keep' });
  });

  it('disables types whose category has not been synchronized', () => {
    spyOn(resourceSpecService, 'getAssetTypes').and.returnValue(of([{ ...assetType, categoryId: null }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#res-type option[value="example_plugin"]').disabled).toBeTrue();
  });

  it('offers retry after a failed plugin request', () => {
    const request = spyOn(resourceSpecService, 'getAssetTypes').and.returnValue(throwError(() => ({ status: 401 })));
    fixture.detectChanges();
    expect(component.assetTypesError).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    request.and.returnValue(of([assetType]));
    component.loadAssetTypes();
    expect(component.assetTypesError).toBeFalse();
  });

  for (const requiresFile of [true, false]) {
    it('renders the logging form with requiresFile=' + requiresFile, () => {
      selectPlugin({ ...loggingType, requiresFile });
      const root: HTMLElement = fixture.nativeElement;
      expect(!!root.querySelector('#asset-file')).toBe(requiresFile);
      expect(root.querySelector('#asset-source')).toBeNull();
      expect(root.querySelector('#asset-url')).toBeNull();
      expect(root.querySelector('#asset-media-type')).toBeNull();
      const fields = Array.from(root.querySelectorAll('[id^="asset-field-"]'));
      expect(fields.map(input => input.id.replace('asset-field-', ''))).toEqual(loggingType.formOrder!);
      expect(fields.map(input => input.tagName)).toEqual(['INPUT', 'SELECT', 'INPUT', 'TEXTAREA', 'INPUT', 'INPUT']);
      expect((root.querySelector('#asset-field-reference') as HTMLInputElement).placeholder).toBe(loggingType.form!['reference'].placeholder!);
      expect((root.querySelector('#asset-field-enabled') as HTMLInputElement).checked).toBeFalse();
      expect(component.metadataForm.controls['notes'].value).toBe('First line of notes\nSecond line of notes');
      expect(component.resourceDetailsValid).toBe(!requiresFile);
    });
  }

  it('uses mediaTypes as file hints and imposes no restriction when the list is empty', () => {
    selectPlugin({ ...loggingType, mediaTypes: [], formOrder: [] });
    expect(fixture.nativeElement.querySelector('#asset-file').hasAttribute('accept')).toBeFalse();
    expect(component.metadataFields.map(field => field.key)).toEqual(Object.keys(loggingType.form!));
    chooseFile(new File(['image'], 'image.png', { type: 'image/png' }));
    expect(component.pendingAssetFile).toBeTruthy();
  });

  it('restricts the file input to the plugin mediaTypes and rejects files outside that list', () => {
    selectPlugin({ ...loggingType, mediaTypes: ['application/json', 'text/plain'] });
    const input = fixture.nativeElement.querySelector('#asset-file') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe('application/json,text/plain');
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile');
    const post = spyOn(resourceSpecService, 'postResSpec');

    for (const [name, type, allowed] of [
      ['data.json', 'application/json', true],
      ['notes.txt', 'text/plain', true],
      ['image.png', 'image/png', false],
      ['binary.bin', 'application/octet-stream', false],
      ['unknown', '', false]
    ] as const) {
      const file = new File(['data'], name, { type });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(component.pendingAssetFile).toBe(allowed ? file : null);
      expect(component.resourceDetailsValid).toBe(allowed);
      expect((fixture.nativeElement.querySelector('[data-cy="resSpecNext"]') as HTMLButtonElement).disabled).toBe(!allowed);
      if (!allowed) {
        expect(component.assetUploadError).toBeTruthy();
        component.createResource();
        expect(post).not.toHaveBeenCalled();
      }
    }
    expect(upload).not.toHaveBeenCalled();
  });

  it('marks mandatory fields and disables Continue, direct navigation, Save and draft saves when missing', () => {
    selectPlugin();
    const root: HTMLElement = fixture.nativeElement;
    const required = root.querySelector('#asset-field-display_name') as HTMLInputElement;
    expect(required.required).toBeTrue();
    expect(root.querySelector('label[for="asset-field-display_name"]')?.textContent).toContain('*');
    expect(root.querySelector('#asset-field-enabled')?.getAttribute('aria-required')).toBe('true');
    expect(root.querySelector('#asset-file')?.getAttribute('accept')).toBe(loggingType.mediaTypes.join(','));
    expect((root.querySelector('[data-cy="resSpecNext"]') as HTMLButtonElement).disabled).toBeTrue();
    component.goToStep(2);
    expect(component.currentStep).toBe(1);
    const post = spyOn(resourceSpecService, 'postResSpec');
    component.createResource();
    expect(post).not.toHaveBeenCalled();
    chooseFile();
    fixture.detectChanges();
    expect((root.querySelector('[data-cy="resSpecNext"]') as HTMLButtonElement).disabled).toBeFalse();
    required.value = '';
    required.dispatchEvent(new Event('input'));
    required.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(required.getAttribute('aria-invalid')).toBe('true');
    expect((root.querySelector('[data-cy="resSpecNext"]') as HTMLButtonElement).disabled).toBeTrue();
    expect(component.canSaveDraftResourceSpec()).toBeFalse();
    component.metadataForm.controls['display_name'].setValue('Name');
    component.goToStep(2);
    component.metadataForm.controls['region'].setValue('');
    fixture.detectChanges();
    expect((root.querySelector('[data-cy="resSpecFinish"]') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('submits category and File string IDs, false and mandatory defaults explicitly with one primitive value per field', () => {
    selectPlugin();
    component.detailsForm.controls.fileId.setValue(uploaded.id);
    component.prodChars.push({ name: 'Unrelated', resourceSpecCharacteristicValue: [{ value: 'keep' as any }] });
    const post = spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'saved' }));
    component.createResource();
    expect(post).toHaveBeenCalled();
    expect(payloadValues()).toEqual({
      'Resource type': loggingType.categoryId, File: uploaded.id,
      Unrelated: 'keep', display_name: 'Demo service', region: 'eu', enabled: false,
      notes: 'First line of notes\nSecond line of notes', notifications: true
    });
    expect(component.resourceToCreate?.resourceSpecCharacteristic?.every(c => c.resourceSpecCharacteristicValue?.length === 1)).toBeTrue();
    expect(payloadValues()['Service Type']).toBeUndefined();
    expect(payloadValues()['URL']).toBeUndefined();
    expect(payloadValues()['Media Type']).toBeUndefined();
  });

  it('submits unchecked optional checkboxes as false and omits empty optional text', () => {
    selectPlugin({ ...assetType, form: {
      url: { type: 'text', mandatory: true, default: 'https://service.example' },
      optional: { type: 'checkbox' }, reference: { type: 'text', placeholder: 'Hint' }
    } });
    spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'saved' }));
    component.createResource();
    expect(component.metadataForm.controls['optional'].value).toBeFalse();
    expect(payloadValues()).toEqual({ 'Resource type': assetType.categoryId, url: 'https://service.example', optional: false });
    expect(component.showSuccessModal).toBeTrue();
  });

  it('rejects a select value outside the configured options', () => {
    selectPlugin({ ...loggingType, requiresFile: false });
    component.metadataForm.controls['region'].setValue('invalid');
    expect(component.resourceDetailsValid).toBeFalse();
  });

  it('restores existing string IDs and primitive values without substituting defaults for false or empty strings', () => {
    component.res = {
      id: 'existing', name: 'Existing', resourceSpecCharacteristic: [
        { name: 'resource TYPE', resourceSpecCharacteristicValue: [{ value: loggingType.categoryId }] },
        { name: 'FILE', resourceSpecCharacteristicValue: [{ value: uploaded.id }] },
        { name: 'DISPLAY_NAME', resourceSpecCharacteristicValue: [{ value: '' }] },
        { name: 'NOTIFICATIONS', resourceSpecCharacteristicValue: [{ value: false }] },
        { name: 'REGION', resourceSpecCharacteristicValue: [{ value: 'apac' }] },
        { name: 'Unrelated', resourceSpecCharacteristicValue: [{ value: 'keep' }] }
      ]
    };
    spyOn(resourceSpecService, 'getAssetTypes').and.returnValue(of([loggingType]));
    fixture.detectChanges();
    expect(component.generalForm.controls.resourceType.value).toBe(loggingType.id);
    expect(component.detailsForm.controls.fileId.value).toBe(uploaded.id);
    expect(component.metadataForm.controls['display_name'].value).toBe('');
    expect(component.metadataForm.controls['notifications'].value).toBeFalse();
    expect(component.metadataForm.controls['region'].value).toBe('apac');
    expect(component.prodChars.map(c => c.name)).toEqual(['Unrelated']);
    component.metadataForm.controls['display_name'].setValue('Updated');
    const patch = spyOn(resourceSpecService, 'updateResSpec').and.returnValue(of({}));
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile');
    component.createResource();
    expect(upload).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith(jasmine.objectContaining({
      resourceSpecCharacteristic: jasmine.arrayContaining([
        { name: 'File', resourceSpecCharacteristicValue: [{ value: uploaded.id }] },
        { name: 'Resource type', resourceSpecCharacteristicValue: [{ value: loggingType.categoryId }] }
      ])
    }), 'existing');
    const names = component.resourceToCreate!.resourceSpecCharacteristic!.map(c => c.name!.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('resets file selection, metadata and configuration when changing plugin and restores the new defaults', () => {
    selectPlugin();
    const other = { ...assetType, id: 'other-plugin', categoryId: 'other-category' };
    component.assetTypes.push(other);
    chooseFile();
    component.metadataForm.controls['display_name'].setValue('Changed');
    component.prodChars = [{ name: 'Old config' }];
    component.charsForm.controls.name.setValue('Unfinished');
    component.goToStep(0);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#res-type') as HTMLSelectElement;
    select.value = other.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.pendingAssetFile).toBeNull();
    expect(component.detailsForm.value).toEqual({ fileId: '' });
    expect(component.metadataForm.value).toEqual({});
    expect(component.prodChars).toEqual([]);
    expect(component.charsForm.value.name).toBeNull();
    expect(component.highestStep).toBe(0);
    expect(component.generalForm.value.name).toBe('Logging');
    select.value = loggingType.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.metadataForm.controls['display_name'].value).toBe('Demo service');
    expect(component.metadataForm.untouched).toBeTrue();
  });

  it('keeps files local until Save, then submits the upload response ID instead of its content or href', () => {
    selectPlugin();
    const response = new Subject<ManagedFileUpload>();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile').and.returnValue(response);
    const saved = new Subject<any>();
    const post = spyOn(resourceSpecService, 'postResSpec').and.returnValue(saved);
    const file = chooseFile();
    expect(upload).not.toHaveBeenCalled();
    expect(component.canSaveDraftResourceSpec()).toBeTrue();
    component.createResource();
    component.createResource(); // Duplicate click is ignored while saving.
    expect(upload).toHaveBeenCalledOnceWith(file, { contentType: 'application/json', isPublic: false });
    expect(post).not.toHaveBeenCalled();
    response.next(uploaded);
    response.complete();
    expect(post).toHaveBeenCalledTimes(1);
    expect(payloadValues()['File']).toBe(uploaded.id);
    expect(payloadValues()['File']).not.toBe(uploaded.content);
    expect(payloadValues()['File']).not.toBe(uploaded.href);
    expect(component.loading).toBeTrue();
    saved.next({ id: 'saved' });
    saved.complete();
    expect(component.loading).toBeFalse();
  });

  it('uploads before updating an existing resource specification', () => {
    component.res = { id: 'existing', name: 'Existing', resourceSpecCharacteristic: [] };
    selectPlugin();
    spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile').and.returnValue(of(uploaded));
    const patch = spyOn(resourceSpecService, 'updateResSpec').and.returnValue(of({}));
    chooseFile();
    component.createResource();
    expect(patch).toHaveBeenCalledWith(jasmine.objectContaining({
      resourceSpecCharacteristic: jasmine.arrayContaining([{ name: 'File', resourceSpecCharacteristicValue: [{ value: uploaded.id }] }])
    }), 'existing');
  });

  it('uses application/octet-stream when a file has no browser MIME type', () => {
    selectPlugin();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile').and.returnValue(of(uploaded));
    spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'saved' }));
    const file = chooseFile(new File(['data'], 'unknown'));
    component.createResource();
    expect(upload).toHaveBeenCalledWith(file, { contentType: 'application/octet-stream', isPublic: false });
  });

  it('accepts filenames allowed by the backend regex without modifying them', () => {
    selectPlugin();
    for (const name of ['service.json', '.env', '...', ' report.json ', 'café 数据.txt', 'data:name*.json',
      '\uFEFF', 'line\u2028name.txt', 'line\u2029name.txt']) {
      const file = new File(['{}'], 'placeholder.json', { type: 'application/json' });
      Object.defineProperty(file, 'name', { value: name });
      chooseFile(file);
      expect(component.pendingAssetFile).withContext(JSON.stringify(name)).toBe(file);
      expect(component.assetFileName).toBe(name);
      expect(component.assetUploadError).toBe('');
    }
  });

  it('shows filename errors and blocks saving for every forbidden character and blank or dot names', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { CREATE_RES_SPEC: { _asset_file_name_error: 'Invalid file name' } });
    translate.use('en');
    selectPlugin();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile');
    const post = spyOn(resourceSpecService, 'postResSpec');
    const invalidNames = ['', '.', '..', ' ', '\t', '\u00a0', '\u2028\u2029',
      ...['/', '\\', '#', '?', '%'].map(character => 'file' + character + '.json'),
      ...Array.from({ length: 32 }, (_, code) => 'file' + String.fromCharCode(code) + '.json'),
      ...Array.from({ length: 33 }, (_, index) => 'file' + String.fromCharCode(127 + index) + '.json'),
      'file.json\n', 'file.json\r\n'];

    for (const name of invalidNames) {
      chooseFile(); // A rejected replacement must also clear any previously selected file.
      const file = new File(['{}'], 'placeholder.json', { type: 'application/json' });
      // File constructors can normalize separators; validate the exact supplied name.
      Object.defineProperty(file, 'name', { value: name });
      chooseFile(file);
      fixture.detectChanges();
      expect(component.pendingAssetFile).withContext(JSON.stringify(name)).toBeNull();
      expect(component.assetUploadError).toBe('Invalid file name');
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Invalid file name');
      expect((fixture.nativeElement.querySelector('[data-cy="resSpecNext"]') as HTMLButtonElement).disabled).toBeTrue();
      component.createResource();
      expect(post).not.toHaveBeenCalled();
    }
    expect(upload).not.toHaveBeenCalled();
  });

  it('clears the filename error when a valid replacement is selected', () => {
    selectPlugin();
    chooseFile(new File(['{}'], 'invalid#name.json', { type: 'application/json' }));
    expect(component.assetUploadError).toBeTruthy();
    const valid = chooseFile();
    fixture.detectChanges();
    expect(component.pendingAssetFile).toBe(valid);
    expect(component.assetUploadError).toBe('');
    expect((fixture.nativeElement.querySelector('[data-cy="resSpecNext"]') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('rejects unsupported or oversized files without uploading', () => {
    selectPlugin();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile');
    chooseFile(new File(['x'], 'image.png', { type: 'image/png' }));
    expect(component.assetUploadError).toBeTruthy();
    expect(component.pendingAssetFile).toBeNull();
    const file = new File(['x'], 'large.json', { type: 'application/json' });
    Object.defineProperty(file, 'size', { value: environment.MAX_FILE_SIZE + 1 });
    chooseFile(file);
    component.createResource();
    expect(upload).not.toHaveBeenCalled();
  });

  it('stops on upload errors or missing string IDs, and retries the same local file', () => {
    selectPlugin();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile')
      .and.returnValue(throwError(() => ({ status: 500 })));
    const post = spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'saved' }));
    chooseFile();
    component.createResource();
    expect(component.loading).toBeFalse();
    expect(component.assetUploadError).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    upload.and.returnValue(of({ ...uploaded, id: '' }));
    component.createResource();
    expect(post).not.toHaveBeenCalled(); // content/href must never substitute for id.
    upload.and.returnValue(of(uploaded));
    component.createResource();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reuses the Resource ID after a specification save failure', () => {
    selectPlugin();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile').and.returnValue(of(uploaded));
    const post = spyOn(resourceSpecService, 'postResSpec').and.returnValue(throwError(() => ({ status: 500 })));
    chooseFile();
    component.createResource();
    post.and.returnValue(of({ id: 'saved' }));
    component.createResource();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('uploads before saving a draft when leaving the editor', () => {
    selectPlugin();
    const response = new Subject<ManagedFileUpload>();
    spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile').and.returnValue(response);
    const post = spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'draft' }));
    chooseFile();
    component.confirmLeave();
    expect(post).not.toHaveBeenCalled();
    response.next(uploaded);
    response.complete();
    expect(post).toHaveBeenCalledTimes(1);
    expect(component.showSuccessModal).toBeFalse();
  });

  it('does not upload when discarding and cancels an in-progress save on destroy', () => {
    selectPlugin();
    const response = new Subject<ManagedFileUpload>();
    const upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadManagedFile').and.returnValue(response);
    const post = spyOn(resourceSpecService, 'postResSpec');
    chooseFile();
    component.discardLeave();
    expect(upload).not.toHaveBeenCalled();
    component.createResource();
    component.ngOnDestroy();
    response.next(uploaded);
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
    spyOn(eventMessage, 'emitSellerResourceSpec');

    component.goBack();

    expect(eventMessage.emitSellerResourceSpec).toHaveBeenCalledWith(true);
  });

  it('should leave directly when leaving service spec creation without draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerResourceSpec');

    component.onBackClick();

    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should show the leave modal when leaving service spec creation with draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerResourceSpec');
    component.generalForm.patchValue({ name: 'Draft service' });

    component.onBackClick();

    expect(component.showLeaveModal).toBeTrue();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should keep the leave modal open when saving service draft without mandatory data', () => {
    const saveSpy = spyOn(resourceSpecService, 'postResSpec');
    component.showLeaveModal = true;
    component.generalForm.patchValue({ description: 'Draft description' });

    component.confirmLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
  });

  it('should discard service spec draft changes without saving them', () => {
    const saveSpy = spyOn(resourceSpecService, 'postResSpec');
    const backSpy = spyOn(eventMessage, 'emitSellerResourceSpec');
    component.showLeaveModal = true;

    component.discardLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should save a valid service spec draft when confirming leave', () => {
    const saveSpy = spyOn(resourceSpecService, 'postResSpec').and.returnValue(of({ id: 'res-1' }) as any);
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

    eventMessage.emitLeaveResourceSpecEditorRequest();

    expect(component.showLeaveModal).toBeTrue();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
