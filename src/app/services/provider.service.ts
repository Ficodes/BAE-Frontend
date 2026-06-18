import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, expand, forkJoin, map, of, reduce } from 'rxjs';
import { environment } from '../../environments/environment';
import { FilterOptions } from '../models/filter-options.model';
import {
  PROVIDER_COUNTRY_LIST_URL,
  ProviderCountryListResponse,
  ProviderCountryOption,
  SearchOrganizationsFilters,
  parseProviderCountryList,
} from '../models/search-organizations-filters.model';

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
  private readonly endpoint = `${environment.BASE_URL}/party/organization`;

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


  getProvidersForTenderNew(filters: SearchOrganizationsFilters): Observable<Provider[]> {
    // search-bck is a Spring Data (Pageable) backend: it paginates with `page` (a
    // 0-indexed page number) + `size`. It IGNORES `offset`/`from` — verified against
    // DEV — which is why the previous offset-based loop re-fetched page 0 forever.
    const PAGE_SIZE = 100;
    // Hard safety cap so a backend regression (e.g. paging silently breaking again)
    // can never storm the cluster. 100 pages * 100 = 10k providers, far beyond any real list.
    const MAX_PAGES = 100;
    // Strip any ?size=N the endpoint URL may already have (e.g. the ?size=1000 k8s workaround)
    const baseUrl = this.buildBackendUrl(environment.searchOrganizationsEndpoint).split('?')[0];

    const fetchPage = (page: number): Observable<{ items: Provider[]; page: number }> =>
      this.http.post<any>(`${baseUrl}?page=${page}&size=${PAGE_SIZE}`, filters).pipe(
        map(response => {
          const items: Provider[] = Array.isArray(response) ? response as Provider[] :
            (response?.data && Array.isArray(response.data) ? response.data as Provider[] : []);
          return { items, page };
        })
      );

    // Walk pages until one comes back shorter than a full page (the last page), or the
    // safety cap is reached, then flatten everything into a single Provider[].
    return fetchPage(0).pipe(
      expand(({ items, page }) =>
        items.length < PAGE_SIZE || page + 1 >= MAX_PAGES ? EMPTY : fetchPage(page + 1)
      ),
      reduce((acc: Provider[], { items }) => acc.concat(items), [])
    );
    // No catchError here — callers must handle HTTP errors themselves so they can
    // distinguish a genuine empty search result from a failed request.
  }

  getProviderCountryOptions(locale = 'en'): Observable<ProviderCountryOption[]> {
    const url = environment.providerCountriesUrl || PROVIDER_COUNTRY_LIST_URL;

    return this.http.get<ProviderCountryListResponse>(url).pipe(
      map(response => parseProviderCountryList(response, locale)),
      catchError(err => {
        console.warn('Provider country list failed:', err);
        return of<ProviderCountryOption[]>([]);
      })
    );
  }

  //Methods for the search engine
  //TODO: Check if this is still necessary after we change the main endpoint
  getFilterOptions(): Observable<FilterOptions> {
    const base = this.buildBackendUrl(environment.searchOrganizationsEndpoint).replace(/\/searchOrganizations.*$/, '');
    const categories$ = this.http.get<any>(`${base}/categories`).pipe(
      map(res => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [])),
      catchError(err => {
        console.warn('Categories API failed:', err);
        return of<string[]>([]);
      })
    );

    const countries$ = this.http.get<any>(`${base}/countries`).pipe(
      map(res => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [])),
      catchError(err => {
        console.warn('Countries API failed:', err);
        return of<string[]>([]);
      })
    );

    const complianceLevels$ = this.http.get<any>(`${base}/complianceLevels`).pipe(
      map(res => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [])),
      catchError(err => {
        console.warn('ComplianceLevels API failed:', err);
        return of<string[]>([]);
      })
    );

    return forkJoin({
      categories: categories$,
      countries: countries$,
      complianceLevels: complianceLevels$,
    });
  }

  private buildBackendUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const baseUrl = environment.BASE_URL.replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${path}`;
  }

}

