import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import {LocalStorageService} from "../services/local-storage.service";
import { LoginInfo } from '../models/interfaces';
import moment from 'moment';
import { environment } from 'src/environments/environment';

export function shouldAttachAuthHeaders(requestUrl: string, internalBaseUrls: string[]): boolean {
    if (!isAbsoluteHttpUrl(requestUrl)) return true;

    return internalBaseUrls
        .filter(isAbsoluteHttpUrl)
        .some(baseUrl => isRequestUnderBaseUrl(requestUrl, baseUrl));
}

@Injectable()
export class RequestInterceptor implements HttpInterceptor {

    public static BASE_URL: String = environment.BASE_URL;
    public static API_ORDERING: String = environment.PRODUCT_ORDER;
    public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

    constructor(private localStorage: LocalStorageService) { }
  
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        let aux = this.localStorage.getObject('login_items') as LoginInfo;
        if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
            if (!this.shouldAttachAuthHeaders(request.url)) {
                return next.handle(request);
            }

            if(aux.logged_as != aux.id){
                let modifiedRequest = request.clone({
                    setHeaders: {
                    'Authorization': 'Bearer '+aux.token,
                    'X-Organization': aux.logged_as
                    },
                });
                if (request.url.startsWith(`${RequestInterceptor.BASE_URL}${RequestInterceptor.API_ORDERING}/productOrder`)) {
                    modifiedRequest = request.clone({
                        setHeaders: {
                        'Authorization': 'Bearer '+aux.token,
                        'X-Organization': aux.logged_as,
                        'X-Terms-Accepted': 'true'
                        },
                    });
                }  
                return next.handle(modifiedRequest);
            } else {
                let modifiedRequest = request.clone({
                    setHeaders: {
                    'Authorization': 'Bearer '+aux.token,
                    },
                });
                if (request.url.startsWith(`${RequestInterceptor.BASE_URL}${RequestInterceptor.API_ORDERING}/productOrder`)) {
                    modifiedRequest = request.clone({
                        setHeaders: {
                        'Authorization': 'Bearer '+aux.token,
                        'X-Terms-Accepted': 'true'
                        },
                    });
                }  
                return next.handle(modifiedRequest);
            }            
        } else {
            console.log('not logged')
            return next.handle(request);
        } 
    }

    private shouldAttachAuthHeaders(requestUrl: string): boolean {
        return shouldAttachAuthHeaders(requestUrl, [
            environment.BASE_URL,
            this.quoteApiBaseUrl(),
        ]);
    }

    private quoteApiBaseUrl(): string {
        const quoteApi = environment.quoteApi;
        if (quoteApi.startsWith('http://') || quoteApi.startsWith('https://')) {
            return quoteApi;
        }
        return `${environment.BASE_URL}${quoteApi}`;
    }
}

function isAbsoluteHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function isRequestUnderBaseUrl(requestUrl: string, baseUrl: string): boolean {
    try {
        const request = new URL(requestUrl);
        const base = new URL(baseUrl);
        const basePath = base.pathname.replace(/\/$/, '');

        return request.origin === base.origin && (
            basePath === '' ||
            request.pathname === basePath ||
            request.pathname.startsWith(`${basePath}/`)
        );
    } catch {
        return false;
    }
}
