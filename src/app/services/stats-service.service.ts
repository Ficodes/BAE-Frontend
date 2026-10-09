import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {LocalStorageService} from "./local-storage.service";
import { normalizeProviderStats, ProviderStats } from '../models/provider-stats.model';

@Injectable({
  providedIn: 'root'
})
export class StatsServiceService {
  public static BASE_URL: String = environment.BASE_URL;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getStats() {
    let url = `${StatsServiceService.BASE_URL}/stats`;
    return lastValueFrom(this.http.get<any>(url));
  }

  async getProviderStats(organizationId: string): Promise<ProviderStats> {
    const encodedOrganizationId = encodeURIComponent(organizationId);
    const url = `${StatsServiceService.BASE_URL}/stats/provider/${encodedOrganizationId}`;
    const stats = await lastValueFrom(this.http.get<any>(url));
    return normalizeProviderStats(stats);
  }
}
