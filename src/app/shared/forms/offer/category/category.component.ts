import {AfterViewInit, ChangeDetectorRef, Component, forwardRef, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {DatePipe, NgClass, NgIf, NgTemplateOutlet} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {environment} from "../../../../../environments/environment";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {PaginationService} from "../../../../services/pagination.service";
import {ApiServiceService} from "../../../../services/product-service.service";
import {AppModule} from "../../../../app.module";
import {initFlowbite} from "flowbite";
import {FormChangeState} from "../../../../models/interfaces";

interface Category {
  id: string;
  name: string;
  parentId?: string;
  isRoot: boolean;
  expanded?: boolean;
  childrenLoaded?: boolean;
  children?: Category[];
}

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf,
    NgTemplateOutlet,
    NgClass
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategoryComponent),
      multi: true
    }
  ],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy {
  @Input() formType!: string;
  @Input() data: any;
  @Input() partyId: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  //CATEGORIES
  loadingCategory:boolean=false;
  selectedCategories: Category[] = [];
  unformattedCategories:Category[]=[];
  categories:Category[]=[];

  private originalValue: Category[] = [];
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;

  constructor(private api: ApiServiceService,
              private cdr: ChangeDetectorRef) {
    console.log('🔄 Initializing CategoryComponent');
  }

  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  async ngOnInit() {
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';
    // Si hay valores iniciales en el formulario, los cargamos
    await this.getCategories();
  }

  writeValue(categories: Category[]): void {
    console.log('📝 Writing value to form:', categories);
    this.selectedCategories = categories || [];
    // Store original value only in edit mode
    if (this.isEditMode && categories) {
      this.originalValue = JSON.parse(JSON.stringify(categories));
      console.log('📝 Original value stored:', this.originalValue);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  isCategorySelected(category: Category): boolean {
    return this.selectedCategories.some(cat => cat.id === category.id);
  }

  async getCategories() {
    console.log('Obteniendo categorías...');
    this.loadingCategory = true;
    this.categories = []; // Asegurar que siempre es un array

    try {
      const data = await this.api.getDefaultCategories();

      if (!Array.isArray(data) || data.length === 0) {
        console.error('No hay categorías disponibles.');
        this.loadingCategory = false;
        return;
      }

      console.log('Datos recibidos:', data);

      // Filtrar solo las categorías raíz
      this.categories = data
        .filter(category => category.isRoot)
        .map(category => ({
          ...category,
          expanded: false,
          childrenLoaded: false,
          children: []
        }));

      console.log('Categorías raíz:', this.categories);

      this.loadingCategory = false;
      setTimeout(() => this.cdr.detectChanges(), 0); // Forzar actualización de la vista

    } catch (error) {
      console.error('Error al obtener categorías:', error);
      this.loadingCategory = false;
    }
  }

  async loadChildren(category: Category) {
    if (!category) return;

    if (category.childrenLoaded) {
      category.expanded = !category.expanded;
      return;
    }

    try {
      console.log(`Cargando hijos de ${category.name}...`);
      const children = await this.api.getCategoriesByParentId(category.id);

      category.children = children.map(child => ({
        ...child,
        expanded: false,
        childrenLoaded: false,
        children: []
      }));

      category.childrenLoaded = true;
      category.expanded = true;

      setTimeout(() => this.cdr.detectChanges(), 0);

    } catch (error) {
      console.error(`Error al cargar hijos de ${category.name}:`, error);
    }
  }

  manageCategory(category: Category): void {
    if (!category) return;

    const index = this.selectedCategories.findIndex(cat => cat.id === category.id);

    if (index > -1) {
      this.selectedCategories.splice(index, 1);
      this.removeChildren(category);
    } else {
      this.selectedCategories.push(category);
      this.addParent(category.parentId);
    }

    if (this.isEditMode) {
      this.hasBeenModified = true;
    }
    this.onChange([...this.selectedCategories]);
    this.onTouched();
    const currentValue = [...this.selectedCategories];
    const dirtyFields = this.getDirtyFields(currentValue);
    const changeState: FormChangeState = {
      subformType: 'category',
      isDirty: true,
      dirtyFields,
      originalValue: this.originalValue,
      currentValue
    };

    console.log('🚀 Emitting final change state:', changeState);
    this.formChange.emit(changeState);
  }

  removeChildren(category: Category): void {
    if (!category.children || category.children.length === 0) return;

    for (let child of category.children) {
      const index = this.selectedCategories.findIndex(cat => cat.id === child.id);
      if (index > -1) {
        this.selectedCategories.splice(index, 1);
      }
      this.removeChildren(child);
    }
  }

  addParent(parentId: string | undefined): void {
    if (!parentId) return;

    const parent = this.findCategoryById(parentId, this.categories);

    if (parent) {
      const alreadySelected = this.selectedCategories.find(item => item.id === parent.id);

      if (!alreadySelected) {
        this.selectedCategories.push(parent);
        this.addParent(parent.parentId);
      }
    }
  }

  findCategoryById(categoryId: string, categories: Category[]): Category | null {
    for (let category of categories) {
      if (category.id === categoryId) return category;
      if (category.children && category.children.length > 0) {
        const found = this.findCategoryById(categoryId, category.children);
        if (found) return found;
      }
    }
    return null;
  }

  async toggleCategory(category: Category) {
    if (!category) return;

    if (!category.childrenLoaded) {
      await this.loadChildren(category);
    } else {
      category.expanded = !category.expanded;
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  ngOnDestroy() {
    console.log('🗑️ Destroying CategoryComponent');
    
    // Solo emitir cambios si estamos en modo edición y hay cambios reales
    if (this.isEditMode && this.hasBeenModified) {
      const currentValue = [...this.selectedCategories];
      const dirtyFields = this.getDirtyFields(currentValue);
      
      if (dirtyFields.length > 0) {
        const changeState: FormChangeState = {
          subformType: 'category',
          isDirty: true,
          dirtyFields,
          originalValue: this.originalValue,
          currentValue
        };

        console.log('🚀 Emitting final change state:', changeState);
        this.formChange.emit(changeState);
      } else {
        console.log('📝 No real changes detected, skipping emission');
      }
    } else if (!this.isEditMode) {
      console.log('📝 Not in edit mode, skipping change detection');
    }
  }

  private getDirtyFields(currentValue: Category[]): string[] {
    const dirtyFields: string[] = [];
    
    // Comparar arrays de categorías
    if (JSON.stringify(currentValue) !== JSON.stringify(this.originalValue)) {
      dirtyFields.push('selectedCategories');
    }
    
    return dirtyFields;
  }

  protected readonly JSON = JSON;
}
