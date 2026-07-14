import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

type AnalyticsDashboardKey = 'businessInsightsNonLear' | 'businessInsightsLear' | 'usageMonitor';
const DEFAULT_GUEST_TOKEN_PATH = '/api/v1/dome/guest_token/';

interface AnalyticsConfigPayload {
  analytics: string;
  analyticsEnabled: boolean;
  analyticsDashboards: Record<AnalyticsDashboardKey, string>;
  analyticsSuperset: {
    guestTokenPath: string;
  };
}

@Component({
  selector: 'analytics-config',
  templateUrl: './analytics-config.component.html',
  styleUrl: './analytics-config.component.css'
})
export class AnalyticsConfigComponent implements OnInit, OnDestroy {
  readonly dashboardSections: Array<{ key: AnalyticsDashboardKey; label: string }> = [
    { key: 'businessInsightsNonLear', label: 'Business Insights Non-LEAR' },
    { key: 'businessInsightsLear', label: 'Business Insights LEAR' },
    { key: 'usageMonitor', label: 'Usage Monitor' }
  ];

  loading = false;
  saving = false;
  showError = false;
  showSuccess = false;
  errorMessage = '';
  successMessage = '';
  providedJson = '';
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  analyticsForm = new FormGroup({
    analyticsEnabled: new FormControl<boolean>(false, { nonNullable: true }),
    analytics: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    analyticsDashboards: new FormGroup({
      businessInsightsNonLear: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      businessInsightsLear: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      usageMonitor: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      })
    }),
    analyticsSuperset: new FormGroup({
      guestTokenPath: new FormControl<string>(DEFAULT_GUEST_TOKEN_PATH, {
        nonNullable: true,
        validators: [Validators.required]
      })
    })
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
      this.handleError(error, 'There was an error while loading analytics configuration.');
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
      await this.saveAnalyticsPayload(payload);
      await this.syncFromBackend();

