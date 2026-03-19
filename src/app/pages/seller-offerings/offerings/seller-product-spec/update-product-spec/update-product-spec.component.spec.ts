import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { UpdateProductSpecComponent } from './update-product-spec.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { QrVerifierService } from 'src/app/services/qr-verifier.service';

class SyncFileReaderMock {
  onload: ((event: any) => void) | null = null;

  readAsDataURL(_file: File): void {
    if (this.onload) {
      this.onload({ target: { result: 'data:text/plain;base64,Zm9v' } });
    }
  }
}

describe('UpdateProductSpecComponent', () => {
  let component: UpdateProductSpecComponent;
  let fixture: ComponentFixture<UpdateProductSpecComponent>;

  let messagesSubject: Subject<any>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let prodSpecServiceSpy: jasmine.SpyObj<ProductSpecServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let attachmentServiceSpy: jasmine.SpyObj<AttachmentServiceService>;
  let servSpecServiceSpy: jasmine.SpyObj<ServiceSpecServiceService>;
  let resSpecServiceSpy: jasmine.SpyObj<ResourceSpecServiceService>;
  let qrVerifierSpy: jasmine.SpyObj<QrVerifierService>;
  let paginationServiceSpy: jasmine.SpyObj<PaginationService>;
  let originalFileReader: any;

  const defaultPaginationData = {
    page_check: true,
    items: [{ id: 'item-1' }],
    nextItems: [{ id: 'item-2' }],
    page: 10
  };

  const mockDroppedFile = (file: any): any => {
    return {
      relativePath: file.name,
      fileEntry: {
        isFile: true,
        file: (cb: (f: any) => void) => cb(file)
      }
    };
  };

  beforeEach(async () => {
    messagesSubject = new Subject<any>();
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getProducts']);
    prodSpecServiceSpy = jasmine.createSpyObj<ProductSpecServiceService>('ProductSpecServiceService', ['getProdSpecByUser', 'getResSpecById', 'updateProdSpec']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', ['emitSellerProductSpec'], { messages$: messagesSubject.asObservable() });
    attachmentServiceSpy = jasmine.createSpyObj<AttachmentServiceService>('AttachmentServiceService', ['uploadFile']);
    servSpecServiceSpy = jasmine.createSpyObj<ServiceSpecServiceService>('ServiceSpecServiceService', ['getServiceSpecByUser']);
    resSpecServiceSpy = jasmine.createSpyObj<ResourceSpecServiceService>('ResourceSpecServiceService', ['getResourceSpecByUser']);
    qrVerifierSpy = jasmine.createSpyObj<QrVerifierService>('QrVerifierService', ['launchPopup', 'pollCertCredential']);
    paginationServiceSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated']);

    localStorageSpy.getObject.and.returnValue({});
    attachmentServiceSpy.uploadFile.and.returnValue(of({ content: 'https://uploaded.file' }));
    prodSpecServiceSpy.getResSpecById.and.resolveTo({ id: 'rel-prod', name: 'Rel Prod' } as any);
    prodSpecServiceSpy.updateProdSpec.and.returnValue(of({ id: 'created' }));
    qrVerifierSpy.launchPopup.and.returnValue({} as Window);
    qrVerifierSpy.pollCertCredential.and.resolveTo({ subject: { compliance: [] }, vc: 'vc-token' });
    paginationServiceSpy.getItemsPaginated.and.resolveTo(defaultPaginationData);

    await TestBed.configureTestingModule({
      declarations: [UpdateProductSpecComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: ProductSpecServiceService, useValue: prodSpecServiceSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: AttachmentServiceService, useValue: attachmentServiceSpy },
        { provide: ServiceSpecServiceService, useValue: servSpecServiceSpy },
        { provide: ResourceSpecServiceService, useValue: resSpecServiceSpy },
        { provide: QrVerifierService, useValue: qrVerifierSpy },
        { provide: PaginationService, useValue: paginationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProductSpecComponent);
    component = fixture.componentInstance;
    component.attachName = { nativeElement: { value: '' } } as any;
    component.imgURL = { nativeElement: { value: '' } } as any;
    component.certificationName = { nativeElement: { value: '' } } as any;
    component.prod = {
      id: 'prod-1',
      name: 'Product',
      description: 'Description',
      lifecycleStatus: 'Active',
      isBundle: false,
      brand: 'Brand',
      version: '1.0',
      productNumber: 'PN-1',
      productSpecCharacteristic: [],
      resourceSpecification: [],
      serviceSpecification: [],
      attachment: [],
      bundledProductSpecification: [],
      productSpecificationRelationship: []
    } as any;
  });

  beforeEach(() => {
    originalFileReader = (window as any).FileReader;
    (window as any).FileReader = SyncFileReaderMock as any;
  });

  afterEach(() => {
    (window as any).FileReader = originalFileReader;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load available ISOs in constructor and react to ChangedSession event', () => {
    expect(component.availableISOS.length).toBeGreaterThan(0);
    const initSpy = spyOn(component, 'initPartyInfo');
    messagesSubject.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalled();
  });

  it('should stop event subscription on destroy', () => {
    const initSpy = spyOn(component, 'initPartyInfo');
    messagesSubject.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    messagesSubject.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('onClick should hide emoji/upload panels and trigger detectChanges', () => {
    component.showEmoji = true;
    component.showUploadFile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.onClick();
    expect(component.showEmoji).toBeFalse();
    expect(component.showUploadFile).toBeFalse();
    expect(detectSpy).toHaveBeenCalledTimes(2);
  });

  it('ngOnInit should configure steps with bundle enabled', () => {
    component.BUNDLE_ENABLED = true;
    const initSpy = spyOn(component, 'initPartyInfo');
    component.ngOnInit();
    expect(component.steps.length).toBe(9);
    expect(component.steps).toContain('Bundle');
    expect(initSpy).toHaveBeenCalled();
  });

  it('ngOnInit should configure steps without bundle', () => {
    component.BUNDLE_ENABLED = false;
    component.ngOnInit();
    expect(component.steps.length).toBe(8);
    expect(component.steps).not.toContain('Bundle');
  });

  it('initPartyInfo should set partyId when logged directly', () => {
    localStorageSpy.getObject.and.returnValue({
      expire: Math.floor(Date.now() / 1000) + 500,
      logged_as: 'user-1',
      id: 'user-1',
      partyId: 'party-direct',
      organizations: []
    });
    component.initPartyInfo();
    expect(component.partyId).toBe('party-direct');
  });

  it('initPartyInfo should set org partyId when logged as organization', () => {
    localStorageSpy.getObject.and.returnValue({
      expire: Math.floor(Date.now() / 1000) + 500,
      logged_as: 'org-1',
      id: 'user-1',
      partyId: 'party-direct',
      organizations: [{ id: 'org-1', partyId: 'party-org' }]
    });
    component.initPartyInfo();
    expect(component.partyId).toBe('party-org');
  });

  it('initPartyInfo should ignore expired/empty sessions', () => {
    component.partyId = 'kept-party';
    localStorageSpy.getObject.and.returnValue({});
    component.initPartyInfo();
    expect(component.partyId).toBe('kept-party');
  });

  it('goBack should emit seller product spec event', () => {
    component.goBack();
    expect(eventMessageSpy.emitSellerProductSpec).toHaveBeenCalledWith(false);
  });

  it('togglePreview should copy description or clear it', () => {
    component.generalForm.patchValue({ description: 'Some markdown' });
    component.togglePreview();
    expect(component.description).toBe('Some markdown');
    component.generalForm.patchValue({ description: '' });
    component.togglePreview();
    expect(component.description).toBe('');
  });

  it('toggleGeneral should activate only general section', () => {
    const selectSpy = spyOn(component, 'selectStep');
    const refreshSpy = spyOn(component, 'refreshChars');
    component.toggleGeneral();
    expect(selectSpy).toHaveBeenCalledWith('general-info', 'general-circle');
    expect(component.showGeneral).toBeTrue();
    expect(component.showBundle).toBeFalse();
    expect(component.showSummary).toBeFalse();
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('toggleBundle should activate only bundle section', () => {
    const selectSpy = spyOn(component, 'selectStep');
    component.toggleBundle();
    expect(selectSpy).toHaveBeenCalledWith('bundle', 'bundle-circle');
    expect(component.showBundle).toBeTrue();
    expect(component.showGeneral).toBeFalse();
  });

  it('toggleBundleCheck should load products when bundle is enabled', () => {
    const getSpy = spyOn(component, 'getProdSpecs');
    component.bundleChecked = false;
    component.toggleBundleCheck();
    expect(component.bundleChecked).toBeTrue();
    expect(component.loadingBundle).toBeTrue();
    expect(getSpy).toHaveBeenCalledWith(false);
  });

  it('toggleBundleCheck should clear selected bundled products when disabled', () => {
    component.bundleChecked = true;
    component.prodSpecsBundle = [{ id: '1' } as any];
    component.toggleBundleCheck();
    expect(component.bundleChecked).toBeFalse();
    expect(component.prodSpecsBundle).toEqual([]);
  });

  it('getProdSpecs should update bundle pagination state', async () => {
    await component.getProdSpecs(false);
    expect(paginationServiceSpy.getItemsPaginated).toHaveBeenCalled();
    expect(component.bundlePageCheck).toBeTrue();
    expect(component.prodSpecs.length).toBe(1);
    expect(component.nextProdSpecs.length).toBe(1);
    expect(component.bundlePage).toBe(10);
    expect(component.loadingBundle).toBeFalse();
  });

  it('nextBundle should request next products page', async () => {
    const spy = spyOn(component, 'getProdSpecs').and.resolveTo();
    await component.nextBundle();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('addProdToBundle and isProdInBundle should toggle bundle products', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    const prod = { id: 'p1', href: 'h', lifecycleStatus: 'Active', name: 'Prod' };
    component.addProdToBundle(prod);
    expect(component.isProdInBundle(prod)).toBeTrue();
    component.addProdToBundle(prod);
    expect(component.isProdInBundle(prod)).toBeFalse();
    expect(detectSpy).toHaveBeenCalledTimes(2);
  });

  it('toggleCompliance should activate only compliance section', () => {
    const selectSpy = spyOn(component, 'selectStep');
    component.toggleCompliance();
    expect(selectSpy).toHaveBeenCalledWith('compliance', 'compliance-circle');
    expect(component.showCompliance).toBeTrue();
    expect(component.showGeneral).toBeFalse();
  });

  it('addISO should move item from available to selected and close dropdown', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.buttonISOClicked = false;
    component.availableISOS = [{ name: 'ISO123', mandatory: true, domesupported: false }];
    component.selectedISOS = [];
    component.addISO({ name: 'ISO123', mandatory: true, domesupported: false });
    expect(component.availableISOS.length).toBe(0);
    expect(component.selectedISOS[0].name).toBe('Compliance:ISO123');
    expect(component.buttonISOClicked).toBeTrue();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeISO should move item back to available list', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.selectedISOS = [{ name: 'Compliance:ISO123', mandatory: false, domesupported: true }];
    component.availableISOS = [];
    component.removeISO(component.selectedISOS[0]);
    expect(component.selectedISOS.length).toBe(0);
    expect(component.availableISOS[0].name).toBe('ISO123');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeCert should delete additional certification', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.additionalISOS = [{ name: 'Compliance:extra', url: 'u' }];
    component.removeCert({ name: 'Compliance:extra' });
    expect(component.additionalISOS.length).toBe(0);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeSelfAtt should remove self attestation from finishChars', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.selfAtt = { name: 'Compliance:SelfAtt' };
    component.finishChars = [{ name: 'Compliance:SelfAtt' } as any, { name: 'Other' } as any];
    component.removeSelfAtt();
    expect(component.selfAtt).toBe('');
    expect(component.finishChars.length).toBe(1);
    expect(component.finishChars[0].name).toBe('Other');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('checkValidISOS should detect missing URLs', () => {
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    expect(component.checkValidISOS()).toBeTrue();
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: 'https://doc' }];
    expect(component.checkValidISOS()).toBeFalse();
  });

  it('dropped should reject invalid filename', () => {
    const badFile = { name: 'bad name.txt', type: 'text/plain', size: 1000 };
    component.currentStep = 1;
    component.BUNDLE_ENABLED = false;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    component.dropped([mockDroppedFile(badFile)], component.selectedISOS[0]);
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toContain('File names can only include alphabetical characters');
    expect(attachmentServiceSpy.uploadFile).not.toHaveBeenCalled();
  });

  it('dropped should reject files that exceed max size', () => {
    const bigFile = { name: 'big.txt', type: 'text/plain', size: component.MAX_FILE_SIZE + 1 };
    component.currentStep = 1;
    component.BUNDLE_ENABLED = false;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    component.dropped([mockDroppedFile(bigFile)], component.selectedISOS[0]);
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('File size must be under 3MB.');
    expect(attachmentServiceSpy.uploadFile).not.toHaveBeenCalled();
  });

  it('dropped should upload compliance ISO file and set URL', () => {
    component.currentStep = 1;
    component.BUNDLE_ENABLED = false;
    component.showUploadAtt = false;
    component.showUploadFile = true;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    const file = { name: 'iso.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], component.selectedISOS[0]);
    expect(attachmentServiceSpy.uploadFile).toHaveBeenCalled();
    expect(component.selectedISOS[0].url).toBe('https://uploaded.file');
    expect(component.showUploadFile).toBeFalse();
  });

  it('dropped should upload self-attestation when uploadAtt is enabled', () => {
    component.currentStep = 1;
    component.BUNDLE_ENABLED = false;
    component.showUploadAtt = true;
    component.selfAtt = { name: 'Compliance:SelfAtt' };
    component.finishChars = [];
    const file = { name: 'selfatt.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], 'ignored');
    expect(component.selfAtt.name).toBe('Compliance:SelfAtt');
    expect(component.finishChars.length).toBe(1);
    expect(component.showUploadAtt).toBeFalse();
    expect(component.showUploadFile).toBeFalse();
  });

  it('dropped should upload image attachment and set preview', () => {
    component.currentStep = 5;
    component.BUNDLE_ENABLED = false;
    const file = { name: 'picture.png', type: 'image/png', size: 200 };
    component.dropped([mockDroppedFile(file)], 'img');
    expect(component.showImgPreview).toBeTrue();
    expect(component.imgPreview).toBe('https://uploaded.file');
    expect(component.prodAttachments.length).toBe(1);
  });

  it('dropped should reject non-image file when img selector is used', () => {
    component.currentStep = 5;
    component.BUNDLE_ENABLED = false;
    const file = { name: 'doc.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], 'img');
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('File must have a valid image format!');
  });

  it('dropped should set attachment draft for generic files', () => {
    component.currentStep = 5;
    component.BUNDLE_ENABLED = false;
    const file = { name: 'manual.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], 'attachment');
    expect(component.attachToCreate.url).toBe('https://uploaded.file');
    expect(component.attachToCreate.attachmentType).toBe('application/pdf');
  });

  it('dropped should handle upload errors and show 413-specific message', () => {
    attachmentServiceSpy.uploadFile.and.returnValue(throwError(() => ({ status: 413, error: { error: 'too large' } })));
    component.currentStep = 1;
    component.BUNDLE_ENABLED = false;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    const file = { name: 'iso.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], component.selectedISOS[0]);
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('File size too large! Must be under 3MB.');
  });

  it('dropped should ignore directory entries', () => {
    const directoryEntry = {
      relativePath: 'folder',
      fileEntry: { isFile: false }
    };
    component.dropped([directoryEntry as any], 'ignored');
    expect(component.files.length).toBe(1);
  });

  it('isValidFilename should validate filename with configured regex', () => {
    expect(component.isValidFilename('valid-file_1.0.txt')).toBeTrue();
    expect(component.isValidFilename('invalid name.txt')).toBeFalse();
  });

  it('fileOver, fileLeave and uploadFile should execute without side effects', () => {
    spyOn(console, 'log');
    component.fileOver({ type: 'over' });
    component.fileLeave({ type: 'leave' });
    component.uploadFile();
    expect(console.log).toHaveBeenCalled();
  });

  it('toggleUploadSelfAtt and toggleUploadFile should set flags and selectedISO', () => {
    component.toggleUploadSelfAtt();
    expect(component.showUploadFile).toBeTrue();
    expect(component.showUploadAtt).toBeTrue();
    component.toggleUploadFile({ name: 'ISO-A' });
    expect(component.selectedISO).toEqual({ name: 'ISO-A' });
  });

  it('toggleChars should activate chars section and reset char creation state', () => {
    const selectSpy = spyOn(component, 'selectStep');
    const refreshSpy = spyOn(component, 'refreshChars');
    component.showCreateChar = true;
    component.charTypeSelected = 'number';
    component.toggleChars();
    expect(selectSpy).toHaveBeenCalledWith('chars', 'chars-circle');
    expect(component.showChars).toBeTrue();
    expect(component.showCreateChar).toBeFalse();
    expect(component.charTypeSelected).toBe('string');
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('populateProductInfo should preserve existing characteristic ids', () => {
    component.prod = {
      ...component.prod,
      productSpecCharacteristic: [
        {
          id: 'urn:ngsi-ld:characteristic:platinum-id',
          name: 'platinum',
          description: 'desc',
          productSpecCharacteristicValue: [{ isDefault: true, value: true }]
        }
      ]
    } as any;

    component.populateProductInfo();

    expect(component.prodChars.length).toBe(1);
    expect(component.prodChars[0].id).toBe('urn:ngsi-ld:characteristic:platinum-id');
  });

  it('hasUnsavedComplianceProfileChanges should return false when compliance profile matches persisted data', () => {
    component.prod = {
      ...component.prod,
      productSpecCharacteristic: [
        {
          id: 'urn:ngsi-ld:characteristic:self-att',
          name: 'Compliance:SelfAtt',
          productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-attestation.pdf' }]
        },
        {
          id: 'urn:ngsi-ld:characteristic:custom-cert',
          name: 'Compliance:CustomCert',
          productSpecCharacteristicValue: [{ isDefault: true, value: 'https://custom-cert.pdf' }]
        }
      ]
    } as any;

    component.populateProductInfo();

    expect(component.hasUnsavedComplianceProfileChanges()).toBeFalse();
  });

  it('hasUnsavedComplianceProfileChanges should return true when compliance profile changes without update', () => {
    component.prod = {
      ...component.prod,
      productSpecCharacteristic: [
        {
          id: 'urn:ngsi-ld:characteristic:self-att',
          name: 'Compliance:SelfAtt',
          productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-attestation.pdf' }]
        },
        {
          id: 'urn:ngsi-ld:characteristic:custom-cert',
          name: 'Compliance:CustomCert',
          productSpecCharacteristicValue: [{ isDefault: true, value: 'https://custom-cert.pdf' }]
        }
      ]
    } as any;

    component.populateProductInfo();
    component.additionalISOS[0].url = 'https://custom-cert-updated.pdf';

    expect(component.hasUnsavedComplianceProfileChanges()).toBeTrue();
  });

  it('setProductData should preserve selected ISO ids', () => {
    component.finishChars = [];
    component.prodChars = [];
    component.selectedISOS = [
      { id: 'urn:ngsi-ld:characteristic:iso-id', name: 'Compliance:ISO27001', url: 'https://iso' }
    ];
    component.generalForm.patchValue({
      name: 'My Product',
      version: '1.0',
      brand: 'Brand',
      description: '',
      number: ''
    });

    component.setProductData();

    const isoChar = component.productSpecToUpdate?.productSpecCharacteristic?.find(
      (item: any) => item.name === 'Compliance:ISO27001'
    );
    expect(isoChar?.id).toBe('urn:ngsi-ld:characteristic:iso-id');
  });

  it('setProductData should preserve Compliance:VC id when available', () => {
    component.finishChars = [];
    component.prodChars = [];
    component.complianceVCId = 'urn:ngsi-ld:characteristic:vc-id';
    component.complianceVC = 'vc-token';
    component.generalForm.patchValue({
      name: 'My Product',
      version: '1.0',
      brand: 'Brand',
      description: '',
      number: ''
    });

    component.setProductData();

    const vcChar = component.productSpecToUpdate?.productSpecCharacteristic?.find(
      (item: any) => item.name === 'Compliance:VC'
    );
    expect(vcChar?.id).toBe('urn:ngsi-ld:characteristic:vc-id');
  });

  it('setProductData should include self attestation when it is only present in selfAtt state', () => {
    component.finishChars = [];
    component.prodChars = [];
    component.selfAtt = {
      id: 'urn:ngsi-ld:characteristic:self-att-id',
      name: 'Compliance:SelfAtt',
      productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-attestation.pdf' }]
    };
    component.generalForm.patchValue({
      name: 'My Product',
      version: '1.0',
      brand: 'Brand',
      description: '',
      number: ''
    });

    component.setProductData();

    const selfAttChar = component.productSpecToUpdate?.productSpecCharacteristic?.find(
      (item: any) => item.name === 'Compliance:SelfAtt'
    );
    expect(selfAttChar).toBeDefined();
    expect(selfAttChar?.id).toBe('urn:ngsi-ld:characteristic:self-att-id');
    expect((selfAttChar as any)?.productSpecCharacteristicValue?.[0]?.value).toBe('https://self-attestation.pdf');
  });

  it('setProductData should overwrite stale self attestation value from prodChars with latest selfAtt state', () => {
    component.finishChars = [];
    component.prodChars = [
      {
        id: 'urn:ngsi-ld:characteristic:self-att-old',
        name: 'Compliance:SelfAtt',
        productSpecCharacteristicValue: [{ isDefault: true, value: 'https://old-self-attestation.pdf' }]
      } as any
    ];
    component.selfAtt = {
      id: 'urn:ngsi-ld:characteristic:self-att-new',
      name: 'Compliance:SelfAtt',
      productSpecCharacteristicValue: [{ isDefault: true, value: 'https://new-self-attestation.pdf' }]
    };
    component.generalForm.patchValue({
      name: 'My Product',
      version: '1.0',
      brand: 'Brand',
      description: '',
      number: ''
    });

    component.setProductData();

    const selfAttChars = component.productSpecToUpdate?.productSpecCharacteristic?.filter(
      (item: any) => item.name === 'Compliance:SelfAtt'
    ) ?? [];
    expect(selfAttChars.length).toBe(1);
    expect(selfAttChars[0].id).toBe('urn:ngsi-ld:characteristic:self-att-new');
    expect((selfAttChars[0] as any)?.productSpecCharacteristicValue?.[0]?.value).toBe('https://new-self-attestation.pdf');
  });

  it('toggleResource should reset resource pagination and request first page', () => {
    const selectSpy = spyOn(component, 'selectStep');
    const getSpy = spyOn(component, 'getResSpecs');
    component.resourceSpecs = [{ id: 'old' }];
    component.resourceSpecPage = 50;
    component.toggleResource();
    expect(getSpy).toHaveBeenCalledWith(false);
    expect(component.resourceSpecs).toEqual([]);
    expect(component.resourceSpecPage).toBe(0);
    expect(component.showResource).toBeTrue();
    expect(selectSpy).toHaveBeenCalledWith('resource', 'resource-circle');
  });

  it('getResSpecs and nextRes should update resource pagination state', async () => {
    await component.getResSpecs(false);
    expect(component.resourceSpecs.length).toBe(1);
    const spy = spyOn(component, 'getResSpecs').and.resolveTo();
    await component.nextRes();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('addResToSelected and isResSelected should toggle resource selection', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    const res = { id: 'res-1', href: 'href', name: 'Resource' };
    component.addResToSelected(res);
    expect(component.isResSelected(res)).toBeTrue();
    component.addResToSelected(res);
    expect(component.isResSelected(res)).toBeFalse();
    expect(detectSpy).toHaveBeenCalledTimes(2);
  });

  it('toggleService should reset service pagination and request first page', () => {
    const selectSpy = spyOn(component, 'selectStep');
    const getSpy = spyOn(component, 'getServSpecs');
    component.serviceSpecs = [{ id: 'old' }];
    component.serviceSpecPage = 50;
    component.toggleService();
    expect(getSpy).toHaveBeenCalledWith(false);
    expect(component.serviceSpecs).toEqual([]);
    expect(component.serviceSpecPage).toBe(0);
    expect(component.showService).toBeTrue();
    expect(selectSpy).toHaveBeenCalledWith('service', 'service-circle');
  });

  it('getServSpecs and nextServ should update service pagination state', async () => {
    await component.getServSpecs(false);
    expect(component.serviceSpecs.length).toBe(1);
    const spy = spyOn(component, 'getServSpecs').and.resolveTo();
    await component.nextServ();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('addServToSelected and isServSelected should toggle service selection', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    const serv = { id: 'serv-1', href: 'href', name: 'Service' };
    component.addServToSelected(serv);
    expect(component.isServSelected(serv)).toBeTrue();
    component.addServToSelected(serv);
    expect(component.isServSelected(serv)).toBeFalse();
    expect(detectSpy).toHaveBeenCalledTimes(2);
  });

  it('toggleAttach should activate attachment section', () => {
    const selectSpy = spyOn(component, 'selectStep');
    const refreshSpy = spyOn(component, 'refreshChars');
    const timeoutSpy = spyOn(window, 'setTimeout');
    component.toggleAttach();
    expect(component.showAttach).toBeTrue();
    expect(component.showGeneral).toBeFalse();
    expect(selectSpy).toHaveBeenCalledWith('attach', 'attach-circle');
    expect(refreshSpy).toHaveBeenCalled();
    expect(timeoutSpy).toHaveBeenCalled();
  });

  it('removeImg should remove profile image attachment and clear preview', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.showImgPreview = true;
    component.imgPreview = 'https://img';
    component.prodAttachments = [{ name: 'Profile Picture', url: 'https://img', attachmentType: 'Picture' } as any];
    component.removeImg();
    expect(component.showImgPreview).toBeFalse();
    expect(component.imgPreview).toBe('');
    expect(component.prodAttachments.length).toBe(0);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('saveImgFromURL should create profile image attachment from URL field', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.imgURL = { nativeElement: { value: 'https://site/image.png' } } as any;
    component.saveImgFromURL();
    expect(component.showImgPreview).toBeTrue();
    expect(component.imgPreview).toBe('https://site/image.png');
    expect(component.prodAttachments[0].name).toBe('Profile Picture');
    expect(component.attImageName.value).toBeNull();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeAtt should remove attachments and clear image preview when needed', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.showImgPreview = true;
    component.imgPreview = 'https://img';
    component.prodAttachments = [
      { name: 'Profile Picture', url: 'https://img', attachmentType: 'Picture' } as any,
      { name: 'Manual', url: 'https://manual', attachmentType: 'application/pdf' } as any
    ];
    component.removeAtt({ url: 'https://img' });
    expect(component.showImgPreview).toBeFalse();
    expect(component.imgPreview).toBe('');
    expect(component.prodAttachments.length).toBe(1);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('saveAtt and clearAtt should manage attachment draft lifecycle', () => {
    component.attachName = { nativeElement: { value: 'Manual' } } as any;
    component.attachToCreate = { url: 'https://manual.pdf', attachmentType: 'application/pdf' };
    component.showNewAtt = true;
    component.saveAtt();
    expect(component.prodAttachments.length).toBe(1);
    expect(component.prodAttachments[0].name).toBe('Manual');
    expect(component.attachToCreate.url).toBe('');
    expect(component.showNewAtt).toBeFalse();
    component.attachToCreate = { url: 'x', attachmentType: 'y' };
    component.clearAtt();
    expect(component.attachToCreate).toEqual({ url: '', attachmentType: '' });
  });

  it('saveAdditionalCert and clearAdditionalCert should manage additional cert draft', () => {
    component.certificationName = { nativeElement: { value: 'CustomISO' } } as any;
    component.isoToCreate = 'https://cert.url';
    component.showCert = true;
    component.saveAdditionalCert();
    expect(component.additionalISOS.length).toBe(1);
    expect(component.additionalISOS[0].name).toBe('Compliance:CustomISO');
    expect(component.isoToCreate).toBe('');
    expect(component.showCert).toBeFalse();
    component.certificationName = { nativeElement: { value: 'keep' } } as any;
    component.isoToCreate = 'x';
    component.clearAdditionalCert(true);
    expect(component.certificationName.nativeElement.value).toBe('keep');
    expect(component.isoToCreate).toBe('');
    component.certificationName = { nativeElement: { value: 'reset' } } as any;
    component.isoToCreate = 'y';
    component.clearAdditionalCert(false);
    expect(component.certificationName.nativeElement.value).toBe('');
  });

  it('toggleRelationship should reset state and request related product specs', () => {
    const getSpy = spyOn(component, 'getProdSpecsRel');
    const selectSpy = spyOn(component, 'selectStep');
    component.prodSpecRels = [{ id: 'old' }];
    component.prodSpecRelPage = 50;
    component.showCreateRel = true;
    component.toggleRelationship();
    expect(component.prodSpecRels).toEqual([]);
    expect(component.prodSpecRelPage).toBe(0);
    expect(component.showCreateRel).toBeFalse();
    expect(component.showRelationships).toBeTrue();
    expect(getSpy).toHaveBeenCalledWith(false);
    expect(selectSpy).toHaveBeenCalledWith('relationships', 'relationships-circle');
  });

  it('getProdSpecsRel and nextProdSpecsRel should update relationship pagination state', async () => {
    await component.getProdSpecsRel(false);
    expect(component.prodSpecRels.length).toBe(1);
    const spy = spyOn(component, 'getProdSpecsRel').and.resolveTo();
    await component.nextProdSpecsRel();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('selectRelationship, onRelChange, saveRel and deleteRel should manage relationships', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.selectRelationship({ id: 'r1', href: 'href', name: 'Rel1' });
    expect(component.selectedProdSpec.id).toBe('r1');
    component.onRelChange({ target: { value: 'dependency' } });
    expect(component.selectedRelType).toBe('dependency');
    component.saveRel();
    expect(component.prodRelationships.length).toBe(1);
    expect(component.prodRelationships[0].relationshipType).toBe('dependency');
    expect(component.selectedRelType).toBe('migration');
    component.deleteRel({ id: 'r1' });
    expect(component.prodRelationships.length).toBe(0);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('refreshChars should restore default characteristic state', () => {
    component.stringValue = 'x';
    component.numberValue = '2';
    component.rangeUnit = 'ms';
    component.jsonValue = '{"a":1}';
    component.charTypeSelected = 'number';
    component.creatingChars = [{ isDefault: true } as any];
    component.refreshChars();
    expect(component.stringValue).toBe('');
    expect(component.numberValue).toBe('');
    expect(component.rangeUnit).toBe('');
    expect(component.jsonValue).toBe('');
    expect(component.charTypeSelected).toBe('string');
    expect(component.booleanDefaultTrue).toBeTrue();
    expect(component.creatingChars).toEqual([]);
  });

  it('removeClass and addClass should update className', () => {
    const elem = { className: 'a b c' } as HTMLElement;
    component.removeClass(elem, 'b');
    expect(elem.className).toBe('a c');
    component.addClass(elem, 'new-class');
    expect(elem.className).toContain('new-class');
  });

  it('unselectMenu and selectMenu should delegate to class helpers', () => {
    const elem = { className: 'x active' } as HTMLElement;
    const removeSpy = spyOn(component, 'removeClass');
    component.unselectMenu(elem, 'active');
    expect(removeSpy).toHaveBeenCalledWith(elem, 'active');
    const addSpy = spyOn(component, 'addClass');
    component.selectMenu({ className: 'x' } as HTMLElement, 'active');
    expect(addSpy).toHaveBeenCalled();
  });

  it('selectStep should select active step and update menu classes', () => {
    const selectSpy = spyOn(component, 'selectMenu');
    const unselectSpy = spyOn(component, 'unselectMenu');
    spyOn(document, 'getElementById').and.returnValue({ className: 'text-gray-500 border-gray-400' } as any);
    component.selectStep('general-info', 'general-circle');
    expect(selectSpy).toHaveBeenCalled();
    expect(unselectSpy).toHaveBeenCalled();
    expect(component.stepsElements).toContain('general-info');
    expect(component.stepsCircles).toContain('general-circle');
  });

  it('onTypeChange should switch characteristic type and clear draft values', () => {
    component.creatingChars = [{ isDefault: true } as any];
    component.isOptional = true;
    component.optionalDftTrue = true;
    component.booleanDefaultTrue = false;
    component.onTypeChange({ target: { value: 'number' } });
    expect(component.charTypeSelected).toBe('number');
    expect(component.creatingChars).toEqual([]);
    expect(component.isOptional).toBeFalse();
    component.onTypeChange({ target: { value: 'boolean' } });
    expect(component.charTypeSelected).toBe('boolean');
    expect(component.booleanDefaultTrue).toBeTrue();
    expect(component.creatingChars.length).toBe(2);
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[0].value as any).toBeTrue();
    expect(component.creatingChars[1].isDefault).toBeFalse();
    expect(component.creatingChars[1].value as any).toBeFalse();
    component.onTypeChange({ target: { value: 'range' } });
    expect(component.charTypeSelected).toBe('range');
  });

  it('onTypeChange should reset draft values for JSON-based characteristic types', () => {
    component.stringValue = 'old';
    component.numberValue = '1';
    component.numberUnit = 'ms';
    component.fromValue = '1';
    component.toValue = '2';
    component.rangeUnit = 'GB';
    component.jsonValue = '{"old": true}';
    component.creatingChars = [{ isDefault: true, value: { old: true } } as any];

    component.onTypeChange({ target: { value: 'credentialsConfiguration' } });

    expect(component.charTypeSelected).toBe('credentialsConfiguration');
    expect(component.stringValue).toBe('');
    expect(component.numberValue).toBe('');
    expect(component.rangeUnit).toBe('');
    expect(component.jsonValue).toBe('');
    expect(component.creatingChars).toEqual([]);
  });

  it('onBooleanDefaultChange should switch default between true and false', () => {
    component.charTypeSelected = 'boolean';
    component.booleanDefaultTrue = true;
    component.onBooleanDefaultChange();
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[1].isDefault).toBeFalse();

    component.booleanDefaultTrue = false;
    component.onBooleanDefaultChange();
    expect(component.creatingChars[0].isDefault).toBeFalse();
    expect(component.creatingChars[1].isDefault).toBeTrue();
  });

  it('addCharValue should add string values and assign default correctly', () => {
    component.charTypeSelected = 'string';
    component.stringValue = 'A';
    component.addCharValue();
    component.stringValue = 'B';
    component.addCharValue();
    expect(component.creatingChars.length).toBe(2);
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[1].isDefault).toBeFalse();
  });

  it('addCharValue should add number values with units', () => {
    component.charTypeSelected = 'number';
    component.numberValue = '100';
    component.numberUnit = 'ms';
    component.addCharValue();
    expect(component.creatingChars[0].value as any).toBe('100');
    expect(component.creatingChars[0].unitOfMeasure).toBe('ms');
    expect(component.numberValue).toBe('');
    expect(component.numberUnit).toBe('');
  });

  it('addCharValue should not mutate fixed boolean values', () => {
    component.charTypeSelected = 'boolean';
    component.creatingChars = [
      { isDefault: true, value: true } as any,
      { isDefault: false, value: false } as any
    ];
    component.addCharValue();
    expect(component.creatingChars.length).toBe(2);
    expect(component.creatingChars[0].value as any).toBeTrue();
    expect(component.creatingChars[1].value as any).toBeFalse();
  });

  it('addCharValue should validate range and reject invalid intervals', () => {
    component.charTypeSelected = 'range';
    component.fromValue = '10';
    component.toValue = '5';
    component.addCharValue();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toContain('Invalid range');
    expect(component.creatingChars.length).toBe(0);
  });

  it('addCharValue should add valid range values', () => {
    component.charTypeSelected = 'range';
    component.fromValue = '5';
    component.toValue = '10';
    component.rangeUnit = 'GB';
    component.addCharValue();
    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].valueFrom as any).toBe('5');
    expect(component.creatingChars[0].valueTo as any).toBe('10');
    expect(component.creatingChars[0].unitOfMeasure).toBe('GB');
  });

  it('addCharValue should parse and add JSON values for credentialsConfiguration', () => {
    component.charTypeSelected = 'credentialsConfiguration';
    component.jsonValue = '{"issuer":"did:example:123","format":"jwt_vc"}';

    component.addCharValue();

    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[0].value as any).toEqual({
      issuer: 'did:example:123',
      format: 'jwt_vc'
    });
    expect(component.jsonValue).toBe('');
  });

  it('addCharValue should allow only one JSON value for JSON-based characteristic types', () => {
    component.charTypeSelected = 'credentialsConfiguration';
    component.jsonValue = '{"issuer":"did:example:123"}';
    component.addCharValue();
    component.jsonValue = '{"issuer":"did:example:456"}';

    component.addCharValue();

    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].value as any).toEqual({ issuer: 'did:example:123' });
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Only one JSON value is allowed');
  });

  it('addCharValue should reject invalid JSON for authorizationPolicy', () => {
    component.charTypeSelected = 'authorizationPolicy';
    component.jsonValue = '{"policy":';

    component.addCharValue();

    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Invalid JSON format');
    expect(component.creatingChars).toEqual([]);
  });

  it('removeCharValue and selectDefaultChar should manage created char values', () => {
    component.creatingChars = [
      { isDefault: true, value: 'A' } as any,
      { isDefault: false, value: 'B' } as any
    ];
    component.selectDefaultChar(component.creatingChars[1], 1);
    expect(component.creatingChars[0].isDefault).toBeFalse();
    expect(component.creatingChars[1].isDefault).toBeTrue();
    component.removeCharValue(component.creatingChars[0], 0);
    expect(component.creatingChars.length).toBe(1);
  });

  it('removeCharValue should not remove values for boolean type', () => {
    component.charTypeSelected = 'boolean';
    component.creatingChars = [
      { isDefault: true, value: true } as any,
      { isDefault: false, value: false } as any
    ];
    component.removeCharValue(component.creatingChars[0], 0);
    expect(component.creatingChars.length).toBe(2);
    expect(component.creatingChars[0].value as any).toBeTrue();
    expect(component.creatingChars[1].value as any).toBeFalse();
  });

  it('saveChar should allow duplicated names in update flow', () => {
    component.charsForm.patchValue({ name: 'Latency', description: 'desc' });
    component.prodChars = [{ id: '1', name: 'Latency', productSpecCharacteristicValue: [] } as any];
    component.creatingChars = [{ isDefault: true, value: '100' } as any];
    component.saveChar();
    expect(component.showError).toBeFalse();
    expect(component.prodChars.length).toBe(2);
  });

  it('saveChar should save main and optional enabled characteristic', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.charsForm.patchValue({ name: 'Bandwidth', description: 'desc' });
    component.creatingChars = [{ isDefault: true, value: '1Gbps' } as any];
    component.isOptional = true;
    component.optionalDftTrue = true;
    component.saveChar();
    expect(component.prodChars.length).toBe(2);
    expect(component.prodChars[0].name).toBe('Bandwidth');
    expect(component.prodChars[1].name).toBe('Bandwidth - enabled');
    expect(component.showCreateChar).toBeFalse();
    expect(component.isOptional).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('saveChar should ignore optional toggle for boolean characteristics', () => {
    component.charTypeSelected = 'boolean';
    component.charsForm.patchValue({ name: 'Enabled', description: 'desc' });
    component.creatingChars = [
      { isDefault: true, value: true } as any,
      { isDefault: false, value: false } as any
    ];
    component.isOptional = true;
    component.optionalDftTrue = true;
    component.saveChar();
    expect(component.prodChars.length).toBe(1);
    expect(component.prodChars[0].name).toBe('Enabled');
  });

  it('saveChar should persist credentialsConfiguration metadata', () => {
    component.charTypeSelected = 'credentialsConfiguration';
    component.charsForm.patchValue({ name: 'Credential Config', description: 'desc' });
    component.creatingChars = [{ isDefault: true, value: { issuer: 'did:example:issuer' } } as any];
    component.isOptional = true;
    component.optionalDftTrue = true;

    component.saveChar();

    expect(component.prodChars.length).toBe(1);
    expect((component.prodChars[0] as any).valueType).toBe('credentialsConfiguration');
    expect((component.prodChars[0] as any)['@schemaLocation']).toContain('credentialConfigCharacteristic.json');
    expect(component.prodChars.find(char => char.name === 'Credential Config - enabled')).toBeUndefined();
  });

  it('saveChar should persist authorizationPolicy metadata', () => {
    component.charTypeSelected = 'authorizationPolicy';
    component.charsForm.patchValue({ name: 'Authorization Policy', description: 'desc' });
    component.creatingChars = [{ isDefault: true, value: { permission: [] } } as any];

    component.saveChar();

    expect(component.prodChars.length).toBe(1);
    expect((component.prodChars[0] as any).valueType).toBe('authorizationPolicy');
    expect((component.prodChars[0] as any)['@schemaLocation']).toContain('policyCharacteristic.json');
  });

  it('deleteChar should remove characteristic and its related enabled one', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.prodChars = [
      { id: 'a', name: 'Bandwidth' } as any,
      { id: 'b', name: 'Bandwidth - enabled' } as any,
      { id: 'c', name: 'Other' } as any
    ];
    component.deleteChar({ id: 'a', name: 'Bandwidth' });
    expect(component.prodChars.length).toBe(1);
    expect(component.prodChars[0].name).toBe('Other');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('checkInput should identify blank inputs', () => {
    expect(component.checkInput('   ')).toBeTrue();
    expect(component.checkInput('abc')).toBeFalse();
  });

  it('showFinish should build final product payload and activate summary step', () => {
    const selectSpy = spyOn(component, 'selectStep');
    const refreshSpy = spyOn(component, 'refreshChars');
    component.partyId = 'party-1';
    component.bundleChecked = true;
    component.generalForm.patchValue({
      name: 'My Product',
      description: 'Desc',
      version: '1.0',
      brand: 'Brand',
      number: 'PN-1'
    });
    component.prodSpecsBundle = [{ id: 'bundle-1' } as any];
    component.prodChars = [{ id: 'char-1', name: 'Feature', productSpecCharacteristicValue: [{ value: 'x' }] } as any];
    component.selectedISOS = [{ name: 'Compliance:ISO-1', url: 'https://iso' }];
    component.additionalISOS = [{ name: 'Compliance:Custom', url: 'https://custom' }];
    component.prodRelationships = [{ id: 'rel-1', href: 'href-1', name: 'RelName', relationshipType: 'migration' }];
    component.prodAttachments = [{ name: 'Manual', url: 'https://doc', attachmentType: 'application/pdf' } as any];
    component.selectedResourceSpecs = [{ id: 'res-1' } as any];
    component.selectedServiceSpecs = [{ id: 'srv-1' } as any];
    component.showFinish();
    expect(component.showSummary).toBeTrue();
    expect(component.productSpecToUpdate).toBeDefined();
    expect(component.productSpecToUpdate?.name).toBe('My Product');
    expect(component.productSpecToUpdate?.productSpecCharacteristic?.length).toBeGreaterThan(0);
    expect(component.productSpecToUpdate?.productSpecificationRelationship?.length).toBe(1);
    expect(component.productSpecToUpdate?.resourceSpecification?.length).toBe(1);
    expect(component.productSpecToUpdate?.serviceSpecification?.length).toBe(1);
    expect(selectSpy).toHaveBeenCalledWith('summary', 'summary-circle');
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('updateProduct should call API and go back on success', () => {
    const backSpy = spyOn(component, 'goBack');
    component.prod = { id: 'prod-1' } as any;
    spyOn(component, 'setProductData').and.callFake(() => {
      component.productSpecToUpdate = { name: 'Prod' } as any;
    });
    component.updateProduct();
    expect(prodSpecServiceSpy.updateProdSpec).toHaveBeenCalledWith(component.productSpecToUpdate, 'prod-1');
    expect(component.loading).toBeFalse();
    expect(backSpy).toHaveBeenCalled();
  });

  it('updateProduct should handle API error and show message', () => {
    prodSpecServiceSpy.updateProdSpec.and.returnValue(throwError(() => ({ error: { error: 'boom' } })));
    component.prod = { id: 'prod-1' } as any;
    spyOn(component, 'setProductData').and.callFake(() => {
      component.productSpecToUpdate = { name: 'Prod' } as any;
    });
    component.updateProduct();
    expect(component.loading).toBeFalse();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: boom');
  });

  it('markdown helpers should append markdown snippets', () => {
    component.generalForm.patchValue({ description: 'base' });
    component.addBold();
    expect(component.generalForm.value.description).toContain('**bold text**');
    component.addItalic();
    expect(component.generalForm.value.description).toContain('_italicized text_');
    component.addList();
    expect(component.generalForm.value.description).toContain('- First item');
    component.addOrderedList();
    expect(component.generalForm.value.description).toContain('1. First item');
    component.addCode();
    expect(component.generalForm.value.description).toContain('`code`');
    component.addCodeBlock();
    expect(component.generalForm.value.description).toContain('```');
    component.addBlockquote();
    expect(component.generalForm.value.description).toContain('> blockquote');
    component.addLink();
    expect(component.generalForm.value.description).toContain('[title](https://www.example.com)');
    component.addTable();
    expect(component.generalForm.value.description).toContain('| Syntax | Description |');
  });

  it('addEmoji should append selected emoji and close picker', () => {
    component.generalForm.patchValue({ description: 'base' });
    component.showEmoji = true;
    component.addEmoji({ emoji: { native: '🚀' } });
    expect(component.showEmoji).toBeFalse();
    expect(component.generalForm.value.description).toContain('🚀');
  });

  it('hasLongWord should detect words over threshold', () => {
    expect(component.hasLongWord('small words only', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryveryveryverylongword here', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });

  it('getValuePreview should truncate long values and keep short ones', () => {
    const shortValue = component.getValuePreview({ key: 'value' }, 80);
    const longValue = component.getValuePreview({ long: 'a'.repeat(200) }, 40);

    expect(shortValue).toContain('"key":"value"');
    expect(longValue.endsWith('...')).toBeTrue();
    expect(longValue.length).toBe(43);
  });

  it('goToStep should update current step without validating current form', () => {
    component.currentStep = 0;
    const validateSpy = spyOn(component, 'validateCurrentStep').and.returnValue(false);
    component.goToStep(1);
    expect(validateSpy).not.toHaveBeenCalled();
    expect(component.currentStep).toBe(1);
  });

  it('goToStep should call dependent loaders for non-bundle flow', () => {
    component.BUNDLE_ENABLED = false;
    component.currentStep = 0;
    component.highestStep = 0;
    spyOn(component, 'validateCurrentStep').and.returnValue(true);
    const refreshSpy = spyOn(component, 'refreshChars');
    const resSpy = spyOn(component, 'getResSpecs');
    const servSpy = spyOn(component, 'getServSpecs');
    const relSpy = spyOn(component, 'getProdSpecsRel');
    const finishSpy = spyOn(component, 'showFinish');
    const timeoutSpy = spyOn(window, 'setTimeout');

    component.goToStep(3);
    expect(resSpy).toHaveBeenCalledWith(false);
    component.goToStep(4);
    expect(servSpy).toHaveBeenCalledWith(false);
    component.goToStep(5);
    expect(timeoutSpy).toHaveBeenCalled();
    component.goToStep(6);
    expect(relSpy).toHaveBeenCalledWith(false);
    component.goToStep(7);
    expect(finishSpy).toHaveBeenCalled();
    expect(component.highestStep).toBe(7);
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('goToStep should call dependent loaders for bundle flow', () => {
    component.BUNDLE_ENABLED = true;
    spyOn(component, 'validateCurrentStep').and.returnValue(true);
    const resSpy = spyOn(component, 'getResSpecs');
    const servSpy = spyOn(component, 'getServSpecs');
    const relSpy = spyOn(component, 'getProdSpecsRel');
    const finishSpy = spyOn(component, 'showFinish');
    component.goToStep(4);
    component.goToStep(5);
    component.goToStep(7);
    component.goToStep(8);
    expect(resSpy).toHaveBeenCalledWith(false);
    expect(servSpy).toHaveBeenCalledWith(false);
    expect(relSpy).toHaveBeenCalledWith(false);
    expect(finishSpy).toHaveBeenCalled();
  });

  it('validateCurrentStep should validate step 0 by general form validity', () => {
    component.currentStep = 0;
    component.generalForm.patchValue({ name: '', brand: '', version: '' });
    expect(component.validateCurrentStep()).toBeFalse();
    component.generalForm.patchValue({ name: 'A', brand: 'B', version: '1.0' });
    expect(component.validateCurrentStep()).toBeTrue();
    component.currentStep = 5;
    expect(component.validateCurrentStep()).toBeTrue();
  });

  it('isStepDisabled should enforce step-specific guards', () => {
    component.currentStep = 0;
    component.generalForm.patchValue({ name: '', brand: '', version: '' });
    expect(component.isStepDisabled()).toBeTrue();
    component.generalForm.patchValue({ name: 'A', brand: 'B', version: '1.0' });
    expect(component.isStepDisabled()).toBeFalse();

    component.currentStep = 1;
    component.BUNDLE_ENABLED = true;
    component.bundleChecked = true;
    component.prodSpecsBundle = [{ id: '1' } as any];
    expect(component.isStepDisabled()).toBeTrue();
    component.prodSpecsBundle.push({ id: '2' } as any);
    expect(component.isStepDisabled()).toBeFalse();

    component.BUNDLE_ENABLED = false;
    spyOn(component, 'checkValidISOS').and.returnValue(true);
    expect(component.isStepDisabled()).toBeTrue();

    component.currentStep = 2;
    component.BUNDLE_ENABLED = true;
    (component.checkValidISOS as jasmine.Spy).and.returnValue(false);
    expect(component.isStepDisabled()).toBeFalse();
  });

  it('canNavigate and handleStepClick should honor navigation constraints', () => {
    component.currentStep = 0;
    component.highestStep = 0;
    component.generalForm.patchValue({ name: '', brand: '', version: '' });
    expect(component.canNavigate(0)).toBeFalse();
    component.generalForm.patchValue({ name: 'A', brand: 'B', version: '1.0' });
    component.highestStep = 2;
    expect(component.canNavigate(2)).toBeTrue();

    const goSpy = spyOn(component, 'goToStep');
    component.handleStepClick(2);
    expect(goSpy).toHaveBeenCalledWith(2);
    component.generalForm.patchValue({ name: '', brand: '', version: '' });
    component.handleStepClick(1);
    expect(goSpy).toHaveBeenCalledTimes(1);
  });

  it('normalizeName should strip compliance prefix and trim whitespace', () => {
    expect(component.normalizeName('Compliance: ISO 27001 ')).toBe('ISO 27001');
    expect(component.normalizeName('compliance:Custom')).toBe('Custom');
    expect(component.normalizeName(undefined)).toBe('');
  });
});
