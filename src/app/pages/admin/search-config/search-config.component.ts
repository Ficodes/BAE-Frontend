import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

interface SearchConfigPayload {
  searchUrl: string;
  useQueryKeyword: boolean;
}

@Component({
  selector: 'search-config',
  templateUrl: './search-config.component.html',
  styleUrl: './search-config.component.css'
})
export class SearchConfigComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  showError = false;
  showSuccess = false;
  errorMessage = '';
  successMessage = '';
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  searchForm = new FormGroup({
    searchUrl: new FormControl<string>('', { nonNullable: true }),
    useQueryKeyword: new FormControl<boolean>(false, { nonNullable: true })
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    void this.loadConfig();
  }

  ngOnDestroy(): void {
    if (this.successTimeoutId) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = null;
    }
  }

  async loadConfig(): Promise<void> {
    this.loading = true;
    this.showError = false;

    try {
      await this.syncFromBackend();
    } catch (error: any) {
      this.handleError(error, 'There was an error while loading search configuration.');
    } finally {
      this.loading = false;
    }
  }

  async saveConfig(): Promise<void> {
    if (this.saving) {
      return;
    }

    this.showError = false;
    this.showSuccess = false;
    this.saving = true;

    try {
      const payload = this.buildPayload();
      await firstValueFrom(this.http.patch<any>(`${environment.BASE_URL}/config/search`, payload));
      await this.syncFromBackend();

      this.successMessage = 'Search configuration saved successfully.';
      this.showSuccess = true;
      this.successTimeoutId = setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } catch (error: any) {
      this.handleError(error, 'There was an error while saving search configuration.');
    } finally {
      this.saving = false;
    }
  }

  private async syncFromBackend(): Promise<void> {
    const config = await firstValueFrom(this.http.get<any>(`${environment.BASE_URL}/config/search`));
    this.loadSearchConfig(config);
  }

  private loadSearchConfig(config: any): void {
    this.searchForm.patchValue({
      searchUrl: this.readSearchUrl(config),
      useQueryKeyword: this.readUseQueryKeyword(config)
    });
  }

  private buildPayload(): SearchConfigPayload {
    return {
      searchUrl: this.readString(this.searchForm.get('searchUrl')?.value),
      useQueryKeyword: this.searchForm.get('useQueryKeyword')?.value === true
    };
  }

  private readSearchUrl(config: any): string {
    if (typeof config?.searchUrl === 'string') {
      return config.searchUrl.trim();
    }

    if (typeof config?.url === 'string') {
      return config.url.trim();
    }

    if (config?.search && typeof config.search === 'object') {
      return this.readSearchUrl(config.search);
    }

    return '';
  }

  private readUseQueryKeyword(config: any): boolean {
    if (typeof config?.useQueryKeyword === 'boolean') {
      return config.useQueryKeyword;
    }

    if (config?.search && typeof config.search === 'object') {
      return this.readUseQueryKeyword(config.search);
    }

    return false;
  }

  private readString(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private handleError(error: any, fallbackMessage: string): void {
    if (error?.error?.error) {
      const details = error.error.details
        ? ` ${typeof error.error.details === 'string' ? error.error.details : JSON.stringify(error.error.details)}`
        : '';
      this.errorMessage = `Error: ${error.error.error}${details}`;
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
