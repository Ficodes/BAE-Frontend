import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {catchError, lastValueFrom, map, of} from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class UsageServiceService {

  public static BASE_URL: String = environment.BASE_URL;
  public static USAGE_SPEC_LIMIT: number = environment.USAGE_SPEC_LIMIT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getUsageSpec(id:any) {

    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getUsageSpecs(page:any, status:any[], partyId:any) {
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=${page}&relatedParty.id=${partyId}`;

    let lifeStatus = '';
    if(status.length > 0){
      for(let i=0; i < status.length; i++){
        if(i == status.length - 1){
          lifeStatus = lifeStatus + status[i]
        } else {
          lifeStatus = lifeStatus + status[i] + ','
        }
      }
      url = url + '&lifecycleStatus=' + lifeStatus;
    }

    return lastValueFrom(this.http.get<any[]>(url));
  }

  async getUsageSpecsByStatus(status:any[], partyId:any) {
    const usageSpecs:any[] = [];
    let offset = 0;
    const limit = Number(UsageServiceService.USAGE_SPEC_LIMIT);

    while (true) {
      const page = await this.getUsageSpecs(offset, status, partyId);
      const items = Array.isArray(page) ? page : [];

      usageSpecs.push(...items);

      if (items.length < limit) {
        break;
      }

      offset += limit;
    }

    return usageSpecs;
  }

  getAllUsageSpecs(partyId:any) {

    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification?relatedParty.id=${partyId}`;

    return lastValueFrom(this.http.get<any[]>(url));
  }


  postUsageSpec(usageSpec:any){
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification`;

    return this.http.post<any>(url, usageSpec);
  }

  updateUsageSpec(usageSpec:any,id:any){
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification/${id}`;

    return this.http.patch<any>(url, usageSpec);
  }
}
