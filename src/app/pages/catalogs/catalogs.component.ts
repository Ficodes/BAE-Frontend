import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import {faEye} from "@fortawesome/pro-regular-svg-icons";
import { Router } from '@angular/router';
import {components} from "../../models/product-catalog";
type Catalog = components["schemas"]["Catalog"];
import { environment } from 'src/environments/environment';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-catalogs',
  templateUrl: './catalogs.component.html',
  styleUrl: './catalogs.component.css'
})
export class CatalogsComponent implements OnInit{
  catalogs:Catalog[]=[];
  nextCatalogs:Catalog[]=[];
  page:number=0;
  CATALOG_LIMIT: number = environment.CATALOG_LIMIT;
  searchEnabled: boolean = environment.SEARCH_ENABLED;
  federationEnabled: boolean = environment.FEDERATION_ENABLED;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  filter:any=undefined;
  searchField = new FormControl();
  protected readonly faEye = faEye;
  showDesc:boolean=false;
  showingCat:any;
  
  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private paginationService: PaginationService
  ) {
  }

  @HostListener('document:click')
  onClick() {
    if(this.showDesc==true){
      this.showDesc=false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.loading=true;
    this.getCatalogs(false);
  }

  async getCatalogs(next:boolean){
    if(next==false){
      this.loading=true;
    }    

    let options = {
      "keywords": this.filter
    }
    this.paginationService.getItemsPaginated(this.page,this.CATALOG_LIMIT,next,this.catalogs,this.nextCatalogs, options,
      this.api.getCatalogs.bind(this.api)).then(data => {
      this.page_check=data.page_check;      
      this.catalogs=data.items.filter((catalog:Catalog) => (catalog.id !== environment.DFT_CATALOG_ID)
      );
      this.nextCatalogs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  filterCatalogs(event?: Event){
    event?.preventDefault();
    this.filter=this.searchField.value || undefined;
    this.page=0;
    this.getCatalogs(false);
  }

  onSearchInput() {
    if(this.searchField.value==''){
      this.filter=undefined;
      this.page=0;
      this.getCatalogs(false);
    }
  }

  onSearchEnter(event: Event){
    this.filterCatalogs(event);
  }

  goToCatalogSearch(id:any) {
    this.router.navigate(['/search/catalogue', id]);
  }

  async next(){
    await this.getCatalogs(true);
  }

  showFullDesc(cat:any){
    this.showDesc=true;
    this.showingCat=cat;
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
