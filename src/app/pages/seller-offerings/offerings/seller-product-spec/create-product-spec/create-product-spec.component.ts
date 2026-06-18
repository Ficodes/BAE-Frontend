import { Component, OnInit, ChangeDetectorRef, HostListener, ElementRef, ViewChild, OnDestroy, DoCheck, Input } from '@angular/core';
import { Router } from '@angular/router';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { LoginInfo } from 'src/app/models/interfaces';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { POPULAR_ICON_CATEGORIES, findIconByName, IconCategory } from 'src/app/config/popular-icons';

import {components} from "src/app/models/product-catalog";
import { environment } from 'src/environments/environment';
type ProductSpecification_Create = components["schemas"]["ProductSpecification_Create"];
type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];

@Component({
  selector: 'create-product-spec',
  templateUrl: './create-product-spec.component.html',
  styleUrl: './create-product-spec.component.css'
})
export class CreateProductSpecComponent implements OnInit, OnDestroy, DoCheck {

  @Input() prod: any = null;
  isEditMode: boolean = false;
  partyId:any='';

  productSpecToCreate:ProductSpecification_Create | undefined;

  stepsElements:string[]=['general-info','chars'];
  stepsCircles:string[]=['general-circle','chars-circle'];
  currentStep = 0;
  highestStep = 0;
  steps = [
    'General info',
    'Product details',
    'Configuration options',
    'Service specifications',
    'Resource specifications',
    'FAQs',
    'Compliance profile'
  ];

  productImage: { name: string, size?: number } | null = null;
  productImageUrl: string | null = null;
  productImageRef: { name: string, url: string, attachmentType: string } | null = null;
  uploadingImage: boolean = false;
  attachments: { name: string, size?: number, url?: string, attachmentType?: string }[] = [];
  uploadingAttachment: boolean = false;

  howItWorks: string = '';
  keyFeatures: { name: string, description: string, icon: string | null }[] = [];
  businessBenefits: { name: string, description: string }[] = [];
  useCases: { name: string, description: string, icon: string | null }[] = [];

  iconCategories: IconCategory[] = POPULAR_ICON_CATEGORIES;
  resolveIcon = findIconByName;

  itemModal: {
    type: 'feature' | 'benefit' | 'usecase' | null,
    name: string,
    description: string,
    icon: string | null,
    editIdx: number | null
  } = { type: null, name: '', description: '', icon: null, editIdx: null };

  openItemMenuIdx: { type: string, idx: number } | null = null;

  availableServiceSpecs: any[] = [];
  availableResourceSpecs: any[] = [];
  linkedServiceSpecIds: string[] = [];
  linkedResourceSpecIds: string[] = [];
  serviceDropdownOpen: boolean = false;
  resourceDropdownOpen: boolean = false;
  serviceSearch: string = '';
  resourceSearch: string = '';

  faqs: { question: string, answer: string, expanded: boolean }[] = [];
  draggingFaqIdx: number | null = null;
  faqDeleteIdx: number | null = null;

  usageSpecs: { name: string, description: string, metrics: { name: string, description: string }[] }[] = [];
  usageMenuIdx: number | null = null;
  usageMetricMenuIdx: number | null = null;
  usageModal: {
    isOpen: boolean,
    editIdx: number | null,
    name: string,
    description: string,
    metrics: { name: string, description: string }[],
    metricFormOpen: boolean,
    metricName: string,
    metricDescription: string,
    metricEditIdx: number | null
  } = { isOpen: false, editIdx: null, name: '', description: '', metrics: [], metricFormOpen: false, metricName: '', metricDescription: '', metricEditIdx: null };

  showPreview:boolean=false;
  showEmoji:boolean=false;
  description:string='';

