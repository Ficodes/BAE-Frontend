import {AfterViewInit, ChangeDetectorRef, Component, forwardRef, Input, OnInit} from '@angular/core';
import {DatePipe, NgClass, NgIf, NgTemplateOutlet} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {environment} from "../../../../../environments/environment";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {PaginationService} from "../../../../services/pagination.service";
import {ApiServiceService} from "../../../../services/product-service.service";
import {AppModule} from "../../../../app.module";
import {initFlowbite} from "flowbite";

@Component({
  selector: 'app-catalogue',
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
      useExisting: forwardRef(() => CatalogueComponent),
      multi: true
    }
  ],
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.css'
})

export class CatalogueComponent implements ControlValueAccessor, OnInit, AfterViewInit {
  @Input() partyId: any;

  //CATALOG INFO:
  CATALOG_LIMIT: number= environment.CATALOG_LIMIT;
  catalogPage=0;
  catalogPageCheck:boolean=false;
  loadingCatalog:boolean=false;
  loadingCatalog_more:boolean=false;
  selectedCatalog:any={id:''};
  catalogs:any[]=[];
  nextCatalogs:any[]=[];
  selectedCatalogInternal: any = null;
  
  constructor(
      private api: ApiServiceService,
      private paginationService: PaginationService,
      private cdr: ChangeDetectorRef) {
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(selectedCatalog: any): void {
    this.selectedCatalogInternal = selectedCatalog;
    this.onChange(selectedCatalog);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  async ngOnInit() {
    // Si hay valores iniciales en el formulario, los cargamos
    await this.getSellerCatalogs(false);
  }

  ngAfterViewInit() {
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  async getSellerCatalogs(next:boolean){
    if(next==false){
      this.loadingCatalog=true;
    }
    
    let options = {
      "keywords": undefined,
      "filters": ['Active','Launched'],
      "partyId": this.partyId
    }

    this.paginationService.getItemsPaginated(this.catalogPage, this.CATALOG_LIMIT, next, this.catalogs,this.nextCatalogs, options,
      this.api.getCatalogsByUser.bind(this.api)).then(data => {
      this.catalogPageCheck=data.page_check;      
      this.catalogs=data.items;
      this.nextCatalogs=data.nextItems;
      this.catalogPage=data.page;
      this.loadingCatalog=false;
      this.loadingCatalog_more=false;
    })
  }

  async nextCatalog(){
    await this.getSellerCatalogs(true);
  }

  selectCatalog(cat:any){
    this.selectedCatalog=cat;
  }

  isSelected(catalogId: string): boolean {
    return this.selectedCatalogInternal?.id === catalogId;
  }

  toggleSelection(cat: any): void {
    // Si el producto ya está seleccionado, lo deseleccionamos. Si no, lo seleccionamos.
    this.selectedCatalogInternal = this.selectedCatalogInternal?.id === cat.id ? null : cat;
    this.onChange(this.selectedCatalogInternal);
    this.onTouched();
  }

  getRowClass(catId: string): string {
    return catId === this.selectedCatalogInternal?.id
      ? "bg-white dark:bg-secondary-100"
      : "bg-white dark:bg-secondary-300";
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
