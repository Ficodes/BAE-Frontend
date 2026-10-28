import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, NEVER, of, throwError } from 'rxjs';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { environment } from 'src/environments/environment';
import { CreateProductSpecComponent } from './create-product-spec.component';

type UploadField = 'image' | 'attachments' | 'self attestation' | 'compliance attachments';

describe('Product specification upload size limits', () => {
  const limit = environment.MAX_FILE_SIZE;
  let fixture: ComponentFixture<CreateProductSpecComponent>;
  let component: CreateProductSpecComponent;
  let upload: jasmine.Spy;
  let read: jasmine.Spy;
  let decode: jasmine.Spy;

  function file(field: UploadField, size: number, name?: string) {
    return new File([new Uint8Array(size)], name || (field === 'image' ? 'image.png' : 'document.pdf'), {
      type: field === 'image' ? 'image/png' : 'application/pdf'
    });
  }

  function select(field: UploadField, files: File[]) {
    const input = { files, value: 'selected' } as unknown as HTMLInputElement;
    const event = { target: input } as unknown as Event;
    switch (field) {
      case 'image': component.onProductImageSelected(event); break;
      case 'attachments': component.onAttachmentSelected(event); break;
      case 'self attestation': component.onSelfAttestationSelected(event); break;
      case 'compliance attachments': component.onComplianceFileSelected(event); break;
    }
    expect(input.value).toBe('');
  }

  function entries(field: UploadField): { name: string; size?: number }[] {
    switch (field) {
      case 'image': return component.productImage ? [component.productImage] : [];
      case 'attachments': return component.attachments;
      case 'self attestation': return component.selfAttestationFile ? [component.selfAttestationFile] : [];
      case 'compliance attachments': return component.complianceFiles;
    }
  }

  function errors(field: UploadField): string[] {
    switch (field) {
      case 'image': return component.productImageError ? [component.productImageError] : [];
      case 'attachments': return component.attachmentFileErrors.map(error => error.message);
      case 'self attestation': return component.selfAttestationError ? [component.selfAttestationError] : [];
      case 'compliance attachments': return component.complianceFileErrors.map(error => error.message);
    }
  }

  function renderField(field: UploadField) {
    component.currentStep = field === 'self attestation' || field === 'compliance attachments' ? component.steps.length - 1 : 0;
    fixture.detectChanges();
    const selectors = {
      image: '[data-cy="productImageError"]',
      attachments: '[data-cy="attachmentFileError"]',
      'self attestation': '[data-cy="selfAttestationError"]',
      'compliance attachments': '[data-cy="complianceFileError"]'
    };
    return fixture.nativeElement.querySelector(selectors[field]) as HTMLElement;
  }

  function finishReading() {
    read.and.callFake(function(this: FileReader) {
      Object.defineProperty(this, 'result', { value: 'data:application/pdf;base64,dGVzdA==', configurable: true });
      this.dispatchEvent(new ProgressEvent('load'));
    });
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
    // Isolate byte-size validation from the decoding tests in the companion suite.
    read = spyOn(FileReader.prototype, 'readAsDataURL');
    decode = spyOn(component as any, 'readProductImage').and.returnValue(NEVER);
    fixture.detectChanges();
    component.generalForm.patchValue({ name: 'Product', description: 'Description' });
    component.howItWorks = 'How it works';
  });

  for (const field of ['image', 'attachments', 'self attestation', 'compliance attachments'] as const) {
    for (const size of [limit - 1, limit, limit + 1]) {
      it(`${size > limit ? 'rejects' : 'accepts'} ${size} bytes in ${field}`, () => {
        select(field, [file(field, size)]);
        expect(upload).not.toHaveBeenCalled();
        if (size > limit) {
          expect(read).not.toHaveBeenCalled();
          expect(decode).not.toHaveBeenCalled();
          expect(entries(field)).toEqual([]);
          expect(errors(field)).toEqual(['CREATE_PROD_SPEC._file_size_error']);
          expect(renderField(field).textContent).toContain('CREATE_PROD_SPEC._file_size_error');
          expect(component.uploadingImage).toBeFalse();
          expect(component.uploadingAttachment).toBeFalse();
          expect(component.uploadingCompliance).toBeFalse();
        } else {
          expect(entries(field).length).toBe(1);
          expect(errors(field)).toEqual([]);
          if (field === 'image') expect(decode).toHaveBeenCalledTimes(1);
          else expect(read).toHaveBeenCalledTimes(1);
        }
      });
    }

    for (const { label, response, sizeError } of [
      { label: 'a nested Django request-size 400', response: { status: 400, error: { error: 'Request body exceeded settings.DATA_UPLOAD_MAX_MEMORY_SIZE.' } }, sizeError: true },
      { label: 'a raw Django request-size 400', response: { status: 400, error: '<html>RequestDataTooBig: Request body exceeded settings.DATA_UPLOAD_MAX_MEMORY_SIZE.</html>' }, sizeError: true },
      { label: 'a request-size 400 detail', response: { status: 400, error: { detail: 'Request body is too large' } }, sizeError: true },
      { label: 'an nginx 413', response: { status: 413, error: '<html>Request Entity Too Large</html>' }, sizeError: true },
      { label: 'an unrelated 400', response: { status: 400, error: { error: 'Internal server detail.' } }, sizeError: false },
      { label: 'an unrelated 500', response: { status: 500, error: { error: 'Internal server detail.' } }, sizeError: false }
    ]) {
      it(`shows a clean message for ${label} in ${field}`, () => {
        finishReading();
        decode.and.returnValue(of('data:image/png;base64,dGVzdA=='));
        upload.and.returnValue(throwError(() => response));
        select(field, [file(field, 4)]);
        const expected = sizeError ? 'CREATE_PROD_SPEC._file_size_error'
          : field === 'image' ? 'CREATE_PROD_SPEC._image_upload_error' : 'CREATE_PROD_SPEC._file_upload_error';
        expect(errors(field)).toEqual([expected]);
        expect(entries(field)).toEqual([]);
        expect(component.uploadingImage).toBeFalse();
        expect(component.uploadingAttachment).toBeFalse();
        expect(component.uploadingCompliance).toBeFalse();
        const message = renderField(field).textContent;
        expect(message).toContain(expected);
        expect(message).not.toContain('DATA_UPLOAD_MAX_MEMORY_SIZE');
        expect(message).not.toContain('Internal server detail');
        expect(message).not.toContain('<html>');
      });
    }
  }

  for (const field of ['attachments', 'compliance attachments'] as const) {
    it(`rejects oversized files individually in ${field} and applies the cap per file, not per batch`, () => {
      finishReading();
      upload.and.returnValue(of({ content: 'https://files.test/document.pdf' }));
      select(field, [
        file(field, 2 * 1024 * 1024, 'first.pdf'),
        file(field, limit + 1, 'oversized.pdf'),
        file(field, 2 * 1024 * 1024, 'second.pdf')
      ]);
      expect(upload).toHaveBeenCalledTimes(2);
      expect(read).toHaveBeenCalledTimes(2);
      expect(entries(field).map(entry => entry.name)).toEqual(['first.pdf', 'second.pdf']);
      expect(errors(field)).toEqual(['CREATE_PROD_SPEC._file_size_error']);
      const message = renderField(field).textContent;
      expect(message).toContain('oversized.pdf');
      expect(message).toContain('CREATE_PROD_SPEC._file_size_error');
    });
  }

  it('clears the previous image and cancels its processing when an oversized replacement is selected', () => {
    const cancelled = jasmine.createSpy('cancelled');
    decode.and.returnValue(NEVER.pipe(finalize(cancelled)));
    select('image', [file('image', 4)]);
    select('image', [file('image', limit + 1)]);
    expect(cancelled).toHaveBeenCalled();
    expect(component.productImageRef).toBeNull();
    expect(component.uploadingImage).toBeFalse();
    expect(component.isGeneralInfoStepValid()).toBeFalse();
    expect(renderField('image').textContent).toContain('CREATE_PROD_SPEC._file_size_error');
    expect(fixture.nativeElement.querySelector('[data-cy="prodSpecNext"]').disabled).toBeTrue();
    expect(upload).not.toHaveBeenCalled();
  });

  it('preserves a valid self attestation when an oversized replacement is rejected', () => {
    const previous = { name: 'existing.pdf', url: 'https://files.test/existing.pdf' };
    component.selfAttestationFile = previous;
    select('self attestation', [file('self attestation', limit + 1)]);
    expect(component.selfAttestationFile).toBe(previous);
    expect(component.selfAttestationError).toBe('CREATE_PROD_SPEC._file_size_error');
    expect(read).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('keeps the size error visible until another selection, rather than hiding it after a toast timeout', fakeAsync(() => {
    select('attachments', [file('attachments', limit + 1)]);
    tick(4000);
    expect(renderField('attachments').textContent).toContain('CREATE_PROD_SPEC._file_size_error');
    select('attachments', [file('attachments', 4)]);
    expect(component.attachmentFileErrors).toEqual([]);
  }));
});
