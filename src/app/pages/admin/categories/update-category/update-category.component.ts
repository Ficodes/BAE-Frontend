import { Component, OnInit, ChangeDetectorRef, HostListener, ElementRef, ViewChild, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {components} from "src/app/models/product-catalog";
type Category_Update = components["schemas"]["Category_Update"];

@Component({
  selector: 'update-category',
  templateUrl: './update-category.component.html',
  styleUrl: './update-category.component.css'
})
export class UpdateCategoryComponent implements OnInit, OnDestroy {
  @Input() category: any;

  partyId:any='';
  categoryToUpdate:Category_Update | undefined;

  categories:any[]=[];
  unformattedCategories:any[]=[];

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
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
  });
  isParent:boolean=true;
  parentSelectionCheck:boolean=false;
  checkDisableParent:boolean=false;
  selectedCategory:any=undefined;
  selected:any[];
  loading: boolean = false;

  catStatus:any='Active';

  errorMessage:any='';
  showError:boolean=false;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private elementRef: ElementRef,
    private api: ApiServiceService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
      if(ev.type === 'CategoryAdded') {
        this.addCategory(ev.value);
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
  }

  ngOnDestroy(){
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
    void this.getCategories();
    this.populateCatInfo();
  }


  populateCatInfo(){
    //GENERAL INFORMATION
    this.generalForm.controls['name'].setValue(this.category.name);
    this.generalForm.controls['description'].setValue(this.category.description);
    this.catStatus=this.category.lifecycleStatus;
    if(this.category.isRoot==false){
      this.isParent=false;
      this.parentSelectionCheck=true;
      this.checkDisableParent=true;
    } else {
      this.isParent=true;
      this.parentSelectionCheck=false;
    }
  }

  goBack() {
    this.eventMessage.emitAdminCategories(true);
  }

  async getCategories(){
    console.log('Getting categories...')
    this.loading = true;
    this.categories = [];
    this.unformattedCategories = [];

    const rootCategories = await this.api.getDefaultCategories().catch(() => []);
    const roots = Array.isArray(rootCategories) ? rootCategories : [];

    this.unformattedCategories = [...roots];
    const categoryTrees = await Promise.all(
      roots.map((root: any) => this.loadCategorySubtree(root))
    );

    this.categories = this.removeCategoryFromTree(
      categoryTrees.filter(Boolean),
      this.category?.id
    );
    this.loading=false;

    if(this.category.isRoot==false){
      const parentCategory = this.findCategoryById(this.categories, this.category.parentId);
      if (parentCategory) {
        this.selectedCategory = parentCategory;
        this.selected = [parentCategory];
      }
    }
    this.cdr.detectChanges();
    initFlowbite();
  }

  private async loadCategorySubtree(parent:any): Promise<any> {
    const children = await this.api.getCategoriesByParentId(parent.id).catch(() => []);
    const childList = Array.isArray(children) ? children : [];
    const resolvedChildren = await Promise.all(
      childList.map((child: any) => this.loadCategorySubtree(child))
    );

    return {
      ...parent,
      children: resolvedChildren
    };
  }

  private findCategoryById(categories: any[], categoryId: string): any | undefined {
    for (const category of categories || []) {
      if (category?.id === categoryId) {
        return category;
      }
      const foundInChildren = this.findCategoryById(category?.children || [], categoryId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
    return undefined;
  }

  private removeCategoryFromTree(categories: any[], categoryId: string): any[] {
    if (!categoryId) {
      return categories || [];
    }

    return (categories || [])
      .filter((category) => category?.id !== categoryId)
      .map((category) => ({
        ...category,
        children: this.removeCategoryFromTree(category?.children || [], categoryId)
      }));
  }

  toggleGeneral() {
    this.selectStep('general-info','general-circle');
    this.showGeneral=true;
    this.showSummary=false;
    this.showPreview=false;
  }

  toggleParent(){
    this.isParent=!this.isParent;
    this.parentSelectionCheck=!this.parentSelectionCheck;
    this.cdr.detectChanges();
  }


  addCategory(cat:any){
    if(this.selectedCategory==undefined){
      this.selectedCategory=cat;
      this.selected=[];
      this.selected.push(cat);
    } else {
      const index = this.selected.findIndex(item => item.id === cat.id);
      if (index !== -1) {
        this.selected=[];
        this.selectedCategory=undefined;
      } else {
        this.selectedCategory=cat;
        this.selected=[];
        this.selected.push(cat);
      }
    }

    this.cdr.detectChanges();
  }

  isCategorySelected(cat:any){
    if(this.selectedCategory==undefined){
      return false;
    } else {
      if(cat.id==this.selectedCategory.id){
        return true
      } else {
        return false
      }
    }
  }

  showFinish(){
    if(this.generalForm.value.name!=null){
      this.categoryToUpdate={
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: this.catStatus,
        isRoot: this.isParent
      }
      if(this.isParent==false){
        this.categoryToUpdate.parentId=this.selectedCategory.id;
      }
      console.log(this.isParent)
      console.log('CATEGORY TO UPDATE:')
      console.log(this.categoryToUpdate)
      this.showGeneral=false;
      this.showSummary=true;
      this.selectStep('summary','summary-circle');
    }
    this.showPreview=false;
  }

  updateCategory(){
    this.api.updateCategory(this.categoryToUpdate,this.category.id).subscribe({
      next: data => {
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage='Error: '+error.error.error;
        } else {
          this.errorMessage='There was an error while creating the category!';
        }
        this.showError=true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }

  setCatStatus(status:any){
    this.catStatus=status;
    this.cdr.detectChanges();
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
}