  showGeneral:boolean=true;
  showChars:boolean=false;
  showSummary:boolean=false;
  generalDone:boolean=false;
  charsDone:boolean=false;
  finishDone:boolean=false;

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  charsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('')
  });
  charIsOptional: boolean = false;
  stringCharSelected:boolean=true;
  numberCharSelected:boolean=false;
  rangeCharSelected:boolean=false;
  booleanCharSelected:boolean=false;
  booleanDefaultTrue:boolean=true;
  prodChars:ProductSpecificationCharacteristic[]=[];
  creatingChars:CharacteristicValueSpecification[]=[];
  showCreateChar:boolean=false;

  errorMessage:any='';
  showError:boolean=false;
  loading:boolean=false;
  editingCharIdx: number | null = null;
  openCharMenuIdx: number | null = null;
  showSuccessModal: boolean = false;
  createdProdId: string | null = null;

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
    private prodSpecService: ProductSpecServiceService,
    private resSpecService: ResourceSpecServiceService,
    private servSpecService: ServiceSpecServiceService,
    private attachmentService: AttachmentServiceService,
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  @HostListener('document:click')
  onClick() {
    if(this.showEmoji==true){
      this.showEmoji=false;
      this.cdr.detectChanges();
    }
    if(this.openCharMenuIdx !== null){
      this.openCharMenuIdx = null;
      this.cdr.detectChanges();
    }
    if(this.openItemMenuIdx !== null){
      this.openItemMenuIdx = null;
      this.cdr.detectChanges();
    }
    if(this.serviceDropdownOpen || this.resourceDropdownOpen){
      this.serviceDropdownOpen = false;
      this.resourceDropdownOpen = false;
      this.cdr.detectChanges();
    }
    if(this.usageMenuIdx !== null){
      this.usageMenuIdx = null;
      this.cdr.detectChanges();
    }
    if(this.usageMetricMenuIdx !== null){
      this.usageMetricMenuIdx = null;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.initPartyInfo();
    this.loadValidatedSpecs();
    if(this.prod){
      this.isEditMode = true;
      this.createdProdId = this.prod.id;
      this.generalForm.patchValue({
        name: this.prod.name || '',
        description: this.parseDescription(this.prod.description || '')
      });
      this.prodChars = (this.prod.productSpecCharacteristic || [])
        .filter((c:any) => !(c?.name || '').startsWith('Compliance:'))
        .map((c:any) => ({
          ...c,
          _lastUpdate: c._lastUpdate || this.prod.lastUpdate || new Date(),
          _isOptional: c._isOptional || false
        }));
      this.linkedServiceSpecIds = (this.prod.serviceSpecification || []).map((s:any) => s?.id).filter(Boolean);
      this.linkedResourceSpecIds = (this.prod.resourceSpecification || []).map((r:any) => r?.id).filter(Boolean);
      this.loadAttachmentsFromProd();
      this.loadComplianceFromProd();
      this.highestStep = 1;
    }
  }

  private loadAttachmentsFromProd(){
    const list: any[] = Array.isArray(this.prod?.attachment) ? this.prod.attachment : [];
    console.log('[loadAttachmentsFromProd] this.prod.attachment =', list);
    const profile = list.find(a => a?.name === 'Profile Picture');
    const picture = profile || list.find(a => (a?.attachmentType || '').startsWith('image'));
    if (picture?.url) {
      console.log('[loadAttachmentsFromProd] picture =', picture);
      this.productImage = { name: picture.name && picture.name !== 'Profile Picture' ? picture.name : 'Product Image' };
      this.productImageUrl = picture.url;
      this.productImageRef = {
        name: picture.name || 'Profile Picture',
        url: picture.url,
        attachmentType: picture.attachmentType || 'image/png'
      };
    }
    this.attachments = list
      .filter(a => a !== picture && !!a?.url)
      .map(a => ({
        name: a.name || 'Attachment',
        url: a.url,
        attachmentType: a.attachmentType
      }));
  }

  ngDoCheck(){
    const open = !!(this.itemModal.type || this.usageModal.isOpen || this.showSuccessModal);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  ngOnDestroy(){
    document.body.style.overflow = '';
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  goBack() {
    this.eventMessage.emitSellerProductSpec(true);
  }

  finishAsDraft(){
    this.persistSpec(false);
  }

  validateProduct(){
    this.persistSpec(true);
  }

  closeReadyModal(){
    this.showSuccessModal = false;
  }

  allRequiredStepsComplete(): boolean {
    return this.steps.every((_: any, i: number) => this.isOptionalStep(i) || this.completedStep(i));
  }

  private persistSpec(launch: boolean){
    this.loading = true;
    if(this.isEditMode && this.createdProdId){
      const { relatedParty, lifecycleStatus, ...patchBody } = (this.productSpecToCreate as any) || {};
      const body: any = launch ? { ...patchBody, lifecycleStatus: 'Launched' } : patchBody;
      this.prodSpecService.updateProdSpec(body, this.createdProdId).subscribe({
        next: () => this.onPersistSuccess(launch),
        error: (error: any) => this.onPersistError(error)
      });
      return;
    }
    this.prodSpecService.postProdSpec(this.productSpecToCreate).subscribe({
      next: (data: any) => {
        this.createdProdId = data?.id || null;
        if(launch && this.createdProdId){
          this.prodSpecService.updateProdSpec({ lifecycleStatus: 'Launched' }, this.createdProdId).subscribe({
            next: () => this.onPersistSuccess(true),
            error: (error: any) => this.onPersistError(error)
          });
        } else {
          this.onPersistSuccess(false);
        }
      },
      error: (error: any) => this.onPersistError(error)
    });
  }

  private onPersistSuccess(launched: boolean){
    this.loading = false;
    this.showSuccessModal = false;
    const msg = launched
      ? 'Product specification successfully validated'
      : (this.isEditMode ? 'Product specification successfully updated' : 'Product specification successfully created');
    this.eventMessage.emitSpecCreated(msg);
    this.eventMessage.emitSellerProductSpec(true);
  }

  private onPersistError(error: any){
    console.error('There was an error while saving the product spec!', error);
    this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'There was an error while saving the product!';
    this.loading = false;
    this.showError = true;
    setTimeout(() => { this.showError = false; }, 3000);
  }

  onTypeChange(event: any) {
    const value = event.target.value;
    this.stringCharSelected = value=='string';
    this.numberCharSelected = value=='number';
    this.rangeCharSelected = value=='range';
    this.booleanCharSelected = value=='boolean';
    this.creatingChars=[];
    if(this.booleanCharSelected){
      this.booleanDefaultTrue=true;
      this.setBooleanDefaultValues();
    }
  }

  setBooleanDefaultValues(){
    this.creatingChars=[
      {
        isDefault:this.booleanDefaultTrue,
        value:true as any
      },
      {
        isDefault:!this.booleanDefaultTrue,
        value:false as any
      }
    ];
  }

  onBooleanDefaultChange(){
    if(this.booleanCharSelected){
      this.setBooleanDefaultValues();
    }
  }

  addCharValue(){
    if(this.stringCharSelected){
      if(this.creatingChars.length==0){
        this.creatingChars.push({ isDefault:true, value:this.stringValue as any })
      } else {
        this.creatingChars.push({ isDefault:false, value:this.stringValue as any })
      }
      this.stringValue='';
    } else if (this.numberCharSelected){
      if(this.creatingChars.length==0){
        this.creatingChars.push({ isDefault:true, value:this.numberValue as any, unitOfMeasure:this.numberUnit })
      } else {
        this.creatingChars.push({ isDefault:false, value:this.numberValue as any, unitOfMeasure:this.numberUnit })
      }
      this.numberUnit='';
      this.numberValue='';
    } else {
      if(this.creatingChars.length==0){
        this.creatingChars.push({ isDefault:true, valueFrom:this.fromValue as any, valueTo:this.toValue as any, unitOfMeasure:this.rangeUnit })
      } else {
        this.creatingChars.push({ isDefault:false, valueFrom:this.fromValue as any, valueTo:this.toValue as any, unitOfMeasure:this.rangeUnit })
      }
    }
    this.fromValue='';
    this.toValue='';
    this.rangeUnit='';
  }

  selectDefaultChar(char:any,idx:any){
    for(let i=0;i<this.creatingChars.length;i++){
      this.creatingChars[i].isDefault = (i==idx);
    }
  }

  saveChar(){
    if(this.charsForm.value.name!=null){
      const existing = this.editingCharIdx !== null ? this.prodChars[this.editingCharIdx] : null;
      const charData: any = {
        id: existing ? (existing as any).id : 'urn:ngsi-ld:characteristic:'+uuidv4(),
        name: this.charsForm.value.name,
        description: this.charsForm.value.description != null ? this.charsForm.value.description : '',
        productSpecCharacteristicValue: this.creatingChars,
        _lastUpdate: new Date(),
        _isOptional: this.charIsOptional
      };
      if(existing){
        this.prodChars[this.editingCharIdx as number] = charData;
        this.editingCharIdx = null;
      } else {
        this.editingCharIdx = null;
        this.prodChars.push(charData);
      }
    }

    this.charsForm.reset();
    this.creatingChars=[];
    this.showCreateChar=false;
    this.stringCharSelected=true;
    this.numberCharSelected=false;
    this.rangeCharSelected=false;
    this.booleanCharSelected=false;
    this.booleanDefaultTrue=true;
    this.charIsOptional=false;
    this.refreshChars();
    this.cdr.detectChanges();
  }

  editChar(idx: number){
    const char: any = this.prodChars[idx];
    this.editingCharIdx = idx;
    this.charsForm.patchValue({
      name: char.name,
      description: char.description
    });
    this.charIsOptional = char._isOptional || false;
    this.creatingChars = [...(char.productSpecCharacteristicValue || [])];
    const vals = this.creatingChars as any[];
    const first = vals[0];
    const isBoolean = vals.length > 0 && vals.every(c =>
      c.value === true || c.value === false || c.value === 'true' || c.value === 'false');
    if(first?.valueFrom !== undefined){
      this.stringCharSelected = false;
      this.numberCharSelected = false;
      this.rangeCharSelected = true;
      this.booleanCharSelected = false;
    } else if(isBoolean){
      this.stringCharSelected = false;
      this.numberCharSelected = false;
      this.rangeCharSelected = false;
      this.booleanCharSelected = true;
      const def = vals.find(c => c.isDefault);
      this.booleanDefaultTrue = def ? (def.value === true || def.value === 'true') : true;
    } else if(first?.unitOfMeasure){
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
    const values = prod.productSpecCharacteristicValue || [];
    return values.map((c: any) => {
      if(c.valueFrom !== undefined && c.valueFrom !== null){
        return `${c.valueFrom}-${c.valueTo}${c.unitOfMeasure ? ' ' + c.unitOfMeasure : ''}`;
      }
      return c.unitOfMeasure ? `${c.value} ${c.unitOfMeasure}` : `${c.value}`;
    }).join(',');
  }

  formatLastUpdate(date: any): string {
    if(!date) return '-';
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} - ${hh}:${mi}`;
  }

  toggleCharMenu(idx: number, event: Event){
    event.stopPropagation();
    this.openCharMenuIdx = this.openCharMenuIdx === idx ? null : idx;
  }

  removeCharValue(char:any,idx:any){
    this.creatingChars.splice(idx, 1);
  }

  deleteChar(char:any){
    const index = this.prodChars.findIndex((item:any) => item.id === char.id);
    if (index !== -1) {
      this.prodChars.splice(index, 1);
      if(this.editingCharIdx === index){
        this.editingCharIdx = null;
        this.showCreateChar = false;
        this.charsForm.reset();
        this.refreshChars();
        this.charIsOptional = false;
      } else if(this.editingCharIdx !== null && this.editingCharIdx > index){
        this.editingCharIdx = this.editingCharIdx - 1;
      }
    }
    this.cdr.detectChanges();
  }

  buildProductToCreate(){
    if(this.generalForm.value.name!=null){
      const cleanChars = this.prodChars.map((c:any) => {
        const { _lastUpdate, _isOptional, ...rest } = c;
        return rest;
      });
      const allChars = [...cleanChars, ...this.buildComplianceChars()];
      const attachmentList: any[] = [];
      if (this.productImageRef?.url) {
        attachmentList.push({
          name: this.productImageRef.name,
          url: this.productImageRef.url,
          attachmentType: this.productImageRef.attachmentType
        });
      }
      this.attachments.forEach(a => {
        if (a?.url) {
          attachmentList.push({
            name: a.name,
            url: a.url,
            attachmentType: a.attachmentType
          });
        }
      });

      this.productSpecToCreate = {
        name: this.generalForm.value.name,
        description: this.composeDescription(),
        version: '1.0',
        brand: this.generalForm.value.name,
        productNumber: '',
        lifecycleStatus: "Active",
        isBundle: false,
        productSpecCharacteristic: allChars,
        attachment: attachmentList,
        serviceSpecification: this.linkedServiceSpecIds.map(id => {
          const s = this.availableServiceSpecs.find((x:any) => x.id === id);
          return { id, href: s?.href || id, name: s?.name };
        }),
        resourceSpecification: this.linkedResourceSpecIds.map(id => {
          const r = this.availableResourceSpecs.find((x:any) => x.id === id);
          return { id, href: r?.href || id, name: r?.name };
        }),
        relatedParty: [
          {
            id: this.partyId,
            role: environment.SELLER_ROLE,
            "@referredType": ''
          }
        ],
      } as any;
    }
  }

  createProduct(){
    this.buildProductToCreate();
    this.showSuccessModal = true;
  }

  refreshChars(){
    this.stringValue= '';
    this.numberValue = '';
    this.numberUnit = '';
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
    this.stringCharSelected=true;
    this.numberCharSelected=false;
    this.rangeCharSelected=false;
    this.booleanCharSelected=false;
    this.booleanDefaultTrue=true;
    this.creatingChars=[];
  }

  itemListFor(type: 'feature' | 'benefit' | 'usecase'){
    return type === 'feature' ? this.keyFeatures : type === 'benefit' ? this.businessBenefits : this.useCases;
  }

  itemDescriptionLimit(type: 'feature' | 'benefit' | 'usecase' | null): number {
    return type === 'usecase' ? 400 : 200;
  }

  openItemModal(type: 'feature' | 'benefit' | 'usecase', editIdx: number | null = null){
    if(editIdx !== null){
      const existing: any = this.itemListFor(type)[editIdx];
      this.itemModal = { type, name: existing?.name || '', description: existing?.description || '', icon: existing?.icon ?? null, editIdx };
    } else {
      this.itemModal = { type, name: '', description: '', icon: null, editIdx: null };
    }
  }

  closeItemModal(){
    this.itemModal = { type: null, name: '', description: '', icon: null, editIdx: null };
  }

  selectModalIcon(name: string){
    this.itemModal.icon = this.itemModal.icon === name ? null : name;
  }

  saveItemModal(){
    const name = (this.itemModal.name || '').trim();
    if(!name || !this.itemModal.type) return;
    const description = (this.itemModal.description || '').trim();
    if(this.itemModal.type === 'benefit'){
      const entry = { name, description };
      if(this.itemModal.editIdx !== null){
        this.businessBenefits[this.itemModal.editIdx] = entry;
      } else {
        this.businessBenefits.push(entry);
      }
    } else {
      const list = this.itemModal.type === 'feature' ? this.keyFeatures : this.useCases;
      const entry = { name, description, icon: this.itemModal.icon };
      if(this.itemModal.editIdx !== null){
        list[this.itemModal.editIdx] = entry;
      } else {
        list.push(entry);
      }
    }
    this.closeItemModal();
  }

  removeItem(type: 'feature' | 'benefit' | 'usecase', idx: number){
    this.itemListFor(type).splice(idx, 1);
    this.openItemMenuIdx = null;
  }

  toggleItemMenu(type: string, idx: number, event: Event){
    event.stopPropagation();
    if(this.openItemMenuIdx && this.openItemMenuIdx.type === type && this.openItemMenuIdx.idx === idx){
      this.openItemMenuIdx = null;
    } else {
      this.openItemMenuIdx = { type, idx };
    }
  }

  isItemMenuOpen(type: string, idx: number){
    return this.openItemMenuIdx?.type === type && this.openItemMenuIdx.idx === idx;
  }

  onProductImageSelected(event: Event){
    const input = event.target as HTMLInputElement;
    if(input.files && input.files.length > 0){
      const file = input.files[0];
      this.productImage = { name: file.name, size: file.size };
      this.uploadingImage = true;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const dataUrl: string = e?.target?.result || '';
        this.productImageUrl = dataUrl;
        this.cdr.detectChanges();
        const base64 = (dataUrl.split(',')[1]) || '';
        const fileBody = {
          content: { name: uuidv4() + '_' + file.name, data: base64 },
          contentType: file.type,
          isPublic: true
        };
        this.attachmentService.uploadFile(fileBody).subscribe({
          next: (data: any) => {
            this.uploadingImage = false;
            console.log('[image upload] response:', data);
            const serverUrl = data?.content;
            const usableUrl = (typeof serverUrl === 'string' && serverUrl.length > 0)
              ? this.absoluteAssetUrl(serverUrl)
              : dataUrl;
            this.productImageRef = {
              name: 'Profile Picture',
              url: usableUrl,
              attachmentType: file.type
            };
            this.productImageUrl = dataUrl;
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            this.uploadingImage = false;
            console.error('Image upload failed', err);
            this.errorMessage = err?.status === 413
              ? 'File size too large! Must be under 3MB.'
              : (err?.error?.error ? 'Error: ' + err.error.error : 'There was an error while uploading the image!');
            this.showError = true;
            setTimeout(() => { this.showError = false; }, 3000);
            this.removeProductImage();
          }
        });
      };
      reader.readAsDataURL(file);
      input.value = '';
    }
  }

  removeProductImage(){
    this.productImage = null;
    this.productImageUrl = null;
    this.productImageRef = null;
  }

  onAttachmentSelected(event: Event){
    const input = event.target as HTMLInputElement;
    if(input.files && input.files.length > 0){
      const files = Array.from(input.files);
      input.value = '';
      files.forEach(file => {
        const placeholder: any = { name: file.name, size: file.size, _uploading: true };
        this.attachments.push(placeholder);
        this.uploadingAttachment = true;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const dataUrl: string = e?.target?.result || '';
          const base64 = (dataUrl.split(',')[1]) || '';
          const fileBody = {
            content: { name: uuidv4() + '_' + file.name, data: base64 },
            contentType: file.type,
            isPublic: true
          };
          this.attachmentService.uploadFile(fileBody).subscribe({
            next: (data: any) => {
              const serverUrl = data?.content;
              placeholder.url = (typeof serverUrl === 'string' && serverUrl.length > 0)
                ? this.absoluteAssetUrl(serverUrl)
                : dataUrl;
              placeholder.attachmentType = file.type;
              placeholder._uploading = false;
              this.uploadingAttachment = this.attachments.some(a => (a as any)._uploading);
              this.cdr.detectChanges();
            },
            error: (err: any) => {
              this.uploadingAttachment = this.attachments.some(a => (a as any)._uploading && a !== placeholder);
              console.error('Attachment upload failed', err);
              this.errorMessage = err?.status === 413
                ? 'File size too large! Must be under 3MB.'
                : (err?.error?.error ? 'Error: ' + err.error.error : 'There was an error while uploading the file!');
              this.showError = true;
              setTimeout(() => { this.showError = false; }, 3000);
              const idx = this.attachments.indexOf(placeholder);
              if (idx !== -1) this.attachments.splice(idx, 1);
            }
          });
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeAttachment(idx: number){
    this.attachments.splice(idx, 1);
  }

  selfAttestationFile: { name: string, size?: number, url?: string, _uploading?: boolean, id?: string } | null = null;
  complianceFiles: { name: string, size?: number, url?: string, _uploading?: boolean, id?: string, charName?: string }[] = [];
  private selfAttId: string | null = null;
  private complianceVCChar: any = null;

  showRequestValidationModal: boolean = false;
  selectedISOS: any[] = [];

  get selfAtt(): any {
    if (!this.selfAttestationFile?.url) return null;
    return { id: this.selfAttId, name: 'Compliance:SelfAtt', productSpecCharacteristicValue: [{ isDefault: true, value: this.selfAttestationFile.url }] };
  }

  get additionalISOS(): any[] {
    return this.complianceFiles.filter(f => f.url).map(f => ({ id: f.id, name: f.charName || ('Compliance:' + f.name), url: f.url }));
  }

  private buildComplianceChars(): any[] {
    const chars: any[] = [];
    if (this.selfAttestationFile?.url) {
      chars.push({
        id: this.selfAttId || `urn:ngsi-ld:characteristic:${uuidv4()}`,
        name: 'Compliance:SelfAtt',
        productSpecCharacteristicValue: [{ isDefault: true, value: this.selfAttestationFile.url }]
      });
    }
    this.complianceFiles.forEach(f => {
      if (f.url) {
        chars.push({
          id: f.id || `urn:ngsi-ld:characteristic:${uuidv4()}`,
          name: f.charName || `Compliance:${f.name}`,
          productSpecCharacteristicValue: [{ isDefault: true, value: f.url }]
        });
      }
    });
    if (this.complianceVCChar) chars.push(this.complianceVCChar);
    return chars;
  }

  private loadComplianceFromProd(){
    const chars: any[] = Array.isArray(this.prod?.productSpecCharacteristic) ? this.prod.productSpecCharacteristic : [];
    for (const char of chars) {
      const name = char?.name || '';
      const value = char?.productSpecCharacteristicValue?.[0]?.value;
      if (name === 'Compliance:SelfAtt') {
        this.selfAttId = char.id || null;
        if (value) this.selfAttestationFile = { name: this.fileNameFromValue(value), url: value, id: char.id };
      } else if (name === 'Compliance:VC') {
        this.complianceVCChar = JSON.parse(JSON.stringify(char));
      } else if (name.startsWith('Compliance:')) {
        this.complianceFiles.push({ name: this.fileNameFromValue(value), url: value, id: char.id, charName: name });
      }
    }
  }

  private fileNameFromValue(value: string): string {
    if (!value) return 'Self attestation';
    const last = value.split('/').pop() || value;
    let decoded = last;
    try { decoded = decodeURIComponent(last); } catch { }
    const underscore = decoded.indexOf('_');
    return underscore > -1 ? decoded.slice(underscore + 1) : decoded;
  }

  hasSelfAttestation(): boolean {
    return !!this.selfAttestationFile?.url;
  }

  downloadSelfAttestationTemplate(){
    const link = document.createElement('a');
    link.href = 'assets/documents/self-attestation-template.docx';
    link.download = 'self-attestation-template.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  requestValidation(){
    this.showRequestValidationModal = true;
  }

  closeRequestValidationModal(){
    this.showRequestValidationModal = false;
  }

  private uploadComplianceFile(file: File, onDone: (url: string) => void, onError: () => void){
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const dataUrl: string = e?.target?.result || '';
      const base64 = (dataUrl.split(',')[1]) || '';
      const fileBody = { content: { name: uuidv4() + '_' + file.name, data: base64 }, contentType: file.type, isPublic: true };
      this.attachmentService.uploadFile(fileBody).subscribe({
        next: (data: any) => {
          const serverUrl = data?.content;
          onDone((typeof serverUrl === 'string' && serverUrl.length > 0) ? serverUrl : dataUrl);
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Compliance upload failed', err);
          this.errorMessage = err?.status === 413
            ? 'File size too large! Must be under 3MB.'
            : (err?.error?.error ? 'Error: ' + err.error.error : 'There was an error while uploading the file!');
          this.showError = true;
          setTimeout(() => { this.showError = false; }, 3000);
          onError();
          this.cdr.detectChanges();
        }
      });
    };
    reader.readAsDataURL(file);
  }

  onSelfAttestationSelected(event: Event){
    const input = event.target as HTMLInputElement;
    if(input.files && input.files.length > 0){
      const file = input.files[0];
      const entry = { name: file.name, size: file.size, _uploading: true } as any;
      this.selfAttestationFile = entry;
      this.selfAttId = null;
      input.value = '';
      this.uploadComplianceFile(file,
        (url) => { entry.url = url; entry._uploading = false; },
        () => { this.selfAttestationFile = null; });
    }
  }

  removeSelfAttestation(){
    this.selfAttestationFile = null;
    this.selfAttId = null;
  }

  onComplianceFileSelected(event: Event){
    const input = event.target as HTMLInputElement;
    if(input.files && input.files.length > 0){
      Array.from(input.files).forEach(file => {
        const entry = { name: file.name, size: file.size, _uploading: true } as any;
        this.complianceFiles.push(entry);
        this.uploadComplianceFile(file,
          (url) => { entry.url = url; entry._uploading = false; },
          () => { const i = this.complianceFiles.indexOf(entry); if(i > -1) this.complianceFiles.splice(i, 1); });
      });
      input.value = '';
    }
  }

  removeComplianceFile(idx: number){
    this.complianceFiles.splice(idx, 1);
  }

  private readonly DETAILS_START = '<!--dome:details:start-->';
  private readonly DETAILS_END = '<!--dome:details:end-->';

  private composeDescription(): string {
    const overview = (this.generalForm.value.description ?? '').toString();
    const sections = this.serializeProductDetails();
    if (!sections) return overview;
    return `${overview}\n${this.DETAILS_START}\n${sections}\n${this.DETAILS_END}`;
  }

  private serializeProductDetails(): string {
    const parts: string[] = [];
    if (this.howItWorks?.trim()) {
      parts.push(`<section data-dome-section="how-it-works" data-text="${this.attr(this.howItWorks)}"><h3>How it works</h3><p>${this.esc(this.howItWorks)}</p></section>`);
    }
    parts.push(this.serializeItemSection('key-features', 'Key features', this.keyFeatures, true));
    parts.push(this.serializeItemSection('business-benefits', 'Business benefits', this.businessBenefits, false));
    parts.push(this.serializeItemSection('use-cases', 'Use cases', this.useCases, true));
    parts.push(this.serializeFaqs());
    return parts.filter(Boolean).join('\n');
  }

  private serializeFaqs(): string {
    if (!this.faqs || this.faqs.length === 0) return '';
    const lis = this.faqs.map(f =>
      `<li data-q="${this.attr(f.question)}" data-a="${this.attr(f.answer)}"><strong>${this.esc(f.question)}</strong><p>${this.esc(f.answer)}</p></li>`
    ).join('');
    return `<section data-dome-section="faqs"><h3>FAQs</h3><ul>${lis}</ul></section>`;
  }

  private serializeItemSection(key: string, title: string, items: any[], withIcon: boolean): string {
    if (!items || items.length === 0) return '';
    const lis = items.map(it => {
      const icon = withIcon && it.icon ? ` data-icon="${this.attr(it.icon)}"` : '';
      const desc = it.description ? `: ${this.esc(it.description)}` : '';
      return `<li data-name="${this.attr(it.name)}" data-desc="${this.attr(it.description || '')}"${icon}><strong>${this.esc(it.name)}</strong>${desc}</li>`;
    }).join('');
    return `<section data-dome-section="${key}"><h3>${this.esc(title)}</h3><ul>${lis}</ul></section>`;
  }

  private parseDescription(raw: string): string {
    const text = (raw ?? '').toString();
    const startIdx = text.indexOf(this.DETAILS_START);
    if (startIdx === -1) return text;
    const overview = text.slice(0, startIdx).replace(/\n+$/, '');
    const endIdx = text.indexOf(this.DETAILS_END);
    const inner = text.slice(startIdx + this.DETAILS_START.length, endIdx > -1 ? endIdx : undefined);
    try {
      const doc = new DOMParser().parseFromString(`<div>${inner}</div>`, 'text/html');
      const how = doc.querySelector('[data-dome-section="how-it-works"]');
      if (how) this.howItWorks = how.getAttribute('data-text') || how.querySelector('p')?.textContent || '';
      this.keyFeatures = this.parseItemSection(doc, 'key-features', true);
      this.businessBenefits = this.parseItemSection(doc, 'business-benefits', false);
      this.useCases = this.parseItemSection(doc, 'use-cases', true);
      const faqSection = doc.querySelector('[data-dome-section="faqs"]');
      if (faqSection) {
        this.faqs = Array.from(faqSection.querySelectorAll('li')).map(li => ({
          question: li.getAttribute('data-q') || '',
          answer: li.getAttribute('data-a') || '',
          expanded: false
        }));
      }
    } catch { }
    return overview;
  }

  private parseItemSection(doc: Document, key: string, withIcon: boolean): any[] {
    const section = doc.querySelector(`[data-dome-section="${key}"]`);
    if (!section) return [];
    return Array.from(section.querySelectorAll('li')).map(li => {
      const name = li.getAttribute('data-name') || li.querySelector('strong')?.textContent || '';
      const description = li.getAttribute('data-desc') || '';
      return withIcon ? { name, description, icon: li.getAttribute('data-icon') || null } : { name, description };
    });
  }

  private esc(s: string): string {
    return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private attr(s: string): string {
    return this.esc(s).replace(/"/g, '&quot;');
  }

  private absoluteAssetUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith('data:')) return url;
    const base = (environment.BASE_URL || '').replace(/\/+$/, '');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        const pageHost = typeof window !== 'undefined' ? window.location.host : '';
        if (base && parsed.host === pageHost) {
          return base + parsed.pathname + parsed.search;
        }
      } catch {}
      return url;
    }
    const path = url.startsWith('/') ? url : '/' + url;
    return base + path;
  }

  formatFileSize(bytes: number | undefined): string {
    if(bytes == null) return '';
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1024*1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024*1024)).toFixed(1) + ' MB';
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  goToStep(index: number) {
    if (index > this.currentStep) {
      const currentStepValid = this.validateCurrentStep();
      if (!currentStepValid) {
        return;
      }
    }

    this.currentStep = index;
    if(this.currentStep>this.highestStep){
      this.highestStep=this.currentStep
    }
    this.refreshChars();
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0:
        return this.generalForm?.valid || false;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    if (index === this.currentStep || index === 0) return true;
    return !!this.generalForm?.valid;
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }

  optionalSteps = [3, 4, 5, 6];

  isOptionalStep(index: number): boolean {
    return this.optionalSteps.includes(index);
  }

  completedStep(index: number): boolean {
    if (this.isOptionalStep(index)) return this.isEditMode || this.stepHasContent(index) || index < this.highestStep;
    switch (index) {
      case 0: return !!this.generalForm?.valid;
      default: return this.stepHasContent(index);
    }
  }

  private stepHasContent(index: number): boolean {
    switch (index) {
      case 1: return !!this.howItWorks?.trim() || this.keyFeatures.length > 0
        || this.businessBenefits.length > 0 || this.useCases.length > 0;
      case 2: return this.prodChars.length > 0;
      case 3: return this.linkedServiceSpecIds.length > 0;
      case 4: return this.linkedResourceSpecIds.length > 0;
      case 5: return this.faqs.length > 0;
      default: return false;
    }
  }

  stepHasWarning(index: number): boolean {
    if (this.completedStep(index)) return false;
    if (this.currentStep === index) return false;
    if (this.isOptionalStep(index)) return false;
    if (this.isEditMode) return true;
    return index < this.highestStep;
  }

  stepShowCheck(index: number): boolean {
    if (this.currentStep === index) return false;
    if (this.stepHasWarning(index)) return false;
    return this.completedStep(index);
  }

  stepCircleClasses(index: number): string {
    if (this.currentStep === index) return 'bg-primary-100 text-white';
    if (this.stepHasWarning(index)) return 'bg-amber-500 text-white';
    if (this.completedStep(index)) return 'text-white';
    return 'bg-white border-2 border-gray-300 text-gray-500';
  }

  stepCircleColor(index: number): string | null {
    if (this.stepShowCheck(index)) return '#339988';
    return null;
  }

  stepLabelClasses(index: number): string {
    if (this.currentStep === index) return 'text-primary-100';
    if (this.stepHasWarning(index)) return 'text-amber-700';
    if (this.completedStep(index)) return 'text-emerald-700';
    return 'text-gray-600';
  }

  async loadValidatedSpecs(){
    try {
      const services = await this.servSpecService.getServiceSpecByUser(0, ['Launched'], this.partyId, undefined);
      this.availableServiceSpecs = Array.isArray(services) ? services : [];
    } catch { this.availableServiceSpecs = []; }
    try {
      const resources = await this.resSpecService.getResourceSpecByUser(0, ['Launched'], this.partyId);
      this.availableResourceSpecs = Array.isArray(resources) ? resources : [];
    } catch { this.availableResourceSpecs = []; }
    this.cdr.detectChanges();
  }

  openServiceDropdown(event: Event){
    event.stopPropagation();
    this.serviceDropdownOpen = true;
    this.resourceDropdownOpen = false;
  }

  openResourceDropdown(event: Event){
    event.stopPropagation();
    this.resourceDropdownOpen = true;
    this.serviceDropdownOpen = false;
  }

  toggleLinkedService(id: string){
    const idx = this.linkedServiceSpecIds.indexOf(id);
    if(idx !== -1){ this.linkedServiceSpecIds.splice(idx, 1); }
    else { this.linkedServiceSpecIds.push(id); }
  }

  removeLinkedService(id: string){
    const idx = this.linkedServiceSpecIds.indexOf(id);
    if(idx !== -1){ this.linkedServiceSpecIds.splice(idx, 1); }
  }

  toggleLinkedResource(id: string){
    const idx = this.linkedResourceSpecIds.indexOf(id);
    if(idx !== -1){ this.linkedResourceSpecIds.splice(idx, 1); }
    else { this.linkedResourceSpecIds.push(id); }
  }

  removeLinkedResource(id: string){
    const idx = this.linkedResourceSpecIds.indexOf(id);
    if(idx !== -1){ this.linkedResourceSpecIds.splice(idx, 1); }
  }

  isServiceSelected(id: string){ return this.linkedServiceSpecIds.indexOf(id) !== -1; }
  isResourceSelected(id: string){ return this.linkedResourceSpecIds.indexOf(id) !== -1; }

  serviceSpecById(id: string){ return this.availableServiceSpecs.find(s => s.id === id); }
  resourceSpecById(id: string){ return this.availableResourceSpecs.find(r => r.id === id); }

  filteredServiceSpecs(){
    const q = (this.serviceSearch || '').toLowerCase();
    if(!q) return this.availableServiceSpecs;
    return this.availableServiceSpecs.filter(s => (s.name || '').toLowerCase().includes(q));
  }

  filteredResourceSpecs(){
    const q = (this.resourceSearch || '').toLowerCase();
    if(!q) return this.availableResourceSpecs;
    return this.availableResourceSpecs.filter(r => (r.name || '').toLowerCase().includes(q));
  }

  formatSpecDate(date: any): string {
    if(!date) return '';
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} - ${hh}:${mi}`;
  }

  openUsageModal(editIdx: number | null = null){
    if(editIdx !== null){
      const u = this.usageSpecs[editIdx];
      this.usageModal = {
        isOpen: true,
        editIdx,
        name: u?.name || '',
        description: u?.description || '',
        metrics: u?.metrics ? u.metrics.map(m => ({ ...m })) : [],
        metricFormOpen: false, metricName: '', metricDescription: '', metricEditIdx: null
      };
    } else {
      this.usageModal = { isOpen: true, editIdx: null, name: '', description: '', metrics: [], metricFormOpen: true, metricName: '', metricDescription: '', metricEditIdx: null };
    }
    this.usageMenuIdx = null;
  }

  closeUsageModal(){
    this.usageModal = { isOpen: false, editIdx: null, name: '', description: '', metrics: [], metricFormOpen: false, metricName: '', metricDescription: '', metricEditIdx: null };
  }

  startAddMetric(){
    this.usageModal.metricFormOpen = true;
    this.usageModal.metricName = '';
    this.usageModal.metricDescription = '';
    this.usageModal.metricEditIdx = null;
  }

  saveCurrentMetric(){
    const name = (this.usageModal.metricName || '').trim();
    if(!name) return;
    const entry = { name, description: (this.usageModal.metricDescription || '').trim() };
    if(this.usageModal.metricEditIdx !== null){
      this.usageModal.metrics[this.usageModal.metricEditIdx] = entry;
    } else {
      this.usageModal.metrics.push(entry);
    }
    this.usageModal.metricFormOpen = false;
    this.usageModal.metricName = '';
    this.usageModal.metricDescription = '';
    this.usageModal.metricEditIdx = null;
  }

  editMetric(idx: number){
    const m = this.usageModal.metrics[idx];
    this.usageModal.metricFormOpen = true;
    this.usageModal.metricName = m?.name || '';
    this.usageModal.metricDescription = m?.description || '';
    this.usageModal.metricEditIdx = idx;
    this.usageMetricMenuIdx = null;
  }

  removeMetric(idx: number){
    this.usageModal.metrics.splice(idx, 1);
    if(this.usageModal.metricEditIdx === idx){
      this.usageModal.metricFormOpen = false;
      this.usageModal.metricEditIdx = null;
    } else if(this.usageModal.metricEditIdx !== null && this.usageModal.metricEditIdx > idx){
      this.usageModal.metricEditIdx = this.usageModal.metricEditIdx - 1;
    }
    this.usageMetricMenuIdx = null;
  }

  toggleMetricMenu(idx: number, event: Event){
    event.stopPropagation();
    this.usageMetricMenuIdx = this.usageMetricMenuIdx === idx ? null : idx;
  }

  saveUsageSpec(){
    const name = (this.usageModal.name || '').trim();
    if(!name) return;
    const entry = {
      name,
      description: (this.usageModal.description || '').trim(),
      metrics: this.usageModal.metrics.map(m => ({ ...m }))
    };
    if(this.usageModal.editIdx !== null){
      this.usageSpecs[this.usageModal.editIdx] = entry;
    } else {
      this.usageSpecs.push(entry);
    }
    this.closeUsageModal();
  }

  removeUsageSpec(idx: number){
    this.usageSpecs.splice(idx, 1);
    this.usageMenuIdx = null;
  }

  toggleUsageMenu(idx: number, event: Event){
    event.stopPropagation();
    this.usageMenuIdx = this.usageMenuIdx === idx ? null : idx;
  }

  addFaq(){
    this.faqs.forEach(f => f.expanded = false);
    this.faqs.push({ question: '', answer: '', expanded: true });
  }

  removeFaq(idx: number){
    this.faqDeleteIdx = idx;
  }

  cancelDeleteFaq(){
    this.faqDeleteIdx = null;
  }

  confirmDeleteFaq(){
    if(this.faqDeleteIdx !== null){
      this.faqs.splice(this.faqDeleteIdx, 1);
    }
    this.faqDeleteIdx = null;
  }

  toggleFaq(idx: number){
    const wasExpanded = this.faqs[idx]?.expanded;
    this.faqs.forEach((f, i) => f.expanded = (i === idx ? !wasExpanded : false));
  }

  onFaqDragStart(event: DragEvent, idx: number){
    this.draggingFaqIdx = idx;
    if(event.dataTransfer){
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(idx));
    }
  }

  onFaqDragOver(event: DragEvent){
    event.preventDefault();
    if(event.dataTransfer){ event.dataTransfer.dropEffect = 'move'; }
  }

  onFaqDrop(event: DragEvent, targetIdx: number){
    event.preventDefault();
    const sourceIdx = this.draggingFaqIdx;
    this.draggingFaqIdx = null;
    if(sourceIdx === null || sourceIdx === targetIdx) return;
    const item = this.faqs.splice(sourceIdx, 1)[0];
    this.faqs.splice(targetIdx, 0, item);
  }

  onFaqDragEnd(){
    this.draggingFaqIdx = null;
  }
}
