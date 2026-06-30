import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';

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
export class CreateServiceSpecComponent implements OnInit, OnDestroy {

  @Input() serv: any = null;
  isEditMode: boolean = false;
  partyId: any = '';

  serviceToCreate: ServiceSpecification_Create | undefined;

  stepsElements: string[] = ['general-info', 'chars'];
  stepsCircles: string[] = ['general-circle', 'chars-circle'];
  currentStep = 0;
  highestStep = 0;
  steps = [
    'General info',
    'Configuration options'
  ];

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
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
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
  }

  ngOnDestroy() {
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

  finishAsDraft() {
    this.eventMessage.emitSpecCreated(this.isEditMode ? 'Service specification successfully updated' : 'Service specification successfully created');
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
        this.eventMessage.emitSpecCreated('Service specification successfully validated');
        this.showSuccessModal = false;
        this.eventMessage.emitSellerServiceSpec(true);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'There was an error while validating the service!';
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 3000);
      }
    });
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
    this.buildServiceToCreate();
    this.loading = true;
    if (this.isEditMode && this.createdServiceId) {
      const { relatedParty, lifecycleStatus, ...patchBody } = (this.serviceToCreate as any) || {};
      this.servSpecService.updateServSpec(patchBody, this.createdServiceId).subscribe({
        next: (data: any) => {
          this.loading = false;
          this.showSuccessModal = true;
        },
        error: error => {
          console.error('There was an error while updating!', error);
          this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'There was an error while updating the service!';
          this.loading = false;
          this.showError = true;
          setTimeout(() => { this.showError = false; }, 3000);
        }
      });
      return;
    }
    this.servSpecService.postServSpec(this.serviceToCreate).subscribe({
      next: (data: any) => {
        this.loading = false;
        this.createdServiceId = data?.id || null;
        this.showSuccessModal = true;
      },
      error: error => {
        console.error('There was an error while creating!', error);
        if (error.error.error) {
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while creating the service!';
        }
        this.loading = false;
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
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
      this.unselectMenu(document.getElementById(step), 'text-gray-500')
      for (let i = 0; i < this.stepsElements.length; i++) {
        this.unselectMenu(document.getElementById(this.stepsElements[i]), 'text-primary-100 dark:text-primary-50')
        this.selectMenu(document.getElementById(this.stepsElements[i]), 'text-gray-500')
      }
      this.stepsElements.push(step);
    }
    const circleIndex = this.stepsCircles.findIndex(item => item === stepCircle);
    if (index !== -1) {
      this.stepsCircles.splice(circleIndex, 1);
      this.selectMenu(document.getElementById(stepCircle), 'border-primary-100 dark:border-primary-50')
      this.unselectMenu(document.getElementById(stepCircle), 'border-gray-400');
      for (let i = 0; i < this.stepsCircles.length; i++) {
        this.unselectMenu(document.getElementById(this.stepsCircles[i]), 'border-primary-100 dark:border-primary-50')
        this.selectMenu(document.getElementById(this.stepsCircles[i]), 'border-gray-400');
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
    // Solo validar en modo creación
    if (index > this.currentStep) {
      // Validar el paso actual
      const currentStepValid = this.validateCurrentStep();
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
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    return (this.generalForm?.valid && (index <= this.currentStep)) || (this.generalForm?.valid && (index <= this.highestStep));
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }

}