      this.successMessage = 'Analytics configuration saved successfully.';
      this.showSuccess = true;
      this.successTimeoutId = setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } catch (error: any) {
      this.handleError(error, 'There was an error while saving analytics configuration.');
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
      const payload = this.normalizeProvidedAnalyticsForSave(parsed);
      await this.saveAnalyticsPayload(payload);
      await this.syncFromBackend();

      this.successMessage = 'Analytics JSON saved successfully.';
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
      const normalized = this.normalizeProvidedAnalyticsForSave(parsed);
      this.loadAnalyticsConfig(normalized);
      this.providedJson = JSON.stringify(this.normalizeAnalyticsForJson(normalized), null, 2);
    } catch (error: any) {
      this.handleError(error, 'The provided JSON could not be loaded into the form.');
    }
  }

  getDashboardControl(key: AnalyticsDashboardKey): FormControl<string> {
    return this.analyticsForm.get(`analyticsDashboards.${key}`) as FormControl<string>;
  }

  private async syncFromBackend(): Promise<void> {
    const config = await firstValueFrom(this.http.get<any>(`${environment.BASE_URL}/config/analytics`));
    this.loadAnalyticsConfig(config);
    this.providedJson = JSON.stringify(this.normalizeAnalyticsForJson(config), null, 2);
  }

  private async saveAnalyticsPayload(payload: AnalyticsConfigPayload): Promise<void> {
    const response = await firstValueFrom(this.http.patch<any>(`${environment.BASE_URL}/config/analytics`, payload));

    environment.analytics = response?.analytics ?? payload.analytics;
    environment.analyticsEnabled = response?.analyticsEnabled ?? payload.analyticsEnabled;
  }

  private loadAnalyticsConfig(config: any): void {
    this.analyticsForm.patchValue({
      analyticsEnabled: typeof config?.analyticsEnabled === 'boolean'
        ? config.analyticsEnabled
        : false,
      analytics: this.readAnalyticsUrl(config),
      analyticsDashboards: {
        businessInsightsNonLear: this.readString(config?.analyticsDashboards?.businessInsightsNonLear),
        businessInsightsLear: this.readString(config?.analyticsDashboards?.businessInsightsLear),
        usageMonitor: this.readString(config?.analyticsDashboards?.usageMonitor)
      },
      analyticsSuperset: {
        guestTokenPath: this.readGuestTokenPath(config)
      }
    });
  }

  private buildPayload(): AnalyticsConfigPayload {
    const superset = this.analyticsForm.get('analyticsSuperset') as FormGroup;
    const dashboards = this.analyticsForm.get('analyticsDashboards') as FormGroup;

    const payload: AnalyticsConfigPayload = {
      analytics: this.requireString(this.analyticsForm.get('analytics')?.value, 'Analytics URL is required.'),
      analyticsEnabled: this.requireBoolean(this.analyticsForm.get('analyticsEnabled')?.value, 'Analytics enabled must be a boolean.'),
      analyticsDashboards: {
        businessInsightsNonLear: this.requireString(dashboards.get('businessInsightsNonLear')?.value, 'Business Insights Non-LEAR dashboard ID is required.'),
        businessInsightsLear: this.requireString(dashboards.get('businessInsightsLear')?.value, 'Business Insights LEAR dashboard ID is required.'),
        usageMonitor: this.requireString(dashboards.get('usageMonitor')?.value, 'Usage Monitor dashboard ID is required.')
      },
      analyticsSuperset: {
        guestTokenPath: this.requireString(superset.get('guestTokenPath')?.value, 'Guest token path is required.')
      }
    };

    return payload;
  }

  private normalizeProvidedAnalyticsForSave(parsed: any): AnalyticsConfigPayload {
    const superset = parsed?.analyticsSuperset && typeof parsed.analyticsSuperset === 'object'
      ? parsed.analyticsSuperset
      : {};

    const payload: AnalyticsConfigPayload = {
      analytics: this.requireString(this.readAnalyticsUrl(parsed), 'Analytics URL is required.'),
      analyticsEnabled: this.requireBoolean(parsed?.analyticsEnabled, 'Analytics enabled must be a boolean.'),
      analyticsDashboards: {
        businessInsightsNonLear: this.requireString(parsed?.analyticsDashboards?.businessInsightsNonLear, 'Business Insights Non-LEAR dashboard ID is required.'),
        businessInsightsLear: this.requireString(parsed?.analyticsDashboards?.businessInsightsLear, 'Business Insights LEAR dashboard ID is required.'),
        usageMonitor: this.requireString(parsed?.analyticsDashboards?.usageMonitor, 'Usage Monitor dashboard ID is required.')
      },
      analyticsSuperset: {
        guestTokenPath: this.requireString(superset.guestTokenPath, 'Guest token path is required.')
      }
    };

    return payload;
  }

  private normalizeAnalyticsForJson(config: any): any {
    const analyticsSuperset = config?.analyticsSuperset && typeof config.analyticsSuperset === 'object'
      ? config.analyticsSuperset
      : {};
    const normalized = {
      analyticsEnabled: config?.analyticsEnabled === true,
      analytics: this.readAnalyticsUrl(config),
      analyticsDashboards: {
        businessInsightsNonLear: this.readString(config?.analyticsDashboards?.businessInsightsNonLear),
        businessInsightsLear: this.readString(config?.analyticsDashboards?.businessInsightsLear),
        usageMonitor: this.readString(config?.analyticsDashboards?.usageMonitor)
      },
      analyticsSuperset: {
        guestTokenPath: this.readString(analyticsSuperset.guestTokenPath) || DEFAULT_GUEST_TOKEN_PATH
      }
    };

    return normalized;
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

  private requireString(value: any, message: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      throw new Error(message);
    }

    return normalized;
  }

  private requireBoolean(value: any, message: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(message);
    }

    return value;
  }

  private readString(value: any): string {
    return typeof value === 'string' ? value : '';
  }

  private readAnalyticsUrl(config: any): string {
    if (typeof config?.analytics === 'string') {
      return config.analytics.trim();
    }

    if (config?.analytics && typeof config.analytics === 'object') {
      return this.readString(config.analytics.link)
        || this.readString(config.analytics.url)
        || this.readString(config.analytics.domain);
    }

    return '';
  }

  private readGuestTokenPath(config: any): string {
    const analyticsSuperset = config?.analyticsSuperset && typeof config.analyticsSuperset === 'object'
      ? config.analyticsSuperset
      : {};

    return this.readString(analyticsSuperset.guestTokenPath) || DEFAULT_GUEST_TOKEN_PATH;
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
