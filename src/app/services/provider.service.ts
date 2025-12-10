import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Provider {
  id?: string;
  href?: string;
  tradingName?: string;
  externalReference?: Array<{
    externalReferenceType?: string;
    name?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ProviderService {
  private http = inject(HttpClient);
  private readonly endpoint = `${environment.BASE_URL}/party/v4/organization`;
  //TODO FOR DEV ONLY
  //private readonly endpoint = `${environment.BASE_URL}/party/organization`;

  getProviders(params: { fields?: string; offset?: number; limit?: number } = {}): Observable<Provider[]> {
    let httpParams = new HttpParams();
    if (params.fields) {
      httpParams = httpParams.set('fields', params.fields);
    }
    if (params.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    
    const url = `${this.endpoint}${httpParams.toString() ? '?' + httpParams.toString() : ''}`;
    
    return this.http.get<Provider[]>(url).pipe(
      map(response => {
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.warn('Provider API failed:', error);
        return of([]);
      })
    );
  }

  getProviderById(id: string): Observable<Provider> {
    const targetUrl = `${this.endpoint}/${id}`;
    
    // Use CORS proxy if calling external DOME API directly
    const isExternalUrl = targetUrl.startsWith('https://');
    const url = isExternalUrl ? `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` : targetUrl;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        // Parse CORS proxy response if used
        return isExternalUrl ? JSON.parse(response.contents) : response;
      }),
      catchError((error) => {
        console.warn('Provider by ID API failed:', error);
        throw error;
      })
    );
  }

  getProvidersForTender(): Observable<Provider[]> {
    const targetUrl = this.endpoint;
    
    // Use CORS proxy if calling external DOME API directly
    const isExternalUrl = targetUrl.startsWith('https://');
    const url = isExternalUrl ? `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` : targetUrl;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        // Parse CORS proxy response if used
        const data = isExternalUrl ? JSON.parse(response.contents) : response;
        return Array.isArray(data) ? data : [];
      }),
      catchError((error) => {
        console.warn('Providers for tender API failed:', error);
        return of([]);
      })
    );
  }
}

