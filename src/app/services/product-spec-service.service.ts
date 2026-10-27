import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ProductSpecServiceService {

  public static BASE_URL: String = environment.BASE_URL;
  public static API_PRODUCT_CATALOG: String = environment.PRODUCT_CATALOG;
  public static API_PRODUCT_SPEC: String = environment.PRODUCT_SPEC;
  public static PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;

  private readonly filteredPaginationHeader = 'X-Filtered-Pagination-Token';
  private filteredPaginationToken: string | null = null;
  private filteredPaginationQuery: string | null = null;
  private filteredPaginationGeneration = 0;
  private filteredPaginationExhausted = false;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getProdSpecByUser(page:any,status:any[],partyId:any,sort?:any,isBundle?:any, stopOnShortPage = false) {
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}?limit=${ProductSpecServiceService.PROD_SPEC_LIMIT}&offset=${page}&relatedParty.id=${partyId}`;    

    if(sort!=undefined){
      url=url+'&sort='+sort
    }
    if(isBundle!=undefined){
      url=url+'&isBundle='+isBundle
    }
    let lifeStatus=''
    if(status)
    if(status.length>0){
      for(let i=0; i < status.length; i++){
        if(i==status.length-1){
          lifeStatus=lifeStatus+status[i]
        } else {
          lifeStatus=lifeStatus+status[i]+','
        }    
      }
      url=url+'&lifecycleStatus='+lifeStatus;
    }

    // Only the seller Deleted tab opts into filtered cursor pagination.
    if (!stopOnShortPage) {
      return lastValueFrom(this.http.get<any>(url));
    }

    const query = JSON.stringify([String(partyId), status, sort, isBundle]);
    if (Number(page) === 0 || query !== this.filteredPaginationQuery) {
      this.resetFilteredPaginationToken();
      this.filteredPaginationQuery = query;
    }
    if (this.filteredPaginationExhausted) return Promise.resolve([]);

    const generation = this.filteredPaginationGeneration;
    const headers = this.filteredPaginationToken
      ? { [this.filteredPaginationHeader]: this.filteredPaginationToken }
      : undefined;

    return lastValueFrom(this.http.get<any[]>(url, { observe: 'response', headers })).then(response => {
      if (generation !== this.filteredPaginationGeneration) return [];

      const items = response.body ?? [];
      this.filteredPaginationExhausted = items.length < ProductSpecServiceService.PROD_SPEC_LIMIT;
      this.filteredPaginationToken = this.filteredPaginationExhausted
        ? null
        : response.headers.get(this.filteredPaginationHeader);
      return items;
    });
  }

  resetFilteredPaginationToken(): void {
    this.filteredPaginationToken = null;
    this.filteredPaginationQuery = null;
    this.filteredPaginationExhausted = false;
    this.filteredPaginationGeneration++;
  }

  getResSpecById(id:any){
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}/${id}`;
 
    return lastValueFrom(this.http.get<any>(url));
  }

  postProdSpec(body:any){
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}`;
    return this.http.post<any>(url, body);
  }

  updateProdSpec(body:any,id:any){
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}/${id}`;
    return this.http.patch<any>(url, body);
  }

  requestComplianceCertificate(productSpecification: any){
    let url = `${ProductSpecServiceService.BASE_URL}/compliance/certificate`;
    return this.http.post<any>(url, productSpecification);
  }
}
