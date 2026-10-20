import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CreateProductSpecComponent } from './create-product-spec.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';

describe('CreateProductSpecComponent', () => {
  let component: CreateProductSpecComponent;
  let fixture: ComponentFixture<CreateProductSpecComponent>;
  let prodSpecService: ProductSpecServiceService;
  let attachmentService: AttachmentServiceService;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateProductSpecComponent],
      imports: [TranslateModule.forRoot(), FormsModule, ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductSpecComponent);
    component = fixture.componentInstance;
    prodSpecService = TestBed.inject(ProductSpecServiceService);
    attachmentService = TestBed.inject(AttachmentServiceService);
    eventMessage = TestBed.inject(EventMessageService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getValuePreview should render object values as JSON text', () => {
    expect(component.getValuePreview({ issuer: 'did:example:issuer' })).toBe('{"issuer":"did:example:issuer"}');
  });

  for (const editMode of [false, true]) {
    for (const { type, values } of [
      { type: 'number', values: [{ value: 0, unitOfMeasure: 'GB', isDefault: false }, { value: 10, unitOfMeasure: 'GB', isDefault: true }] },
      { type: 'range', values: [{ valueFrom: 0, valueTo: 10, unitOfMeasure: 'GB', isDefault: true }] },
      { type: 'boolean', values: [{ value: true, isDefault: false }, { value: false, isDefault: true }] }
    ]) {
      it(`should show the saved ${type} in the type dropdown in ${editMode ? 'edit' : 'create'} mode`, async () => {
        component.onTypeChange({ target: { value: type } });
        component.charsForm.patchValue({ name: 'Config option' });
        component.creatingChars = values as any;
        component.saveChar();

        if (editMode) {
          component.generalForm.patchValue({ name: 'Product' });
          component.buildProductToCreate();
          component.prod = { ...component.productSpecToCreate, id: 'prod-1' };
          component.ngOnInit();
        }

        component.editChar(0);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const select: HTMLSelectElement = fixture.nativeElement.querySelector('[data-cy="prodSpecCharType"]');
        expect(component.charTypeSelected).toBe(type);
        expect(select.value).toBe(type);
        expect(component.creatingChars).toEqual(values as any);
        if (type === 'boolean') {
          expect(component.booleanDefaultTrue).toBeFalse();
        }

        component.saveChar();
        expect(component.prodChars[0].productSpecCharacteristicValue).toEqual(values as any);
      });
    }
  }

  it('should build update patches without create-only scalar defaults', () => {
    component.prod = {
      id: 'prod-1',
      name: 'Original',
      description: 'Original description',
      version: '2.5',
      brand: 'Existing brand',
      productNumber: 'PN-9',
      lifecycleStatus: 'Active',
      relatedParty: [{ id: 'party-1' }]
    };
    component.ngOnInit();
    component.generalForm.patchValue({ name: 'Updated name', description: 'Updated description' });

    const patch = (component as any).buildProductUpdatePatch(false);

    expect(patch.name).toBe('Updated name');
    expect(patch.description).toBe('Updated description');
    expect(patch.version).toBeUndefined();
    expect(patch.brand).toBeUndefined();
    expect(patch.productNumber).toBeUndefined();
    expect(patch.lifecycleStatus).toBeUndefined();
    expect((patch as any).relatedParty).toBeUndefined();
    expect((patch as any).isBundle).toBeUndefined();
  });

  it('should preserve characteristic ids and unknown metadata when edited', () => {
    component.prod = {
      id: 'prod-1',
      name: 'Product',
      description: '',
      productSpecCharacteristic: [{
        id: 'char-1',
        name: 'Speed',
        description: 'Old description',
        configurable: true,
        '@type': 'CustomCharacteristic',
        productSpecCharacteristicValue: [{
          id: 'value-1',
          value: '10',
          isDefault: true,
          unitOfMeasure: 'Gbps',
          '@type': 'CustomValue'
        }]
      }]
    };
    component.ngOnInit();

    component.editChar(0);
    component.charsForm.patchValue({ name: 'Speed', description: 'New description' });
    component.saveChar();

    const patch = (component as any).buildProductUpdatePatch(false);
    const char = patch.productSpecCharacteristic.find((item: any) => item.id === 'char-1');

    expect(char.id).toBe('char-1');
    expect(char.description).toBe('New description');
    expect(char.configurable).toBeTrue();
    expect(char['@type']).toBe('CustomCharacteristic');
    expect(char.productSpecCharacteristicValue[0].id).toBe('value-1');
    expect(char.productSpecCharacteristicValue[0]['@type']).toBe('CustomValue');
  });

  it('should preserve existing attachment metadata in update patches', () => {
    component.prod = {
      id: 'prod-1',
      name: 'Product',
      description: '',
      attachment: [
        {
          id: 'att-image',
          name: 'Profile Picture',
          url: 'https://example.test/image.png',
          attachmentType: 'image/png',
          description: 'Image metadata',
          '@type': 'AttachmentRefOrValue'
        },
        {
          id: 'att-doc',
          name: 'Manual',
          url: 'https://example.test/manual.pdf',
          attachmentType: 'application/pdf',
          description: 'Manual metadata',
          '@type': 'AttachmentRefOrValue'
        },
        {
          id: 'att-backend-only',
          name: 'Backend only',
          description: 'Not represented by upload UI',
          '@type': 'AttachmentRefOrValue'
        }
      ]
    };
    component.ngOnInit();

    const patch = (component as any).buildProductUpdatePatch(false);
    const image = patch.attachment.find((item: any) => item.id === 'att-image');
    const manual = patch.attachment.find((item: any) => item.id === 'att-doc');
    const backendOnly = patch.attachment.find((item: any) => item.id === 'att-backend-only');

    expect(image.description).toBe('Image metadata');
    expect(image['@type']).toBe('AttachmentRefOrValue');
    expect(manual.description).toBe('Manual metadata');
    expect(manual['@type']).toBe('AttachmentRefOrValue');
    expect(backendOnly.description).toBe('Not represented by upload UI');
  });

  it('should require a product image to complete the general info step', () => {
    component.generalForm.patchValue({ name: 'Product' });

    expect(component.isGeneralInfoStepValid()).toBeFalse();
    expect(component.validateCurrentStep()).toBeFalse();

    component.productImageRef = {
      name: 'Profile Picture',
      url: 'https://example.test/image.png',
      attachmentType: 'image/png'
    };

    expect(component.isGeneralInfoStepValid()).toBeTrue();
    expect(component.validateCurrentStep()).toBeTrue();
  });

  it('should require product description and how it works to complete the details step', () => {
    component.generalForm.patchValue({ name: 'Product' });
    component.productImageRef = {
      name: 'Profile Picture',
      url: 'https://example.test/image.png',
      attachmentType: 'image/png'
    };
    component.currentStep = 1;

    expect(component.isProductDetailsStepValid()).toBeFalse();
    expect(component.validateCurrentStep()).toBeFalse();

    component.generalForm.patchValue({ description: 'Product overview' });
    expect(component.isProductDetailsStepValid()).toBeFalse();

    component.howItWorks = 'How it works';
    expect(component.isProductDetailsStepValid()).toBeTrue();
    expect(component.validateCurrentStep()).toBeTrue();
  });

  it('should reject files whose MIME type is not an allowed image format', () => {
    const uploadSpy = spyOn(attachmentService, 'uploadFile');
    const pdfFile = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    const input = { files: [pdfFile], value: 'document.pdf' } as unknown as HTMLInputElement;

    component.onProductImageSelected({ target: input } as unknown as Event);

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(component.productImage).toBeNull();
    expect(component.productImageRef).toBeNull();
    expect(component.productImageTouched).toBeTrue();
    expect(component.errorMessage).toBe('File must have a valid image format!');
    expect(component.showError).toBeTrue();
    expect(input.value).toBe('');
  });

  it('should keep an empty visited dataspace step navigable', () => {
    component.DATA_SPACE_ENABLED = true;
    component.steps = (component as any).getFormSteps();
    const dataspaceIndex = component.steps.indexOf((component as any).stepLabels.dataspace);
    component.productImageRef = {
      name: 'Profile Picture',
      url: 'https://example.test/image.png',
      attachmentType: 'image/png'
    };
    component.generalForm.patchValue({ name: 'Product' });
    component.prodChars = [];
    component.dataspaceChars = [];
    component.currentStep = dataspaceIndex + 1;
    component.highestStep = dataspaceIndex + 1;

    expect(component.completedStep(dataspaceIndex)).toBeTrue();
    expect(component.canNavigate(dataspaceIndex)).toBeTrue();
  });

  it('should treat configuration options as optional', () => {
    component.productImageRef = {
      name: 'Profile Picture',
      url: 'https://example.test/image.png',
      attachmentType: 'image/png'
    };
    component.generalForm.patchValue({
      name: 'Product',
      description: 'Product overview'
    });
    component.howItWorks = 'How it works';
    component.prodChars = [];

    const configIndex = component.steps.indexOf((component as any).stepLabels.config);
    const serviceIndex = component.steps.indexOf((component as any).stepLabels.service);

    expect(component.isOptionalStep(configIndex)).toBeTrue();
    expect(component.canNavigate(serviceIndex)).toBeTrue();
  });

  it('should not open the ready modal when creating without a product image', () => {
    component.generalForm.patchValue({ name: 'Product' });

    component.createProduct();

    expect(component.showSuccessModal).toBeFalse();
    expect(component.productImageTouched).toBeTrue();
    expect(component.currentStep).toBe(0);
  });

  it('should preserve unchanged service and resource reference metadata in update patches', () => {
    component.prod = {
      id: 'prod-1',
      name: 'Product',
      description: '',
      serviceSpecification: [{
        id: 'service-1',
        href: 'service-href',
        name: 'Service',
        '@type': 'ServiceSpecificationRef'
      }, {
        href: 'service-without-id',
        name: 'Backend-only service ref',
        '@type': 'ServiceSpecificationRef'
      }],
      resourceSpecification: [{
        id: 'resource-1',
        href: 'resource-href',
        name: 'Resource',
        '@type': 'ResourceSpecificationRef'
      }, {
        href: 'resource-without-id',
        name: 'Backend-only resource ref',
        '@type': 'ResourceSpecificationRef'
      }]
    };
    component.ngOnInit();

    const patch = (component as any).buildProductUpdatePatch(false);

    expect(patch.serviceSpecification[0]['@type']).toBe('ServiceSpecificationRef');
    expect(patch.serviceSpecification[0].href).toBe('service-href');
    expect(patch.serviceSpecification[1].href).toBe('service-without-id');
    expect(patch.resourceSpecification[0]['@type']).toBe('ResourceSpecificationRef');
    expect(patch.resourceSpecification[0].href).toBe('resource-href');
    expect(patch.resourceSpecification[1].href).toBe('resource-without-id');
  });

  it('should call update with the update patch and no create defaults', () => {
    const updateSpy = spyOn(prodSpecService, 'updateProdSpec').and.returnValue(of({}));
    component.prod = {
      id: 'prod-1',
      name: 'Product',
      description: '',
      version: '2.5',
      brand: 'Existing brand',
      productNumber: 'PN-9'
    };
    component.ngOnInit();
    component.generalForm.patchValue({ name: 'Updated product' });

    component.validateProduct();

    const body = updateSpy.calls.mostRecent().args[0] as any;
    expect(updateSpy).toHaveBeenCalledWith(jasmine.any(Object), 'prod-1');
    expect(body.name).toBe('Updated product');
    expect(body.lifecycleStatus).toBe('Launched');
    expect(body.version).toBeUndefined();
    expect(body.brand).toBeUndefined();
    expect(body.productNumber).toBeUndefined();
  });

  it('should leave directly when leaving product spec creation without draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerProductSpec');

    component.onBackClick();

    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should show the leave modal when leaving product spec creation with draft data', () => {
    const backSpy = spyOn(eventMessage, 'emitSellerProductSpec');
    component.generalForm.patchValue({ name: 'Draft product' });

    component.onBackClick();

    expect(component.showLeaveModal).toBeTrue();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should keep the leave modal open when saving draft without mandatory data', () => {
    const saveSpy = spyOn(prodSpecService, 'postProdSpec');
    component.showLeaveModal = true;
    component.generalForm.patchValue({ name: 'Draft product' });

    component.confirmLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
    expect(component.productImageTouched).toBeTrue();
  });

  it('should keep the leave modal open when product details mandatory data is missing', () => {
    const saveSpy = spyOn(prodSpecService, 'postProdSpec');
    component.showLeaveModal = true;
    component.generalForm.patchValue({ name: 'Draft product' });
    component.productImageRef = {
      name: 'Profile Picture',
      url: 'https://example.test/image.png',
      attachmentType: 'image/png'
    };

    component.confirmLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeTrue();
  });

  it('should discard product spec draft changes without saving them', () => {
    const saveSpy = spyOn(prodSpecService, 'postProdSpec');
    const backSpy = spyOn(eventMessage, 'emitSellerProductSpec');
    component.showLeaveModal = true;

    component.discardLeave();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.showLeaveModal).toBeFalse();
    expect(backSpy).toHaveBeenCalledWith(true);
  });

  it('should save a valid product spec draft when confirming leave', () => {
    const saveSpy = spyOn(prodSpecService, 'postProdSpec').and.returnValue(of({ id: 'prod-1' }) as any);
    component.showLeaveModal = true;
    component.generalForm.patchValue({ name: 'Draft product', description: 'Product overview' });
    component.howItWorks = 'How it works';
    component.productImageRef = {
      name: 'Profile Picture',
      url: 'https://example.test/image.png',
      attachmentType: 'image/png'
    };

    component.confirmLeave();

    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Draft product',
      lifecycleStatus: 'Active'
    }) as any);
    expect(component.showLeaveModal).toBeFalse();
  });

  it('should open product spec leave modal when the header leave event is emitted', () => {
    component.generalForm.patchValue({ name: 'Draft product' });

    eventMessage.emitLeaveProductSpecEditorRequest();

    expect(component.showLeaveModal).toBeTrue();
  });
});
