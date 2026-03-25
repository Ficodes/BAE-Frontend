import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
type Category = components["schemas"]["Category"];
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import {EventMessageService} from "src/app/services/event-message.service";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'admin-categories',
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnDestroy {
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  searchField = new FormControl();
  categories:any[]=[];
  unformattedCategories:any[]=[];
  page:number=0;
  CATEGOY_LIMIT: number = environment.CATEGORY_LIMIT;
  loading: boolean = false;
  partyId:any;
  status:any[]=['Active','Launched'];
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initCatalogs();
      }
    })
  }

  ngOnInit() {
    this.initCatalogs();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initCatalogs(){
    this.loading=true;
    this.categories=[];
    this.unformattedCategories=[];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(aux.logged_as==aux.id){
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    void this.getCategories();
    initFlowbite();
  }

  createCategory(){
    this.eventMessage.emitCreateCategory(true);
  }

  goToUpdate(cat:any){
    this.eventMessage.emitUpdateCategory(cat);
  }

  async getCategories(){
    /*this.api.getCatalog(this.selectedCatalog.id).then(data => {
      if(data.category){
        for (let i=0; i<data.category.length; i++){
          this.api.getCategoryById(data.category[i].id).then(categoryInfo => {
            this.findChildrenByParent(categoryInfo);
          })
        }
        initFlowbite();
      } else {
        this.api.getCategories().then(data => {
          for(let i=0; i < data.length; i++){
            this.findChildren(data[i],data)
          }
          this.cdr.detectChanges();
          initFlowbite();
        })           
      }
    })*/
    console.log('Getting categories...')
    const rootCategories = await this.api.getDefaultCategories().catch(() => []);
    const roots = Array.isArray(rootCategories) ? rootCategories : [];

    this.unformattedCategories = [...roots];
    const categoryTrees = await Promise.all(
      roots.map((root: any) => this.loadCategorySubtree(root))
    );

    this.categories = categoryTrees.filter((cat): cat is Category => !!cat);
    this.loading=false;
    this.cdr.detectChanges();
    initFlowbite();
  }

  private async loadCategorySubtree(parent:any): Promise<Category> {
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

  /*addParent(parentId:any){    
    const index = this.unformattedCategories.findIndex(item => item.id === parentId);
    if (index != -1) {
      //Si el padre no está seleccionado se añade a la selección      
      if(this.unformattedCategories[index].isRoot==false){
        this.addCategory(this.unformattedCategories[index])
      } else {
        this.selectedCategories.push(this.unformattedCategories[index]);
      }
    }
  }*/

  onStateFilterChange(filter:string){
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.status)
    } else {
      console.log('añade filtro')
      console.log(this.status)
      this.status.push(filter)
    }
    this.loading=true;
    this.categories=[];
    this.unformattedCategories=[];
    void this.getCategories();
    console.log('filter')
  }

}
