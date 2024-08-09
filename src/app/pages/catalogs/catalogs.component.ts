import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
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
  loading: boolean = false;
  loading_more: boolean = false;
  page_check:boolean = true;
  filter:any=undefined;
  searchField = new FormControl();
  
  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private paginationService: PaginationService
  ) {
  }

  ngOnInit() {
    this.loading=true;
    this.getCatalogs(false);
    let input = document.querySelector('[type=search]')
    if(input!=undefined){
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if(this.searchField.value==''){
          this.filter=undefined;
          this.getCatalogs(false);
        }
      });
    }

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
      this.catalogs=data.items;
      this.nextCatalogs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  filterCatalogs(){
    this.filter=this.searchField.value;
    this.page=0;
    this.getCatalogs(false);
  }

  goToCatalogSearch(id:any) {
    this.router.navigate(['/search/catalogue', id]);
  }

  async next(){
    await this.getCatalogs(true);
  }

}
