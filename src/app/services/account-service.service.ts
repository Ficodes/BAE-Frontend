import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

  private buildTargetOptions(target?: string) {
    return target ? { params: new HttpParams().set('target', target) } : {};
  }

  getBillingAccount(target?: string){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return lastValueFrom(this.http.get<any[]>(url, this.buildTargetOptions(target)));
  }

  getBillingAccountById(id:any, target?: string){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return lastValueFrom(this.http.get<any>(url, this.buildTargetOptions(target)));
  }

  postBillingAccount(item:any, target?: string){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return this.http.post<any>(url, item, this.buildTargetOptions(target));
  }

  updateBillingAccount(id:any,item:any, target?: string){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.patch<any>(url, item, this.buildTargetOptions(target));
  }

  deleteBillingAccount(id:any, target?: string){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.delete<any>(url, this.buildTargetOptions(target));
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
