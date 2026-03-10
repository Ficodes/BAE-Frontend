import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SiopInfoService {

  constructor(private http: HttpClient) { }

  getSiopInfo(){
    return this.http.get<any>(`${environment.BASE_URL}/siop`)
  }
}
