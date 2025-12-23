import {Component, EventEmitter, OnInit, Output, ChangeDetectorRef, Input, OnDestroy} from '@angular/core';
import {Category} from "../../models/interfaces";
import {Subject} from "rxjs";
import {LocalStorageService} from "../../services/local-storage.service";
import {EventMessageService} from "../../services/event-message.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { initFlowbite } from 'flowbite';
import {faCircleCheck} from "@fortawesome/pro-solid-svg-icons";
import {faCircle} from "@fortawesome/pro-regular-svg-icons";
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'bae-categories-filter',
  templateUrl: './categories-filter.component.html',
  styleUrl: './categories-filter.component.css'
})
export class CategoriesFilterComponent implements OnInit, OnDestroy {

  classListFirst = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  classListLast  = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  classList      = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  
  classListFirstChecked = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-2 border-primary-50 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-primary-50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3';
  classListLastChecked  = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-2 border-primary-50 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-primary-50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3';
  classListChecked      = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-2 border-primary-50 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-primary-50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3';
    
  labelClass: string = "text-gray-500 bg-white border-2 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-primary-50 hover:text-gray-600 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-tertiary-100 dark:hover:bg-primary-50";
  categories: Category[] = [];
  checkedCategories: any[] = [];
  selected: Category[] = [];
  dismissSubject: Subject<any> = new Subject();
  catalog:any;
  cs: Category[] = [];
  @Output() selectedCategories = new EventEmitter<Category[]>();
  @Input() catalogId: any = undefined;

  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faCircle = faCircle;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef
    ) {
      this.categories = [];
      this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        const cat = ev.value as Category;      
        if(ev.type === 'AddedFilter' && !this.isCheckedCategory(cat)){
          this.checkedCategories.push(cat.id);
          this.cdr.detectChanges();
        } else if(ev.type === 'RemovedFilter' && this.isCheckedCategory(cat)){
          const index = this.checkedCategories.findIndex(item => item === cat.id);
          if (index !== -1) {
            this.checkedCategories.splice(index, 1);
            this.cdr.detectChanges();
          }
          console.log(this.isCheckedCategory(cat))
        }
      })
    }

  async ngOnInit() {
    this.selected = this.localStorage.getObject('selected_categories') as Category[] || [] ;
    for(let i=0; i<this.selected.length;i++){
      this.checkedCategories.push(this.selected[i].id)
    }
    console.log('selected categories')
    console.log(this.selected)
    if(this.catalogId!=undefined){
      this.api.getCatalog(this.catalogId).then(data => {
        if(data.category){
          for (let i=0; i<data.category.length; i++){
            this.api.getCategoryById(data.category[i].id).then(categoryInfo => {
              this.findChildrenByParent(categoryInfo);
            })
          }
          initFlowbite();
        } else {
          this.api.getLaunchedCategories().then(data => {
            for(let i=0; i < data.length; i++){
              this.findChildren(data[i],data)
            }
            this.cdr.detectChanges();
            initFlowbite();
          })           
        }
      })
    } else {
      await this.api.getLaunchedCategories().then(data => {
        for(let i=0; i < data.length; i++){
          this.findChildren(data[i],data)
        }
        this.cdr.detectChanges();
        initFlowbite();
      }) 
    }
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  findChildren(parent:any,data:any[]){
    let childs = data.filter((p => p.parentId === parent.id));
    parent["children"] = childs;
    if(parent.isRoot == true){
      this.categories.push(parent)
    } else {
      this.saveChildren(this.categories,parent)
    }
    if(childs.length != 0){
      for(let i=0; i < childs.length; i++){
        this.findChildren(childs[i],data)
      }
    }
  }

  findChildrenByParent(parent:any){
    let childs: any[] = []
    this.api.getCategoriesByParentId(parent.id).then(c => {
      childs=c;
      parent["children"] = childs;
      if(parent.isRoot == true){
        this.categories.push(parent)
      } else {
        this.saveChildren(this.categories,parent)
      }
      if(childs.length != 0){
        for(let i=0; i < childs.length; i++){
          this.findChildrenByParent(childs[i])
        }
      }
      initFlowbite();
    })

  }

  saveChildren(superCategories:any[],parent:any){
    for(let i=0; i < superCategories.length; i++){
      let children = superCategories[i].children;
      if (children != undefined){
        let check = children.find((element: { id: any; }) => element.id == parent.id) 
        if (check != undefined) {
          let idx = children.findIndex((element: { id: any; }) => element.id == parent.id)
          children[idx] = parent
          superCategories[i].children = children         
        }
        this.saveChildren(children,parent)
      }          
    }
  }

  notifyDismiss(cat: Category) {
    this.dismissSubject.next(cat);
    this.removeCategory(cat);
  }

  addCategory(cat: Category) {
    const index = this.selected.indexOf(cat, 0);
    if(index == -1) {
      this.selected.push(cat);
      this.checkedCategories.push(cat.id);
      this.selectedCategories.emit(this.selected);
      this.localStorage.setObject('selected_categories', this.selected);
      this.eventMessage.emitAddedFilter(cat);
    }
  }

  removeCategory(cat: Category) {
    const index = this.selected.indexOf(cat, 0);
    if(index > -1) {
      this.selected.splice(index,1);
      this.selectedCategories.emit(this.selected);
      this.localStorage.setObject('selected_categories', this.selected);
      this.eventMessage.emitRemovedFilter(cat);
      const checkId = this.checkedCategories.findIndex(item => item === cat.id);
      if (checkId !== -1) {
        this.checkedCategories.splice(checkId, 1);
      }
    }
  }
  
  isRoot(cat: Category,idx:any){
    const index = this.categories.indexOf(cat, 0);
    let children = this.categories[index].children;
    let accordion = document.getElementById("accordion-collapse");

    if (children != undefined && children.length >0) {
      console.log('Es padre')
      return children
    } else {
      return []
    }

  }

  onClick(cat:Category){
    if(!this.isCheckedCategory(cat)) {
      this.checkedCategories.push(cat.id);
      this.localStorage.addCategoryFilter(cat);
      this.eventMessage.emitAddedFilter(cat);
    } else {
      this.localStorage.removeCategoryFilter(cat);
      this.eventMessage.emitRemovedFilter(cat);
      const index = this.checkedCategories.findIndex(item => item === cat.id);
      if (index !== -1) {
        this.checkedCategories.splice(index, 1);
      }
    }
  }

  isCheckedCategory(cat:Category){
    const index = this.checkedCategories.findIndex(item => item === cat.id);
    if (index !== -1) {
      return true
    } else {
      return false
    }
  }

  isChildsChecked(childs:Category[]|undefined):boolean {
    let check = false
    if (childs != undefined){
        for(let i=0; i<childs.length;i++){
          if(this.isCheckedCategory(childs[i])){
            check = true            
            return check;
          } else {
            check = this.isChildsChecked(childs[i].children)
            if(check==true){
              return check;
            }
          }
        }      
    }
    return check
  }

  checkClasses(first:boolean,last:boolean,cat:Category){
    let categoryCheck=this.isChildsChecked(cat.children);
    if(first==true){
      if(categoryCheck){
        return this.classListFirstChecked
      } else {
        return this.classListFirst
      }
    } else if(last==true){
      if(categoryCheck){
        return this.classListLastChecked
      } else {
        return this.classListLast
      }
    } else {
      if(categoryCheck){
        return this.classListChecked
      } else {
        return this.classList
      }
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}