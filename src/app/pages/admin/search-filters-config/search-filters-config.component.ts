import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { applyRuntimeSearchFiltersConfig } from 'src/app/data/availableFilters';
import { environment } from 'src/environments/environment';

type PrimaryCategoriesMode = 'catalogFirstLevel' | 'rooted';

@Component({
  selector: 'search-filters-config',
  templateUrl: './search-filters-config.component.html',
  styleUrl: './search-filters-config.component.css'
})
export class SearchFiltersConfigComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  showError = false;
  showSuccess = false;
  errorMessage = '';
  successMessage = '';
  providedJson = '';
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  searchFiltersForm = new FormGroup({
    primaryCategoriesMode: new FormControl<PrimaryCategoriesMode>('catalogFirstLevel', [Validators.required]),
    primaryRootName: new FormControl<string>(''),
    filters: new FormArray<FormGroup>([])
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
      this.handleError(error, 'There was an error while loading search filters configuration.');
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
      const mode = (this.searchFiltersForm.value.primaryCategoriesMode ?? 'catalogFirstLevel') as PrimaryCategoriesMode;
      const searchFiltersPayload = mode === 'catalogFirstLevel'
        ? {
            primaryCategoriesMode: 'catalogFirstLevel' as PrimaryCategoriesMode,
            primaryRootName: '',
            filters: []
          }
        : {
            primaryCategoriesMode: 'rooted' as PrimaryCategoriesMode,
            primaryRootName: this.requirePrimaryRootName(),
            filters: this.buildFiltersPayload()
          };

      const payload = searchFiltersPayload;
      const url = `${environment.BASE_URL}/config/filters`;
      await firstValueFrom(this.http.patch<any>(url, payload));

      applyRuntimeSearchFiltersConfig({ searchFilters: payload });
      await this.syncFromBackend();

      this.successMessage = 'Search and filters configuration saved successfully.';
      this.showSuccess = true;
      this.successTimeoutId = setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } catch (error: any) {
      this.handleError(error, 'There was an error while saving search filters configuration.');
    } finally {
      this.saving = false;
    }
  }

  async saveProvidedJson(): Promise<void> {
    if (this.saving) {
      return;
    }

    this.showError = false;
    this.showSuccess = false;
    this.saving = true;

    try {
      const parsed = this.parseProvidedJson(this.providedJson);
      const payload = this.normalizeProvidedSearchFiltersForSave(parsed);
      const url = `${environment.BASE_URL}/config/filters`;
      await firstValueFrom(this.http.patch<any>(url, payload));

      applyRuntimeSearchFiltersConfig({ searchFilters: payload });
      await this.syncFromBackend();

      this.successMessage = 'Search filters JSON saved successfully.';
      this.showSuccess = true;
      this.successTimeoutId = setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } catch (error: any) {
      this.handleError(error, 'There was an error while saving provided JSON.');
    } finally {
      this.saving = false;
    }
  }

  loadProvidedJsonIntoForm(): void {
    try {
      const parsed = this.parseProvidedJson(this.providedJson);
      const normalized = this.normalizeRuntimeSearchFilters(parsed);

      this.searchFiltersForm.patchValue({
        primaryCategoriesMode: normalized.primaryCategoriesMode,
        primaryRootName: normalized.primaryRootName
      });
      this.loadFilters(normalized.filters);
    } catch (error: any) {
      this.handleError(error, 'The provided JSON could not be loaded into the form.');
    }
  }

  onPrimaryModeChange(): void {
    if (this.isCatalogFirstLevelMode) {
      this.searchFiltersForm.patchValue({ primaryRootName: '' });
      this.loadFilters([]);
    }
  }

  get isCatalogFirstLevelMode(): boolean {
    return this.searchFiltersForm.get('primaryCategoriesMode')?.value === 'catalogFirstLevel';
  }

  private async syncFromBackend(): Promise<void> {
    const url = `${environment.BASE_URL}/config`;
    const config = await firstValueFrom(this.http.get<any>(url));
    const normalized = this.normalizeRuntimeSearchFilters(config?.searchFilters ?? {});

    this.providedJson = JSON.stringify(normalized, null, 2);
    this.searchFiltersForm.patchValue({
      primaryCategoriesMode: normalized.primaryCategoriesMode,
      primaryRootName: normalized.primaryRootName
    });
    this.loadFilters(normalized.filters);
  }

  get filtersArray(): FormArray<FormGroup> {
    return this.searchFiltersForm.get('filters') as FormArray<FormGroup>;
  }

  getOptionsArray(filterIndex: number): FormArray<FormGroup> {
    return this.filtersArray.at(filterIndex).get('options') as FormArray<FormGroup>;
  }

  addFilter(): void {
    this.filtersArray.push(this.createFilterGroup());
  }

  removeFilter(index: number): void {
    this.filtersArray.removeAt(index);
  }

  addOption(filterIndex: number): void {
    this.getOptionsArray(filterIndex).push(this.createOptionGroup());
  }

  removeOption(filterIndex: number, optionIndex: number): void {
    this.getOptionsArray(filterIndex).removeAt(optionIndex);
  }

  clearOptionsForCategoryRoot(filterIndex: number): void {
    const source = this.filtersArray.at(filterIndex).get('source')?.value;
    if (source !== 'categoryRoot') {
      return;
    }

    const options = this.getOptionsArray(filterIndex);
    while (options.length > 0) {
      options.removeAt(0);
    }
  }

  private loadFilters(rawFilters: any[]): void {
    while (this.filtersArray.length > 0) {
      this.filtersArray.removeAt(0);
    }

    for (const raw of rawFilters) {
      this.filtersArray.push(this.createFilterGroup(this.mapRuntimeFilter(raw)));
    }
  }

  private mapRuntimeFilter(raw: any): {
    name: string;
    label: string;
    source: 'configured' | 'categoryRoot';
    rootName: string;
    options: Array<{ name: string; label: string }>;
  } {
    const source: 'configured' | 'categoryRoot' = raw?.source === 'categoryRoot' ? 'categoryRoot' : 'configured';
    const options = source === 'configured' && Array.isArray(raw?.children)
      ? raw.children
          .filter((child: any) => typeof child?.name === 'string' && child.name.trim() !== '')
          .map((child: any) => ({
            name: child.name.trim(),
            label: typeof child?.label === 'string' ? child.label : ''
          }))
      : [];

    return {
      name: typeof raw?.name === 'string' ? raw.name : '',
      label: typeof raw?.label === 'string' ? raw.label : '',
      source,
      rootName: typeof raw?.rootName === 'string' ? raw.rootName : '',
      options
    };
  }

  private createFilterGroup(filter?: {
    name: string;
    label: string;
    source: 'configured' | 'categoryRoot';
    rootName: string;
    options: Array<{ name: string; label: string }>;
  }): FormGroup {
    return new FormGroup({
      name: new FormControl<string>(filter?.name ?? '', [Validators.required]),
      label: new FormControl<string>(filter?.label ?? ''),
      source: new FormControl<'configured' | 'categoryRoot'>(filter?.source ?? 'configured', [Validators.required]),
      rootName: new FormControl<string>(filter?.rootName ?? ''),
      options: new FormArray<FormGroup>(
        (filter?.options ?? []).map(option => this.createOptionGroup(option))
      )
    });
  }

  private createOptionGroup(option?: { name: string; label: string }): FormGroup {
    return new FormGroup({
      name: new FormControl<string>(option?.name ?? '', [Validators.required]),
      label: new FormControl<string>(option?.label ?? '')
    });
  }

  private buildFiltersPayload(): any[] {
    return this.filtersArray.controls.map((filterControl, filterIndex) => {
      const name = (filterControl.get('name')?.value ?? '').trim();
      const label = (filterControl.get('label')?.value ?? '').trim();
      const source = filterControl.get('source')?.value === 'categoryRoot' ? 'categoryRoot' : 'configured';
      const rootName = (filterControl.get('rootName')?.value ?? '').trim();

      if (!name) {
        throw new Error(`Filter ${filterIndex + 1}: name is required.`);
      }

      const payload: any = {
        name,
        source
      };
      if (label) {
        payload.label = label;
      }

      if (source === 'categoryRoot') {
        if (!rootName) {
          throw new Error(`Filter "${name}": root name is required when source is categoryRoot.`);
        }
        payload.rootName = rootName;
      } else {
        const options = this.getOptionsArray(filterIndex).controls
          .map((optionControl, optionIndex) => {
            const optionName = (optionControl.get('name')?.value ?? '').trim();
            const optionLabel = (optionControl.get('label')?.value ?? '').trim();
            if (!optionName) {
              throw new Error(`Filter "${name}", option ${optionIndex + 1}: name is required.`);
            }
            const optionPayload: any = { name: optionName };
            if (optionLabel) {
              optionPayload.label = optionLabel;
            }
            return optionPayload;
          });
        payload.children = options;
      }

      return payload;
    });
  }

  private normalizeRuntimeSearchFilters(runtime: any): {
    primaryCategoriesMode: PrimaryCategoriesMode;
    primaryRootName: string;
    filters: any[];
  } {
    const mode: PrimaryCategoriesMode = runtime?.primaryCategoriesMode === 'rooted'
      ? 'rooted'
      : 'catalogFirstLevel';

    if (mode === 'catalogFirstLevel') {
      return {
        primaryCategoriesMode: 'catalogFirstLevel',
        primaryRootName: '',
        filters: []
      };
    }

    return {
      primaryCategoriesMode: 'rooted',
      primaryRootName: typeof runtime?.primaryRootName === 'string' ? runtime.primaryRootName.trim() : '',
      filters: Array.isArray(runtime?.filters) ? runtime.filters : []
    };
  }

  private requirePrimaryRootName(): string {
    const rootName = (this.searchFiltersForm.value.primaryRootName ?? '').trim();
    if (!rootName) {
      throw new Error('Primary root name is required when mode is rooted.');
    }
    return rootName;
  }

  private parseProvidedJson(raw: string): any {
    const text = raw.trim();
    if (!text) {
      throw new Error('Please provide a JSON value.');
    }

    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Provided JSON must be an object.');
      }
      return parsed;
    } catch {
      throw new Error('Provided JSON is invalid.');
    }
  }

  private normalizeProvidedSearchFiltersForSave(parsed: any): {
    primaryCategoriesMode: PrimaryCategoriesMode;
    primaryRootName: string;
    filters: any[];
  } {
    if (Object.prototype.hasOwnProperty.call(parsed, 'searchFilters')) {
      throw new Error('Provide only the searchFilters JSON object, not the full /config payload.');
    }

    return this.normalizeRuntimeSearchFilters(parsed);
  }

  private handleError(error: any, fallbackMessage: string): void {
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
