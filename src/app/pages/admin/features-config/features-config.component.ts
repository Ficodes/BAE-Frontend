import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  applyRuntimeFeaturesConfig,
  FEATURE_FLAG_DEFINITIONS,
  FeatureFlagDefinition,
  readFeaturesConfig
} from 'src/app/data/featuresConfig';
import { environment } from 'src/environments/environment';

type FeatureFlagFormGroup = FormGroup<{
  key: FormControl<string>;
  enabled: FormControl<boolean>;
  known: FormControl<boolean>;
}>;

@Component({
  selector: 'features-config',
  templateUrl: './features-config.component.html',
  styleUrl: './features-config.component.css'
})
export class FeaturesConfigComponent implements OnInit, OnDestroy {
  readonly definitions = FEATURE_FLAG_DEFINITIONS;
  loading = false;
  saving = false;
  showError = false;
  showSuccess = false;
  errorMessage = '';
  successMessage = '';
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  featuresForm = new FormGroup({
    flags: new FormArray<FeatureFlagFormGroup>([])
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

  get flagsArray(): FormArray<FeatureFlagFormGroup> {
    return this.featuresForm.get('flags') as FormArray<FeatureFlagFormGroup>;
  }

  getDefinition(key: string): FeatureFlagDefinition | undefined {
    return this.definitions.find(definition => definition.key === key);
  }

  async loadConfig(): Promise<void> {
    this.loading = true;
    this.showError = false;

    try {
      await this.syncFromBackend();
    } catch (error: any) {
      this.handleError(error, 'There was an error while loading features configuration.');
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
      const payload = this.buildFeaturesPayload();
      const url = `${environment.BASE_URL}/config/features`;
      await firstValueFrom(this.http.patch<any>(url, payload));

      applyRuntimeFeaturesConfig({ features: payload });
      await this.syncFromBackend();

      this.successMessage = 'Features configuration saved successfully.';
      this.showSuccess = true;
      this.successTimeoutId = setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } catch (error: any) {
      this.handleError(error, 'There was an error while saving features configuration.');
    } finally {
      this.saving = false;
    }
  }

  addFeatureFlag(): void {
    this.flagsArray.push(this.createFeatureGroup('', false, false));
  }

  removeFeatureFlag(index: number): void {
    const flag = this.flagsArray.at(index);
    if (flag.get('known')?.value) {
      return;
    }

    this.flagsArray.removeAt(index);
  }

  private async syncFromBackend(): Promise<void> {
    const url = `${environment.BASE_URL}/config`;
    const config = await firstValueFrom(this.http.get<any>(url));
    const features = readFeaturesConfig(config);
    this.loadFeatureFlags(features);
  }

  private loadFeatureFlags(features: Record<string, boolean | undefined>): void {
    while (this.flagsArray.length > 0) {
      this.flagsArray.removeAt(0);
    }

    for (const definition of this.definitions) {
      this.flagsArray.push(this.createFeatureGroup(definition.key, features[definition.key] ?? false, true));
    }

    Object.entries(features)
      .filter(([key, value]) => typeof value === 'boolean' && !this.getDefinition(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, value]) => {
        this.flagsArray.push(this.createFeatureGroup(key, Boolean(value), false));
      });
  }

  private createFeatureGroup(key: string, enabled: boolean, known: boolean): FeatureFlagFormGroup {
    return new FormGroup({
      key: new FormControl<string>(key, { nonNullable: true, validators: [Validators.required] }),
      enabled: new FormControl<boolean>(enabled, { nonNullable: true }),
      known: new FormControl<boolean>(known, { nonNullable: true })
    });
  }

  private buildFeaturesPayload(): Record<string, boolean> {
    const payload: Record<string, boolean> = {};
    const seenKeys = new Set<string>();

    this.flagsArray.controls.forEach((flagControl, index) => {
      const key = (flagControl.get('key')?.value ?? '').trim();
      const enabled = flagControl.get('enabled')?.value === true;

      if (!key) {
        throw new Error(`Feature ${index + 1}: key is required.`);
      }
      if (seenKeys.has(key)) {
        throw new Error(`Feature "${key}" is duplicated.`);
      }

      seenKeys.add(key);
      payload[key] = enabled;
    });

    return payload;
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
