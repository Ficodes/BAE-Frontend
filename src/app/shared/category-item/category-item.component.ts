import {Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef} from '@angular/core';
import {faCircleCheck} from "@fortawesome/pro-solid-svg-icons";
import {faCircle} from "@fortawesome/pro-regular-svg-icons";
import {Category} from "../../models/interfaces";
import {Subject} from "rxjs";
import {EventMessageService} from "../../services/event-message.service";
import {LocalStorageService} from "../../services/local-storage.service";

@Component({
  selector: 'bae-category-item',
  templateUrl: './category-item.component.html',
  styleUrl: './category-item.component.css'
})
export class CategoryItemComponent implements OnInit {

  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faCircle = faCircle;
  checked: boolean = false;
  option: String | undefined;
  checkedCategories: any[] = [];
  simplifiedId:any;
  labelClass: string = "inline-flex items-center justify-between w-full px-5 py-3 text-gray-500 bg-white border-2 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-primary-50 hover:text-gray-600 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-tertiary-100 dark:hover:bg-primary-50";
  labelClassParentFirst: string = "flex items-center justify-between w-full px-5 py-3 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3 peer-checked:border-primary-50 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600";
  labelClassParentLast: string = "flex items-center justify-between w-full px-5 py-3 font-medium rtl:text-right text-gray-500 border border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3 peer-checked:border-primary-50 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600";
  labelClassParent: string = "flex items-center justify-between w-full px-5 py-3 font-medium rtl:text-right text-gray-500 border-t border-r border-l border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3 peer-checked:border peer-checked:border-primary-50 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600";

  classListFirst = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  classListLast  = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  classList      = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  
  classListFirstChecked = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-2 border-primary-50 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-primary-50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  classListLastChecked  = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-2 border-primary-50 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-primary-50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';
  classListChecked      = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-2 border-primary-50 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-primary-50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tertiary-100 gap-3';

  @Input() data: Category | undefined;
  @Input() isParent = false;
  @Input() isFirst = false;
  @Input() isLast = false;

  constructor(private localStorage: LocalStorageService, private eventMessage: EventMessageService, private cdr: ChangeDetectorRef) {
    this.eventMessage.messages$.subscribe(ev => {
      const cat = ev.value as Category;      
      if(ev.type === 'AddedFilter' && cat?.id === this.data?.id) {
          this.checked = true;
      } else if(ev.type === 'RemovedFilter' && cat?.id === this.data?.id) {
        this.checked = false;
      }
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

  ngOnInit() {
    //console.log(this.data)
    //console.log(this.isParent)
    if(this.data?.id){
      this.simplifiedId=this.data.id.split(':').pop()
    }
    
    const categories = this.localStorage.getObject('selected_categories') as Category[] || [] ;
    if(categories.length >0){
      const index = categories.findIndex((item:Category) => item.id === this.data?.id);
      if(index > -1) {
        this.checked = true;
      }
    }
    this.option = this.data?.id;
    if(this.isParent && this.isFirst)
      this.labelClass = 'flex items-center justify-between w-full px-5 py-3 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3 peer-checked:border-primary-50 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600';
    else if(this.isParent && this.isLast)
      this.labelClass = 'flex items-center justify-between w-full px-5 py-3 font-medium rtl:text-right text-gray-500 border border-gray-200 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3 peer-checked:border-primary-50 dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-gray-600';
  }

  onClick(checked:boolean){
    if(!checked) {
      this.checkedCategories.push((this.data as Category).id);
      this.localStorage.addCategoryFilter(this.data as Category);
      this.eventMessage.emitAddedFilter(this.data as Category);
    } else {
      this.localStorage.removeCategoryFilter(this.data as Category);
      this.eventMessage.emitRemovedFilter(this.data as Category);
      const index = this.checkedCategories.findIndex(item => item === (this.data as Category).id);
      if (index !== -1) {
        this.checkedCategories.splice(index, 1);
      } 
    }
    this.checked = !this.checked;    
  }

  onClickCategory(cat:Category){
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