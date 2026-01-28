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
export class ProductOrderService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_ORDERING: String = environment.PRODUCT_ORDER;
  public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  postProductOrder(prod:any){
    //POST - El item va en el body de la petición
    let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder`;
    return this.http.post<any>(url, prod, { observe: 'response' });
  }

  getProductOrders(partyId:any,page:any,filters:any[],role:any){
    console.log('getProductOrders');
    let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder?limit=${ProductOrderService.ORDER_LIMIT}&offset=${page}&relatedParty.id=${partyId}&relatedParty.role=${role}`;

    //let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder?limit=${ProductOrderService.ORDER_LIMIT}&offset=${page}&relatedParty.id=${partyId}&relatedParty.role=Seller`;
    let status=''
    if(filters.length>0){
      for(let i=0; i < filters.length; i++){
        if(i==filters.length-1){
          status=status+filters[i]
        } else {
          status=status+filters[i]+','
        }
      }
      url=url+'&state='+status;
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }

  updateOrder(orderId:any, patchData:any){
    console.log('updatingOrder...');
    console.log(orderId);
    console.log(patchData);

    let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder/${orderId}`;
    return lastValueFrom(this.http.patch(url, patchData))
  }

}
