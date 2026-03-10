import { HttpClient, HttpHeaders } from '@angular/common/http';
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
export class AttachmentServiceService {
  public static BASE_URL: String = environment.BASE_URL;

  constructor(private http: HttpClient) { }

  uploadFile(file:any){
    //POST - El file va en el body de la petición
    let url = `${AttachmentServiceService.BASE_URL}/charging/api/assetManagement/assets/uploadJob`;
    return this.http.post<any>(url, file);
  }
}
