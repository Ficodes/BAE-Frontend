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
export class AccountServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_ACCOUNT: String = environment.ACCOUNT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getBillingAccount(){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return lastValueFrom(this.http.get<any[]>(url));
  }

  getBillingAccountById(id:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  postBillingAccount(item:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return this.http.post<any>(url, item);
  }

  updateBillingAccount(id:any,item:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.patch<any>(url, item);
  }

  deleteBillingAccount(id:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.delete<any>(url);
  }

  getUserInfo(partyId:any){
    let url = `${AccountServiceService.BASE_URL}/party/individual/${partyId}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  getOrgInfo(partyId:any){
    let url = `${AccountServiceService.BASE_URL}/party/organization/${partyId}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  getOrgList(){
    let url = `${AccountServiceService.BASE_URL}/party/organization`;
    return lastValueFrom(this.http.get<any[]>(url));
  }

  updateUserInfo(partyId:any,profile:any){
    let url = `${AccountServiceService.BASE_URL}/party/individual/${partyId}`;   
    return this.http.patch<any>(url, profile);
  }

  updateOrgInfo(partyId:any,profile:any){
    let url = `${AccountServiceService.BASE_URL}/party/organization/${partyId}`;   
    return this.http.patch<any>(url, profile);
  }
}
