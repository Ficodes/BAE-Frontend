import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PluginInfo } from 'src/app/models/asset-type.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PluginManagementService {
  private readonly url = `${environment.BASE_URL}${environment.CHARGING}/api/assetManagement/assetTypes`;

  constructor(private http: HttpClient) {}

  listPlugins() {
    return this.http.get<PluginInfo[]>(this.url);
  }

  deletePlugin(pluginId: string) {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(pluginId)}`);
  }

  installPlugin(file: File) {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<PluginInfo>(`${this.url}/installJob`, body, {
      observe: 'response', headers: { Accept: 'application/json' }
    });
  }
}
