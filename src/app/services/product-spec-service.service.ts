import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ProductSpecServiceService {

  public static BASE_URL: String = environment.BASE_URL;
  public static API_PRODUCT_CATALOG: String = environment.PRODUCT_CATALOG;
  public static API_PRODUCT_SPEC: String = environment.PRODUCT_SPEC;
  public static PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getProdSpecByUser(page:any,status:any[],partyId:any,sort?:any,isBundle?:any) {
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

    return lastValueFrom(this.http.get<any>(url));
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
}
