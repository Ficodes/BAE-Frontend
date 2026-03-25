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
import { environment } from 'src/environments/environment';
import availableFilters, { type Filter } from '../../data/availableFilters';

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

  // AI Search facets
  aiSearchEnabled = environment.AI_SEARCH_ENABLED;
  aiFacets: Record<string, Record<string | number, number>> = {};
  dynamicAiCategories: Category[] = [];
  configuredAiCategories: Category[] = [];

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
        } else if(ev.type === 'AiSearchFacets' && this.aiSearchEnabled){
          const facets = ev.value as Record<string, Record<string | number, number>>;
          this.aiFacets = facets || {};
          this.updateAiFacetCategories();
          this.cdr.detectChanges();
        } else if(ev.type === 'AiSearchCleared' && this.aiSearchEnabled){
          this.aiFacets = {};
          this.categories = [
            ...this.cloneCategories(this.dynamicAiCategories),
            ...this.cloneCategories(this.configuredAiCategories)
          ];
          initFlowbite();
          this.cdr.detectChanges();
        }
      })
    }

  async ngOnInit() {
    this.selected = this.localStorage.getObject('selected_categories') as Category[] || [] ;
    for(let i=0; i<this.selected.length;i++){
      this.checkedCategories.push(this.selected[i].id)
    }

    if (this.aiSearchEnabled) {
      await this.loadCatalogCategories();
      this.dynamicAiCategories = this.convertDynamicCategoriesToAiFilterCategories(this.categories);
      this.configuredAiCategories = this.convertFiltersToCategories(availableFilters);
      this.categories = [
        ...this.cloneCategories(this.dynamicAiCategories),
        ...this.cloneCategories(this.configuredAiCategories)
      ];
      this.cdr.detectChanges();
      initFlowbite();
      return;
    }

    await this.loadCatalogCategories();
    this.cdr.detectChanges();
    initFlowbite();
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

    if (children != undefined && children.length >0) {
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

  private updateAiFacetCategories(): void {
    const dynamicWithCounts = this.applyFacetCountsToDynamicCategories(this.dynamicAiCategories, this.aiFacets);
    const configuredWithCounts = this.applyFacetCountsToConfiguredCategories(this.configuredAiCategories, this.aiFacets);
    this.categories = [...dynamicWithCounts, ...configuredWithCounts];

    initFlowbite();
  }

  private applyFacetCountsToDynamicCategories(
    dynamicRoots: Category[],
    facets: Record<string, Record<string | number, number>>
  ): Category[] {
    return (dynamicRoots || []).map(root => {
      const rootFacetData = this.getFacetDataForDynamicRoot(root, facets);
      return this.applyDynamicCategoryCounts(root, rootFacetData, facets);
    });
  }

  private getFacetDataForDynamicRoot(
    root: Category,
    facets: Record<string, Record<string | number, number>>
  ): Record<string | number, number> {
    const candidates = [
      String(root.id || ''),
      this.toAiFacetKey(root.name || ''),
      String(root.name || '')
    ].filter(Boolean);

    for (const key of candidates) {
      if (facets?.[key]) {
        return facets[key];
      }
    }

    return {};
  }

  private applyDynamicCategoryCounts(
    category: Category,
    rootFacetData: Record<string | number, number>,
    facets: Record<string, Record<string | number, number>>
  ): Category {
    const children = (category.children || []).map(child => this.applyDynamicCategoryCounts(child, rootFacetData, facets));
    const count = this.resolveDynamicCategoryCount(category, rootFacetData, facets);

    return {
      ...category,
      count: typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : undefined,
      children
    };
  }

  private resolveDynamicCategoryCount(
    category: Category,
    rootFacetData: Record<string | number, number>,
    facets: Record<string, Record<string | number, number>>
  ): number | undefined {
    const localCount = this.readCountFromFacetMap(rootFacetData, category.name, category.id);
    if (Number.isFinite(localCount) && (localCount as number) > 0) {
      return localCount;
    }

    const selfFacetMap = facets?.[String(category.id || '')] || facets?.[String(category.name || '')];
    if (selfFacetMap && typeof selfFacetMap === 'object') {
      const selfFacetTotal = this.sumFacetCounts(selfFacetMap);
      if (selfFacetTotal > 0) {
        return selfFacetTotal;
      }
    }

    const globalCount = this.findGlobalFacetCount(category, facets);
    if (globalCount > 0) {
      return globalCount;
    }

    return undefined;
  }

  private readCountFromFacetMap(
    facetMap: Record<string | number, number> | undefined,
    categoryName?: string,
    categoryId?: string
  ): number | undefined {
    if (!facetMap) {
      return undefined;
    }

    const byName = categoryName !== undefined ? Number(facetMap[categoryName]) : NaN;
    if (Number.isFinite(byName) && byName > 0) {
      return byName;
    }

    const byId = categoryId !== undefined ? Number(facetMap[categoryId]) : NaN;
    if (Number.isFinite(byId) && byId > 0) {
      return byId;
    }

    return undefined;
  }

  private findGlobalFacetCount(
    category: Category,
    facets: Record<string, Record<string | number, number>>
  ): number {
    let total = 0;
    for (const facetMap of Object.values(facets || {})) {
      const count = this.readCountFromFacetMap(facetMap, category.name, category.id);
      if (count && count > 0) {
        total += count;
      }
    }
    return total;
  }

  private sumFacetCounts(facetMap: Record<string | number, number>): number {
    return Object.values(facetMap || {}).reduce((sum, value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue > 0 ? sum + numericValue : sum;
    }, 0);
  }

  private applyFacetCountsToConfiguredCategories(
    configuredRoots: Category[],
    facets: Record<string, Record<string | number, number>>
  ): Category[] {
    return (configuredRoots || []).map(root => {
      const facetKey = String(root.id || '');
      const facetData = facets?.[facetKey] || {};

      return {
        ...root,
        children: this.applyFacetCountsRecursively(root.children || [], facetData)
      };
    });
  }

  private applyFacetCountsRecursively(
    categories: Category[],
    facetData: Record<string | number, number>
  ): Category[] {
    return (categories || []).map(category => {
      const children = this.applyFacetCountsRecursively(category.children || [], facetData);
      const rawCount = facetData[category.name];
      const count = Number(rawCount);

      return {
        ...category,
        count: Number.isFinite(count) && count > 0 ? count : undefined,
        children
      };
    });
  }

  private cloneCategories(categories: Category[]): Category[] {
    return (categories || []).map(category => ({
      ...category,
      children: this.cloneCategories(category.children || [])
    }));
  }

  private convertDynamicCategoriesToAiFilterCategories(categories: Category[]): Category[] {
    return (categories || []).map(rootCategory => {
      const rootKey = this.toAiFacetKey(rootCategory.name || '');
      return this.convertDynamicCategoryNode(rootCategory, rootKey, true);
    });
  }

  private convertDynamicCategoryNode(category: Category, rootKey: string, isRoot: boolean): Category {
    const nodeId = isRoot ? rootKey : `${rootKey}::${category.name}`;

    return {
      ...category,
      id: nodeId,
      sanitizedId: isRoot
        ? this.sanitizeIdForCss(rootKey)
        : `${this.sanitizeIdForCss(rootKey)}-${this.sanitizeIdForCss(category.name || '')}`,
      children: (category.children || []).map(child => this.convertDynamicCategoryNode(child, rootKey, false))
    };
  }

  private async loadCatalogCategories(): Promise<void> {
    this.categories = [];
    const hasCatalogId = this.catalogId !== undefined && this.catalogId !== null && String(this.catalogId).trim() !== '';

    if (hasCatalogId) {
      const data = await this.api.getCatalog(this.catalogId).catch(() => null);
      const catalogCategoryRefs: any[] = Array.isArray(data?.category) ? data.category : [];
      if (catalogCategoryRefs.length > 0) {
        const rootTrees = await Promise.all(
          catalogCategoryRefs.map(async (categoryRef: any) => {
            if (!categoryRef?.id) {
              return null;
            }
            const rootCategory = await this.api.getCategoryById(categoryRef.id).catch(() => null);
            const parentId = rootCategory?.parentId ? String(rootCategory.parentId) : '';
            const isStrictRoot = !!rootCategory?.id && rootCategory.isRoot === true && !parentId;
            if (!isStrictRoot) {
              return null;
            }
            return this.loadCategorySubtree(rootCategory);
          })
        );
        this.categories = rootTrees.filter((root): root is Category => root !== null);
        return;
      }
    }

    const launched = await this.api.getLaunchedCategories();
    const launchedList = Array.isArray(launched) ? launched : [];
    for (const category of launchedList) {
      this.findChildren(category, launchedList);
    }
  }

  private async loadCategorySubtree(parent: any): Promise<Category> {
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

  private formatFacetName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private convertFiltersToCategories(filters: Filter[]): Category[] {
    return filters.map(filter => this.convertFilterToCategory(filter, true, filter.name));
  }

  private convertFilterToCategory(filter: Filter, isRoot: boolean = false, rootFilterName?: string): Category {
    const filterKey = rootFilterName || filter.name;
    const sanitizedId = this.sanitizeIdForCss(filter.name);

    return {
      id: isRoot ? filter.name : `${filterKey}::${filter.name}`,
      name: isRoot ? this.formatFacetName(filter.name) : filter.name,
      isRoot,
      children: (filter.children || []).map(child => this.convertFilterToCategory(child, false, filterKey)),
      sanitizedId: isRoot ? sanitizedId : `${this.sanitizeIdForCss(filterKey)}-${sanitizedId}`
    };
  }

  private sanitizeIdForCss(str: string): string {
    return str
      .replace(/\s+/g, '-') 
      .replace(/[()]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
  }

  private toAiFacetKey(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

}
