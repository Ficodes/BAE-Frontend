import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, Observable, of, Subject, throwError } from 'rxjs';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { CreateProductSpecComponent } from './create-product-spec.component';

describe('Product image content validation', () => {
  let fixture: ComponentFixture<CreateProductSpecComponent>;
  let component: CreateProductSpecComponent;
  let attachmentService: AttachmentServiceService;

  function select(file: File) {
    const input = { files: [file], value: file.name } as unknown as HTMLInputElement;
    component.onProductImageSelected({ target: input } as unknown as Event);
    return input;
  }

  // Observe completion without replacing FileReader or the browser image decoder.
  function trackRead(): Promise<void> {
    const read = (component as any).readProductImage.bind(component) as (file: File) => Observable<string>;
    let finished!: () => void;
    const done = new Promise<void>(resolve => finished = resolve);
    spyOn(component as any, 'readProductImage').and.callFake((file: File) => read(file).pipe(finalize(finished)));
    return done;
  }

  function raster(type: 'image/png' | 'image/jpeg'): File {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 2;
    const dataUrl = canvas.toDataURL(type);
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), char => char.charCodeAt(0));
    return new File([bytes], type === 'image/png' ? 'real.png' : 'real.jpg', { type });
  }

  function expectRejected() {
    expect(component.productImage).toBeNull();
    expect(component.productImageRef).toBeNull();
    expect(component.productImageUrl).toBeNull();
    expect(component.uploadingImage).toBeFalse();
    expect(component.isProductImageValid()).toBeFalse();
    expect(component.productImageError).toBe('CREATE_PROD_SPEC._image_invalid');
    component.goToStep(1);
    expect(component.currentStep).toBe(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="productImageError"]').textContent).toContain('CREATE_PROD_SPEC._image_invalid');
    expect(fixture.nativeElement.querySelector('[data-cy="prodSpecNext"]').disabled).toBeTrue();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateProductSpecComponent],
      imports: [TranslateModule.forRoot(), FormsModule, ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(CreateProductSpecComponent);
    component = fixture.componentInstance;
    attachmentService = TestBed.inject(AttachmentServiceService);
    fixture.detectChanges();
    component.generalForm.patchValue({ name: 'Test product' });
  });

  for (const [extension, type] of [
    ['png', 'image/png'], ['jpg', 'image/jpeg'], ['gif', 'image/gif'], ['svg', 'image/svg+xml']
  ]) {
    it(`rejects plain text labelled as ${extension} before uploading`, async () => {
      const upload = spyOn(attachmentService, 'uploadFile');
      const done = trackRead();
      const input = select(new File(['This is plain text, not an image.'], `fake.${extension}`, { type }));
      expect(input.value).toBe('');
      expect(component.uploadingImage).toBeTrue();
      expect(component.isGeneralInfoStepValid()).toBeFalse();
      expect(upload).not.toHaveBeenCalled();
      await done;
      expect(upload).not.toHaveBeenCalled();
      expectRejected();
    });
  }

  for (const [label, makeFile] of [
    ['PNG', () => raster('image/png')],
    ['JPEG', () => raster('image/jpeg')],
    ['GIF', () => new File([Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), char => char.charCodeAt(0))], 'real.gif', { type: 'image/gif' })],
    ['SVG', () => new File(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'], 'real.svg', { type: 'image/svg+xml' })]
  ] as const) {
    it(`decodes a genuine ${label} and only then uploads its original bytes`, async () => {
      const upload = spyOn(attachmentService, 'uploadFile').and.returnValue(of({ content: '/assets/image' }));
      const done = trackRead();
      const file = makeFile();
      select(file);
      expect(upload).not.toHaveBeenCalled();
      await done;

      expect(upload).toHaveBeenCalledTimes(1);
      const payload = upload.calls.mostRecent().args[0];
      expect(payload.contentType).toBe(file.type);
      const uploadedBytes = Uint8Array.from(atob(payload.content.data), char => char.charCodeAt(0));
      expect(Array.from(uploadedBytes)).toEqual(Array.from(new Uint8Array(await file.arrayBuffer())));
      expect(component.productImageRef.attachmentType).toBe(file.type);
      expect(component.productImageUrl).toMatch(/^data:image\//);
      expect(component.productImageError).toBeNull();
      expect(component.uploadingImage).toBeFalse();
      expect(component.isGeneralInfoStepValid()).toBeTrue();
    });
  }

  for (const [label, makeFile] of [
    ['empty image', () => new File([], 'empty.png', { type: 'image/png' })],
    ['truncated PNG header', () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'corrupt.png', { type: 'image/png' })],
    ['invalid SVG document', () => new File(['<html>Not an SVG</html>'], 'fake.svg', { type: 'image/svg+xml' })],
    ['zero-width SVG', () => new File(['<svg xmlns="http://www.w3.org/2000/svg" width="0" height="2"/>'], 'empty.svg', { type: 'image/svg+xml' })]
  ] as const) {
    it(`rejects an ${label}`, async () => {
      const upload = spyOn(attachmentService, 'uploadFile');
      const done = trackRead();
      select(makeFile());
      await done;
      expect(upload).not.toHaveBeenCalled();
      expectRejected();
    });
  }

  it('keeps navigation blocked until the upload finishes, after decoding succeeds', async () => {
    const response = new Subject<any>();
    spyOn(attachmentService, 'uploadFile').and.returnValue(response);
    const done = trackRead();
    select(raster('image/png'));
    await done;
    expect(component.uploadingImage).toBeTrue();
    expect(component.productImageRef).toBeNull();
    component.goToStep(1);
    expect(component.currentStep).toBe(0);

    response.next({ content: '/assets/real-image' });
    response.complete();
    expect(component.isGeneralInfoStepValid()).toBeTrue();
    component.goToStep(1);
    expect(component.currentStep).toBe(1);
  });

  it('clears the previous valid reference when an invalid replacement is selected', async () => {
    component.productImageRef = { url: '/assets/old-image' };
    component.productImage = { name: 'old.png' };
    expect(component.isProductImageValid()).toBeTrue();
    const upload = spyOn(attachmentService, 'uploadFile');
    const done = trackRead();
    select(new File(['text'], 'fake.png', { type: 'image/png' }));
    expect(component.productImageRef).toBeNull();
    expect(component.isGeneralInfoStepValid()).toBeFalse();
    await done;
    expect(upload).not.toHaveBeenCalled();
    expectRejected();
  });

  for (const kind of ['error', 'abort']) {
    it(`rejects a file read ${kind} without leaving navigation pending`, () => {
      spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function(this: FileReader) {
        this.dispatchEvent(new ProgressEvent(kind));
      });
      const upload = spyOn(attachmentService, 'uploadFile');
      select(raster('image/png'));
      expect(upload).not.toHaveBeenCalled();
      expectRejected();
    });
  }

  it('ignores old decoding results after another image is selected', () => {
    const previous = new Subject<string>();
    const current = new Subject<string>();
    spyOn(component as any, 'readProductImage').and.returnValues(previous, current);
    const upload = spyOn(attachmentService, 'uploadFile').and.returnValue(of({ content: '/assets/current' }));
    select(new File(['first'], 'first.png', { type: 'image/png' }));
    select(new File(['second'], 'second.png', { type: 'image/png' }));
    previous.next('data:image/png;base64,b2xk');
    expect(upload).not.toHaveBeenCalled();
    current.next('data:image/png;base64,bmV3');
    current.complete();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.calls.mostRecent().args[0].content.name).toContain('_second.png');
    expect(component.productImage?.name).toBe('second.png');
  });

  it('cancels a pending upload when the image is removed', async () => {
    const response = new Subject<any>();
    const cancelled = jasmine.createSpy('cancelled');
    spyOn(attachmentService, 'uploadFile').and.returnValue(response.pipe(finalize(cancelled)));
    const done = trackRead();
    select(raster('image/png'));
    await done;
    component.removeProductImage();
    expect(cancelled).toHaveBeenCalled();
    response.next({ content: '/assets/stale' });
    expect(component.productImageRef).toBeNull();
    expect(component.productImageUrl).toBeNull();
    expect(component.uploadingImage).toBeFalse();
  });

  it('cancels decoding when the image is removed or the component is destroyed', () => {
    const decoding = new Subject<string>();
    const cancelled = jasmine.createSpy('cancelled');
    spyOn(component as any, 'readProductImage').and.returnValue(decoding.pipe(finalize(cancelled)));
    const upload = spyOn(attachmentService, 'uploadFile');
    select(raster('image/png'));
    component.removeProductImage();
    expect(cancelled).toHaveBeenCalledTimes(1);
    select(raster('image/png'));
    fixture.destroy();
    expect(cancelled).toHaveBeenCalledTimes(2);
    decoding.next('data:image/png;base64,c3RhbGU=');
    expect(upload).not.toHaveBeenCalled();
  });

  for (const status of [413, 500]) {
    it(`keeps the field invalid after an upload returns ${status}`, async () => {
      spyOn(attachmentService, 'uploadFile').and.returnValue(throwError(() => ({ status })));
      const done = trackRead();
      select(raster('image/png'));
      await done;
      expect(component.productImageRef).toBeNull();
      expect(component.uploadingImage).toBeFalse();
      expect(component.isGeneralInfoStepValid()).toBeFalse();
      expect(component.productImageError).toBe(status === 413 ? 'CREATE_PROD_SPEC._file_size_error' : 'CREATE_PROD_SPEC._image_upload_error');
    });
  }

  it('still uploads document attachments without image validation', async () => {
    const decode = spyOn(component as any, 'readProductImage');
    let uploaded!: () => void;
    const done = new Promise<void>(resolve => uploaded = resolve);
    const upload = spyOn(attachmentService, 'uploadFile').and.callFake(() => {
      uploaded();
      return of({ content: '/assets/document.pdf' });
    });
    const input = { files: [new File(['Document contents'], 'document.pdf', { type: 'application/pdf' })], value: 'selected' };
    component.onAttachmentSelected({ target: input } as unknown as Event);
    await done;
    expect(decode).not.toHaveBeenCalled();
    expect(upload.calls.mostRecent().args[0].contentType).toBe('application/pdf');
    expect(component.attachments.length).toBe(1);
  });
});
