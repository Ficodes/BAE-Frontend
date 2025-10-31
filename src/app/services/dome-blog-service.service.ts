import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {LocalStorageService} from "./local-storage.service";

@Injectable({
  providedIn: 'root'
})
export class DomeBlogServiceService {
  public static BASE_URL: String = environment.BASE_URL;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  createBlogEntry(feedback:any) {
    let url = `${DomeBlogServiceService.BASE_URL}/domeblog`;
    return this.http.post<any>(url, feedback);
  }

  getBlogEntries(){
    let url = `${DomeBlogServiceService.BASE_URL}/domeblog`;
 
    return lastValueFrom(this.http.get<any>(url));
  }

  getBlogEntryById(id:any){
    let url = `${DomeBlogServiceService.BASE_URL}/domeblog/${id}`;
 
    return lastValueFrom(this.http.get<any>(url));
  }

  updateBlogEntry(body:any,id:any){
    let url = `${DomeBlogServiceService.BASE_URL}/domeblog/${id}`;
 
    return lastValueFrom(this.http.patch(url, body))
  }
}
