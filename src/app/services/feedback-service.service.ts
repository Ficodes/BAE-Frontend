import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {LocalStorageService} from "./local-storage.service";

@Injectable({
  providedIn: 'root'
})
export class FeedbackServiceService {
  public static BASE_URL: String = environment.BASE_URL;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  sendFeedback(feedback:any) {
    let url = `${FeedbackServiceService.BASE_URL}/feedback`;
    return this.http.post<any>(url, feedback);
  }
}
