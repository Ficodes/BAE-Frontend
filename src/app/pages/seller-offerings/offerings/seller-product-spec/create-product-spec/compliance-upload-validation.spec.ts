import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, Observable, of, Subject, throwError } from 'rxjs';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { CreateProductSpecComponent } from './create-product-spec.component';

type UploadField = 'self attestation' | 'additional attachments';

describe('Compliance document uploads', () => {
  let fixture: ComponentFixture<CreateProductSpecComponent>;
  let component: CreateProductSpecComponent;
  let upload: jasmine.Spy;

  function select(field: UploadField, files: File[]) {
    const input = { files, value: 'selected' } as unknown as HTMLInputElement;
    const event = { target: input } as unknown as Event;
    if (field === 'self attestation') component.onSelfAttestationSelected(event);
    else component.onComplianceFileSelected(event);
    expect(input.value).toBe('');
  }

  function waitForUploads(count = 1, response: Observable<any> = of({ content: 'https://files.test/document.pdf' })): Promise<any[]> {
    const payloads: any[] = [];
    return new Promise(resolve => {
      upload.and.callFake((payload: any) => {
        payloads.push(payload);
        if (payloads.length === count) resolve(payloads);
        return response;
      });
    });
  }

  function entries(field: UploadField) {
    return field === 'self attestation'
      ? component.selfAttestationFile ? [component.selfAttestationFile] : []
      : component.complianceFiles;
  }

  function errorMessages(field: UploadField): string[] {
    return field === 'self attestation'
      ? component.selfAttestationError ? [component.selfAttestationError] : []
      : component.complianceFileErrors.map(error => error.message);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateProductSpecComponent],
      imports: [TranslateModule.forRoot(), FormsModule, ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(CreateProductSpecComponent);
    component = fixture.componentInstance;
    upload = spyOn(TestBed.inject(AttachmentServiceService), 'uploadFile');
    fixture.detectChanges();
    component.generalForm.patchValue({ name: 'Test product', description: 'Product details' });
    component.productImageRef = { url: 'https://files.test/image.png' };
    component.howItWorks = 'How it works';
    component.currentStep = component.steps.length - 1;
    fixture.detectChanges();
  });

  it('advertises document formats and filters the picker in both fields', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(2);
    for (const input of Array.from(inputs)) expect(input.accept).toBe('.pdf,.doc,.docx');
    expect(fixture.nativeElement.textContent).toContain('CREATE_PROD_SPEC._attachment_formats');
    expect(fixture.nativeElement.textContent).not.toContain('CREATE_PROD_SPEC._image_formats');
    expect(fixture.nativeElement.querySelector('[data-cy="prodSpecFinish"]').disabled).toBeFalse();
  });

  for (const field of ['self attestation', 'additional attachments'] as const) {
    for (const [name, type] of [
      ['notes.txt', 'text/plain'], ['page.html', 'text/html'], ['image.png', 'image/png'],
      ['fake.pdf', 'text/plain'], ['fake.docx', 'application/pdf'], ['file.pdf.exe', 'application/pdf'],
      ['no-extension', 'application/pdf'], ['unknown.doc', 'application/octet-stream']
    ]) {
      it(`rejects ${name} (${type}) in ${field} before reading or uploading`, () => {
        const read = spyOn(FileReader.prototype, 'readAsDataURL');
        select(field, [new File(['Test bytes'], name, { type })]);
        expect(read).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
        expect(entries(field)).toEqual([]);
        expect(component.selfAtt).toBeNull();
        expect(component.additionalISOS).toEqual([]);
        expect((component as any).buildComplianceChars()).toEqual([]);
        expect(errorMessages(field)).toEqual(['CREATE_PROD_SPEC._compliance_document_type_error']);
        fixture.detectChanges();
        const selector = field === 'self attestation' ? '[data-cy="selfAttestationError"]' : '[data-cy="complianceFileError"]';
        expect(fixture.nativeElement.querySelector(selector).textContent).toContain('CREATE_PROD_SPEC._compliance_document_type_error');
      });
    }

    for (const [name, type, expectedType] of [
      ['document.pdf', 'application/pdf', 'application/pdf'],
      ['document.doc', 'application/msword', 'application/msword'],
      ['document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['DOCUMENT.PDF', 'application/pdf', 'application/pdf'],
      ['document.docx', '', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    ]) {
      it(`accepts ${name} (${type || 'no MIME supplied'}) in ${field} with the expected upload MIME`, async () => {
        const decoder = spyOn(component as any, 'readProductImage');
        const done = waitForUploads();
        select(field, [new File(['Test document bytes'], name, { type })]);
        expect(component.uploadingCompliance).toBeTrue();
        const [payload] = await done;
        expect(payload.contentType).toBe(expectedType);
        expect(atob(payload.content.data)).toBe('Test document bytes');
        expect(decoder).not.toHaveBeenCalled();
        expect(entries(field)[0].url).toBe('https://files.test/document.pdf');
        expect(errorMessages(field)).toEqual([]);
        expect(component.uploadingCompliance).toBeFalse();
      });
    }

    it(`blocks all save paths and validation while ${field} is uploading`, async () => {
      const service = TestBed.inject(ProductSpecServiceService);
      const create = spyOn(service, 'postProdSpec');
      const update = spyOn(service, 'updateProdSpec');
      const response = new Subject<any>();
      const done = waitForUploads(1, response);
      if (field === 'additional attachments') component.selfAttestationFile = { name: 'self.pdf', url: 'https://files.test/self.pdf' };
      select(field, [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);

      expect(component.uploadingCompliance).toBeTrue();
      expect(component.canSaveDraftProductSpec()).toBeFalse();
      component.createProduct();
      component.finishAsDraft();
      component.validateProduct();
      component.confirmLeave();
      component.requestValidation();
      expect(component.showSuccessModal).toBeFalse();
      expect(component.showRequestValidationModal).toBeFalse();
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-cy="prodSpecFinish"]').disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('[data-cy="requestComplianceValidation"]').disabled).toBeTrue();

      await done;
      expect(component.uploadingCompliance).toBeTrue();
      response.next({ content: 'https://files.test/evidence.pdf' });
      response.complete();
      expect(component.canSaveDraftProductSpec()).toBeTrue();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-cy="prodSpecFinish"]').disabled).toBeFalse();
      component.requestValidation();
      expect(component.showRequestValidationModal).toBeTrue();
    });

    it(`cancels a ${field} file read on removal`, () => {
      const abort = spyOn(FileReader.prototype, 'abort').and.callThrough();
      select(field, [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);
      if (field === 'self attestation') component.removeSelfAttestation();
      else component.removeComplianceFile(0);
      expect(abort).toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
      expect(entries(field)).toEqual([]);
      expect(component.uploadingCompliance).toBeFalse();
    });

    it(`cancels an in-flight ${field} upload on removal and ignores its late response`, async () => {
      const response = new Subject<any>();
      const cancelled = jasmine.createSpy('cancelled');
      const done = waitForUploads(1, response.pipe(finalize(cancelled)));
      select(field, [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);
      await done;
      if (field === 'self attestation') component.removeSelfAttestation();
      else component.removeComplianceFile(0);
      expect(cancelled).toHaveBeenCalled();
      response.next({ content: 'https://files.test/stale.pdf' });
      expect(entries(field)).toEqual([]);
      expect(component.selfAtt).toBeNull();
      expect(component.additionalISOS).toEqual([]);
      expect(component.uploadingCompliance).toBeFalse();
    });

    for (const event of ['error', 'abort', 'exception']) {
      it(`reports a file read ${event} in ${field} without leaving it pending`, () => {
        spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function(this: FileReader) {
          if (event === 'exception') throw new Error('Read failed');
          this.dispatchEvent(new ProgressEvent(event));
        });
        select(field, [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);
        expect(upload).not.toHaveBeenCalled();
        expect(entries(field)).toEqual([]);
        expect(component.uploadingCompliance).toBeFalse();
        expect(errorMessages(field)).toEqual(['CREATE_PROD_SPEC._file_upload_error']);
      });
    }

    for (const status of [413, 500]) {
      it(`reports an upload ${status} in ${field} and removes the failed entry`, async () => {
        const done = waitForUploads(1, throwError(() => ({ status })));
        select(field, [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);
        await done;
        expect(entries(field)).toEqual([]);
        expect(component.uploadingCompliance).toBeFalse();
        expect(errorMessages(field)).toEqual([status === 413 ? 'CREATE_PROD_SPEC._file_size_error' : 'CREATE_PROD_SPEC._file_upload_error']);
      });
    }
  }

  it('uploads only the allowed files in a mixed selection and identifies each rejection', async () => {
    const done = waitForUploads(2);
    select('additional attachments', [
      new File(['Text'], 'notes.txt', { type: 'text/plain' }),
      new File(['Document'], 'evidence.pdf', { type: 'application/pdf' }),
      new File(['HTML'], 'page.html', { type: 'text/html' }),
      new File(['Document'], 'evidence.doc', { type: 'application/msword' })
    ]);
    await done;
    expect(upload).toHaveBeenCalledTimes(2);
    expect(component.complianceFiles.map(file => file.name)).toEqual(['evidence.pdf', 'evidence.doc']);
    expect(component.complianceFileErrors.map(error => error.name)).toEqual(['notes.txt', 'page.html']);
    expect(component.additionalISOS.length).toBe(2);
  });

  it('preserves an existing self attestation when its proposed replacement is rejected', () => {
    const existing = { id: 'existing', name: 'self.pdf', url: 'https://files.test/self.pdf' };
    component.selfAttestationFile = existing;
    select('self attestation', [new File(['Text'], 'notes.txt', { type: 'text/plain' })]);
    expect(component.selfAttestationFile).toBe(existing);
    expect(upload).not.toHaveBeenCalled();
    expect(component.selfAttestationError).toBe('CREATE_PROD_SPEC._compliance_document_type_error');
  });

  it('cancels an older self attestation on replacement so its response cannot overwrite the new one', async () => {
    const previous = new Subject<any>();
    const cancelled = jasmine.createSpy('cancelled');
    const first = waitForUploads(1, previous.pipe(finalize(cancelled)));
    select('self attestation', [new File(['Old'], 'old.pdf', { type: 'application/pdf' })]);
    await first;
    const current = new Subject<any>();
    const second = waitForUploads(1, current);
    select('self attestation', [new File(['New'], 'new.doc', { type: 'application/msword' })]);
    expect(cancelled).toHaveBeenCalled();
    await second;
    previous.next({ content: 'https://files.test/stale.pdf' });
    previous.error({ status: 500 });
    current.next({ content: 'https://files.test/new.doc' });
    current.complete();
    expect(component.selfAttestationFile?.name).toBe('new.doc');
    expect(component.selfAttestationFile?.url).toBe('https://files.test/new.doc');
    expect(component.selfAttestationError).toBeNull();
  });

  it('keeps saving blocked until every parallel Compliance upload finishes', async () => {
    const response = new Subject<any>();
    const done = waitForUploads(2, response);
    select('self attestation', [new File(['Document'], 'self.pdf', { type: 'application/pdf' })]);
    select('additional attachments', [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);
    await done;
    component.removeSelfAttestation();
    expect(component.uploadingCompliance).toBeTrue();
    expect(component.canSaveDraftProductSpec()).toBeFalse();
    response.next({ content: 'https://files.test/evidence.pdf' });
    response.complete();
    expect(component.uploadingCompliance).toBeFalse();
    expect(component.canSaveDraftProductSpec()).toBeTrue();
  });

  it('cancels all Compliance uploads on destruction', async () => {
    const response = new Subject<any>();
    const cancelled = jasmine.createSpy('cancelled');
    const done = waitForUploads(2, response.pipe(finalize(cancelled)));
    select('self attestation', [new File(['Document'], 'self.pdf', { type: 'application/pdf' })]);
    select('additional attachments', [new File(['Document'], 'evidence.pdf', { type: 'application/pdf' })]);
    await done;
    fixture.destroy();
    expect(cancelled).toHaveBeenCalledTimes(2);
    response.next({ content: 'https://files.test/stale.pdf' });
    expect(component.selfAttestationFile?.url).toBeUndefined();
    expect(component.complianceFiles[0].url).toBeUndefined();
  });
});
