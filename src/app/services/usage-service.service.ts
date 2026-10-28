import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {forkJoin, lastValueFrom, map, Observable} from 'rxjs';
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
  private readonly filteredPaginationHeader = 'X-Filtered-Pagination-Token';
  private filteredPaginationToken: string | null = null;
  private filteredPaginationQuery: string | null = null;
  private filteredPaginationGeneration = 0;
  private filteredPaginationExhausted = false;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getUsageSpec(id:any) {
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  getUsageSpecs(page:any, status:any[], partyId:any, stopOnShortPage = false) {
    const query = JSON.stringify([String(partyId), status, stopOnShortPage]);
    if (Number(page) === 0 || query !== this.filteredPaginationQuery) {
      this.resetFilteredPaginationToken();
      this.filteredPaginationQuery = query;
    }

    if (stopOnShortPage && this.filteredPaginationExhausted) {
      return Promise.resolve([]);
    }

    const generation = this.filteredPaginationGeneration;
    const limit = UsageServiceService.USAGE_SPEC_LIMIT;
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${limit}&offset=${page}&relatedParty.id=${partyId}`;

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

    let requestOptions: { observe: 'response', headers?: { [header: string]: string } } = { observe: 'response' };
    if (this.filteredPaginationToken) {
      requestOptions.headers = {
        [this.filteredPaginationHeader]: this.filteredPaginationToken
      };
    }

    return lastValueFrom(this.http.get<any[]>(url, requestOptions)).then(response => {
      if (generation !== this.filteredPaginationGeneration) return [];

      const items = response.body ?? [];
      this.filteredPaginationExhausted = stopOnShortPage && items.length < limit;
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

  isUsageSpecNameTaken(name: string, partyId: string, currentSpecId?: string): Observable<boolean> {
    const url = `${UsageServiceService.BASE_URL}/usage/usageSpecification`;
    // Separate states avoid the API's incomplete pages for multi-state filters.
    const requests = ['Active', 'Launched'].map(lifecycleStatus => {
      const params = new HttpParams()
        .set('name', name.trim())
        .set('relatedParty.id', partyId)
        .set('lifecycleStatus', lifecycleStatus)
        .set('limit', currentSpecId ? 2 : 1);
      return this.http.get<{ id?: string }[]>(url, { params });
    });

    return forkJoin(requests).pipe(
      map(pages => pages.some(items => items.some(item => !currentSpecId || item.id !== currentSpecId)))
    );
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
