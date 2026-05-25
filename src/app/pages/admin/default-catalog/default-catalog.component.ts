import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'default-catalog',
  templateUrl: './default-catalog.component.html',
  styleUrl: './default-catalog.component.css'
})
export class DefaultCatalogComponent implements OnInit {
  loading = false;
  loadingDefaultCatalog = false;
  showError = false;
  showSuccess = false;
  errorMessage = '';
  successMessage = '';
  defaultCatalogId = '';

  defaultCatalogForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', [Validators.maxLength(100000)])
  });

  constructor(private api: ApiServiceService) {}

  ngOnInit() {
    void this.loadDefaultCatalogInfo();
  }

  async loadDefaultCatalogInfo() {
    this.defaultCatalogId = environment.DFT_CATALOG_ID ?? '';

    if (!this.defaultCatalogId) {
      return;
    }

    this.loadingDefaultCatalog = true;
    try {
      const catalog = await this.api.getCatalog(this.defaultCatalogId);
      this.defaultCatalogForm.patchValue({
        name: catalog?.name ?? '',
        description: catalog?.description ?? ''
      });
    } catch (error) {
      this.defaultCatalogId = '';
      this.handleError(error, 'There was an error while loading the default catalog.');
    } finally {
      this.loadingDefaultCatalog = false;
    }
  }

  async saveDefaultCatalog() {
    if (this.defaultCatalogForm.invalid || this.loading) {
      this.defaultCatalogForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.showError = false;
    this.showSuccess = false;

    try {
      const payload: any = {
        name: this.defaultCatalogForm.value.name?.trim(),
        description: this.defaultCatalogForm.value.description ?? '',
        lifecycleStatus: 'Active'
      };

      let catalogId = this.defaultCatalogId;

      if (catalogId) {
        await firstValueFrom(this.api.updateAdminCatalog(payload, catalogId));
      } else {
        const createdCatalog = await firstValueFrom(this.api.postAdminCatalog(payload));
        catalogId = createdCatalog?.id ?? '';
      }

      if (!catalogId) {
        throw new Error('Catalog ID not returned by backend');
      }

      await firstValueFrom(this.api.setDefaultCatalog(catalogId));

      this.defaultCatalogId = catalogId;
      environment.DFT_CATALOG_ID = catalogId;

      this.successMessage = 'Default catalog saved successfully.';
      this.showSuccess = true;
      setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } catch (error) {
      this.handleError(error, 'There was an error while saving the default catalog.');
    } finally {
      this.loading = false;
    }
  }

  private handleError(error: any, fallbackMessage: string) {
    if (error?.error?.error) {
      this.errorMessage = `Error: ${error.error.error}`;
    } else if (error?.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = fallbackMessage;
    }
    this.showError = true;
    setTimeout(() => {
      this.showError = false;
    }, 3000);
  }
}
