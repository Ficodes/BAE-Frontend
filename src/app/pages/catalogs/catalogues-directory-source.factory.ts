import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CatalogDirectorySource } from './catalog-directory.source';
import { CataloguesDirectorySource } from './catalogues-directory.model';
import { ProviderDirectorySource } from './provider-directory.source';

@Injectable({
  providedIn: 'root'
})
export class CataloguesDirectorySourceFactory {
  constructor(
    private catalogSource: CatalogDirectorySource,
    private providerSource: ProviderDirectorySource
  ) {}

  getSource(): CataloguesDirectorySource {
    return environment.CATALOG_MANAGEMENT_ENABLED
      ? this.catalogSource
      : this.providerSource;
  }
}
