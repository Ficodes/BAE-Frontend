import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import moment from 'moment';

export interface FileInfo {
  id: string;
  contentType: string;
  location: string;
}

export interface ManagedFileUpload {
  id: string;
  href: string;
  content: string;
  contentType: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentServiceService {
  public static BASE_URL: String = environment.BASE_URL;

  constructor(private http: HttpClient) { }

  uploadManagedFile(file: File, metadata: { contentType: string; isPublic: boolean }) {
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('json', JSON.stringify(metadata));
    return this.http.post<ManagedFileUpload>(
      `${AttachmentServiceService.BASE_URL}/charging/api/assetManagement/assets/uploadJob`, body);
  }

  getFileInfo(id: string) {
    return this.http.get<FileInfo>(
      `${AttachmentServiceService.BASE_URL}/charging/api/assetManagement/assets/${encodeURIComponent(id)}`);
  }

  downloadManagedFile(file: FileInfo) {
    // Locations may use the charging backend's internal hostname. Route media
    // through our API base so the auth interceptor attaches the user's session.
    const location = new URL(file.location, 'http://charging.local');
    if (!location.pathname.startsWith('/charging/media/assets/')) {
      throw new Error('Invalid managed file location');
    }
    const url = `${AttachmentServiceService.BASE_URL}${location.pathname}${location.search}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  uploadFile(file:any){
    //POST - El file va en el body de la petición
    let url = `${AttachmentServiceService.BASE_URL}/charging/api/assetManagement/assets/uploadJob`;
    return this.http.post<any>(url, file);
  }
}
