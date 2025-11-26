import { Component, OnInit, ChangeDetectorRef, HostListener, ElementRef, ViewChild, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as moment from 'moment';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import {components} from "src/app/models/product-catalog";
type Catalog_Update = components["schemas"]["Catalog_Update"];

@Component({
  selector: 'update-catalog',
  templateUrl: './update-catalog.component.html',
  styleUrl: './update-catalog.component.css'
})
export class UpdateCatalogComponent implements OnInit {
  @Input() cat: any;

  partyId:any='';

  catalogToUpdate: Catalog_Update | undefined;

  stepsElements:string[]=['general-info','summary'];
  stepsCircles:string[]=['general-circle','summary-circle'];

  //markdown variables:
  showPreview:boolean=false;
  showEmoji:boolean=false;
  description:string='';  

  //CONTROL VARIABLES:
  showGeneral:boolean=true;
  showSummary:boolean=false;
  //Check if step was done
  generalDone:boolean=false;

  //SERVICE GENERAL INFO:
  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('',Validators.maxLength(100000)),
  });
  catStatus:any='Active';

  errorMessage:any='';
  showError:boolean=false;
  loading:boolean=false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private elementRef: ElementRef,
    private api: ApiServiceService
  ) {
    this.eventMessage.messages$.subscribe(ev => {
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
  }

  ngOnInit() {
    this.initPartyInfo();
    this.populateCatInfo();
  }

  populateCatInfo(){
    //GENERAL INFORMATION
    this.generalForm.controls['name'].setValue(this.cat.name);
    this.generalForm.controls['description'].setValue(this.cat.description);
    this.catStatus=this.cat.lifecycleStatus;
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
    this.eventMessage.emitSellerCatalog(true);
  }

  toggleGeneral(){
    this.selectStep('general-info','general-circle');
    this.showGeneral=true;
    this.showSummary=false;
    this.showPreview=false;
  }

  setCatStatus(status:any){
    this.catStatus=status;
    this.cdr.detectChanges();
  }

  showFinish(){
    if(this.generalForm.value.name!=null){
      this.catalogToUpdate={
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: this.catStatus,
      }
      if(this.cat.name != this.generalForm.value.name){
        this.catalogToUpdate.name=this.generalForm.value.name;
      }
      console.log('CATALOG TO UPDATE:')
      console.log(this.catalogToUpdate)
      this.showGeneral=false;
      this.showSummary=true;
      this.selectStep('summary','summary-circle');
    }
    this.showPreview=false;
  }

  createCatalog(){
    this.loading=true;
    this.api.updateCatalog(this.catalogToUpdate,this.cat.id).subscribe({
      next: data => {
        this.loading=false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage='Error: '+error.error.error;
        } else {
          this.errorMessage='There was an error while updating the catalog!';
        }
        this.loading=false;
        this.showError=true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }

  //STEPS METHODS
  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  unselectMenu(elem:HTMLElement | null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        this.removeClass(elem,cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectMenu(elem:HTMLElement| null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        console.log('already selected')
      } else {
        this.addClass(elem,cls)
      }
    }
  }

  //STEPS CSS EFFECTS:
  selectStep(step:string,stepCircle:string){
    const index = this.stepsElements.findIndex(item => item === step);
    if (index !== -1) {
      this.stepsElements.splice(index, 1);
      this.selectMenu(document.getElementById(step),'text-primary-100 dark:text-primary-50')
      this.unselectMenu(document.getElementById(step),'text-gray-500') 
      for(let i=0; i<this.stepsElements.length;i++){
        this.unselectMenu(document.getElementById(this.stepsElements[i]),'text-primary-100 dark:text-primary-50')
        this.selectMenu(document.getElementById(this.stepsElements[i]),'text-gray-500') 
      }
      this.stepsElements.push(step);
    }
    const circleIndex = this.stepsCircles.findIndex(item => item === stepCircle);
    if (index !== -1) {
      this.stepsCircles.splice(circleIndex, 1);
      this.selectMenu(document.getElementById(stepCircle),'border-primary-100 dark:border-primary-50')
      this.unselectMenu(document.getElementById(stepCircle),'border-gray-400');
      for(let i=0; i<this.stepsCircles.length;i++){
        this.unselectMenu(document.getElementById(this.stepsCircles[i]),'border-primary-100 dark:border-primary-50')
        this.selectMenu(document.getElementById(this.stepsCircles[i]),'border-gray-400');
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

  addList(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n- First item\n- Second item'
    });    
  }

  addOrderedList(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n1. First item\n2. Second item'
    });    
  }

  addCode(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n`code`'
    });    
  }

  addCodeBlock(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n```\ncode\n```'
    }); 
  }

  addBlockquote(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n> blockquote'
    });    
  }

  addLink(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + ' [title](https://www.example.com) '
    });    
  } 

  addTable(){
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
    });
  }

  addEmoji(event:any){
    console.log(event)
    this.showEmoji=false;
    const currentText = this.generalForm.value.description;
    this.generalForm.patchValue({
      description: currentText + event.emoji.native
    });
  }

  togglePreview(){
    if(this.generalForm.value.description){
      this.description=this.generalForm.value.description;
    } else {
      this.description=''
    }  
  }

  hasLongWord(str: string | undefined | null, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }
}

