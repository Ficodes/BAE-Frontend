import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

type AnalyticsDashboardKey = 'businessInsightsNonLear' | 'businessInsightsLear' | 'usageMonitor';

interface RlsRuleConfig {
  datasets: number[];
  clauseTemplate: string;
}

interface AnalyticsConfigPayload {
  analyticsEnabled: boolean;
  analyticsSupersetDomain: string;
  analyticsDashboards: Record<AnalyticsDashboardKey, string>;
  analyticsSuperset: {
    url: string;
    username: string;
    password?: string;
    provider: string;
    rls: Record<AnalyticsDashboardKey, RlsRuleConfig[]>;
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
  passwordConfigured: boolean | null = null;
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  analyticsForm = new FormGroup({
    analyticsEnabled: new FormControl<boolean>(false, { nonNullable: true }),
    analyticsSupersetDomain: new FormControl<string>('', {
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
      url: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      username: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      password: new FormControl<string>('', { nonNullable: true }),
      provider: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      rls: new FormGroup({
        businessInsightsNonLear: new FormArray<FormGroup>([]),
        businessInsightsLear: new FormArray<FormGroup>([]),
        usageMonitor: new FormArray<FormGroup>([])
      })
    })
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initializeEmptyRls();
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
      if (normalized.analyticsSuperset.password) {
        this.analyticsForm.get('analyticsSuperset.password')?.setValue(normalized.analyticsSuperset.password);
      }
      if (typeof parsed?.analyticsSuperset?.passwordConfigured === 'boolean') {
        this.passwordConfigured = parsed.analyticsSuperset.passwordConfigured;
      }
      this.providedJson = JSON.stringify(this.normalizeAnalyticsForJson(normalized), null, 2);
    } catch (error: any) {
      this.handleError(error, 'The provided JSON could not be loaded into the form.');
    }
  }

  getDashboardControl(key: AnalyticsDashboardKey): FormControl<string> {
    return this.analyticsForm.get(`analyticsDashboards.${key}`) as FormControl<string>;
  }

  rlsArray(key: AnalyticsDashboardKey): FormArray<FormGroup> {
    return this.analyticsForm.get(`analyticsSuperset.rls.${key}`) as FormArray<FormGroup>;
  }

  addRlsRule(key: AnalyticsDashboardKey): void {
    this.rlsArray(key).push(this.createRlsRuleGroup());
  }

  removeRlsRule(key: AnalyticsDashboardKey, index: number): void {
    this.rlsArray(key).removeAt(index);
  }

  private initializeEmptyRls(): void {
    for (const section of this.dashboardSections) {
      const rules = this.rlsArray(section.key);
      while (rules.length > 0) {
        rules.removeAt(0);
      }

      rules.push(this.createRlsRuleGroup());
    }
  }

  private async syncFromBackend(): Promise<void> {
    const config = await firstValueFrom(this.http.get<any>(`${environment.BASE_URL}/config/analytics`));
    this.loadAnalyticsConfig(config);
    this.providedJson = JSON.stringify(this.normalizeAnalyticsForJson(config), null, 2);
  }

  private async saveAnalyticsPayload(payload: AnalyticsConfigPayload): Promise<void> {
    const response = await firstValueFrom(this.http.patch<any>(`${environment.BASE_URL}/config/analytics`, payload));

    environment.analyticsSupersetDomain = response?.analyticsSupersetDomain ?? payload.analyticsSupersetDomain;
    environment.analyticsEnabled = response?.analyticsEnabled ?? payload.analyticsEnabled;
  }

  private loadAnalyticsConfig(config: any): void {
    const analyticsSupersetDomain = typeof config?.analyticsSupersetDomain === 'string'
      ? config.analyticsSupersetDomain.trim()
      : '';
    const analyticsSuperset = config?.analyticsSuperset && typeof config.analyticsSuperset === 'object'
      ? config.analyticsSuperset
      : {};

    this.passwordConfigured = typeof analyticsSuperset.passwordConfigured === 'boolean'
      ? analyticsSuperset.passwordConfigured
      : null;

    this.analyticsForm.patchValue({
      analyticsEnabled: typeof config?.analyticsEnabled === 'boolean'
        ? config.analyticsEnabled
        : false,
      analyticsSupersetDomain,
      analyticsDashboards: {
        businessInsightsNonLear: this.readString(config?.analyticsDashboards?.businessInsightsNonLear),
        businessInsightsLear: this.readString(config?.analyticsDashboards?.businessInsightsLear),
        usageMonitor: this.readString(config?.analyticsDashboards?.usageMonitor)
      },
      analyticsSuperset: {
        url: this.readString(analyticsSuperset.url),
        username: this.readString(analyticsSuperset.username),
        password: '',
        provider: this.readString(analyticsSuperset.provider)
      }
    });

    this.loadRlsFromConfig(analyticsSuperset.rls);
  }

  private loadRlsFromConfig(rls: any): void {
    const source = rls && typeof rls === 'object' ? rls : {};

    for (const section of this.dashboardSections) {
      const rules = this.rlsArray(section.key);
      while (rules.length > 0) {
        rules.removeAt(0);
      }

      const sourceRules = Array.isArray(source[section.key]) ? source[section.key] : [];
      if (sourceRules.length === 0) {
        rules.push(this.createRlsRuleGroup());
        continue;
      }

      for (const rule of sourceRules) {
        rules.push(this.createRlsRuleGroup({
          datasets: Array.isArray(rule?.datasets)
            ? rule.datasets.filter((dataset: any) => Number.isInteger(dataset))
            : [],
          clauseTemplate: this.readString(rule?.clauseTemplate)
        }));
      }
    }
  }

  private createRlsRuleGroup(rule?: RlsRuleConfig): FormGroup {
    return new FormGroup({
      datasets: new FormControl<string>((rule?.datasets ?? []).join(', '), {
        nonNullable: true,
        validators: [Validators.required]
      }),
      clauseTemplate: new FormControl<string>(rule?.clauseTemplate ?? '', {
        nonNullable: true,
        validators: [Validators.required]
      })
    });
  }

  private buildPayload(): any {
    const superset = this.analyticsForm.get('analyticsSuperset') as FormGroup;
    const dashboards = this.analyticsForm.get('analyticsDashboards') as FormGroup;
    const password = typeof superset.get('password')?.value === 'string'
      ? superset.get('password')?.value.trim()
      : '';

    if (!password && this.passwordConfigured !== true) {
      throw new Error('Superset password is required.');
    }

    const payload: AnalyticsConfigPayload = {
      analyticsEnabled: this.analyticsForm.get('analyticsEnabled')?.value === true,
      analyticsSupersetDomain: this.requireString(this.analyticsForm.get('analyticsSupersetDomain')?.value, 'Superset domain is required.'),
      analyticsDashboards: {
        businessInsightsNonLear: this.requireString(dashboards.get('businessInsightsNonLear')?.value, 'Business Insights Non-LEAR dashboard ID is required.'),
        businessInsightsLear: this.requireString(dashboards.get('businessInsightsLear')?.value, 'Business Insights LEAR dashboard ID is required.'),
        usageMonitor: this.requireString(dashboards.get('usageMonitor')?.value, 'Usage Monitor dashboard ID is required.')
      },
      analyticsSuperset: {
        url: this.requireString(superset.get('url')?.value, 'Superset URL is required.'),
        username: this.requireString(superset.get('username')?.value, 'Superset username is required.'),
        provider: this.requireString(superset.get('provider')?.value, 'Superset provider is required.'),
        rls: {
          businessInsightsNonLear: this.buildRlsRules('businessInsightsNonLear'),
          businessInsightsLear: this.buildRlsRules('businessInsightsLear'),
          usageMonitor: this.buildRlsRules('usageMonitor')
        }
      }
    };

    if (password) {
      payload.analyticsSuperset.password = password;
    }

    return payload;
  }

  private normalizeProvidedAnalyticsForSave(parsed: any): AnalyticsConfigPayload {
    const superset = parsed?.analyticsSuperset && typeof parsed.analyticsSuperset === 'object'
      ? parsed.analyticsSuperset
      : {};
    const password = typeof superset.password === 'string'
      ? superset.password.trim()
      : '';

    if (!password && this.passwordConfigured !== true) {
      throw new Error('Superset password is required.');
    }

    const payload: AnalyticsConfigPayload = {
      analyticsEnabled: parsed?.analyticsEnabled === true,
      analyticsSupersetDomain: this.requireString(parsed?.analyticsSupersetDomain, 'Superset domain is required.'),
      analyticsDashboards: {
        businessInsightsNonLear: this.requireString(parsed?.analyticsDashboards?.businessInsightsNonLear, 'Business Insights Non-LEAR dashboard ID is required.'),
        businessInsightsLear: this.requireString(parsed?.analyticsDashboards?.businessInsightsLear, 'Business Insights LEAR dashboard ID is required.'),
        usageMonitor: this.requireString(parsed?.analyticsDashboards?.usageMonitor, 'Usage Monitor dashboard ID is required.')
      },
      analyticsSuperset: {
        url: this.requireString(superset.url, 'Superset URL is required.'),
        username: this.requireString(superset.username, 'Superset username is required.'),
        provider: this.requireString(superset.provider, 'Superset provider is required.'),
        rls: {
          businessInsightsNonLear: this.normalizeRlsRules(superset?.rls?.businessInsightsNonLear, 'businessInsightsNonLear'),
          businessInsightsLear: this.normalizeRlsRules(superset?.rls?.businessInsightsLear, 'businessInsightsLear'),
          usageMonitor: this.normalizeRlsRules(superset?.rls?.usageMonitor, 'usageMonitor')
        }
      }
    };

    if (password) {
      payload.analyticsSuperset.password = password;
    }

    return payload;
  }

  private normalizeAnalyticsForJson(config: any): any {
    const analyticsSuperset = config?.analyticsSuperset && typeof config.analyticsSuperset === 'object'
      ? config.analyticsSuperset
      : {};
    const normalized = {
      analyticsEnabled: config?.analyticsEnabled === true,
      analyticsSupersetDomain: this.readString(config?.analyticsSupersetDomain),
      analyticsDashboards: {
        businessInsightsNonLear: this.readString(config?.analyticsDashboards?.businessInsightsNonLear),
        businessInsightsLear: this.readString(config?.analyticsDashboards?.businessInsightsLear),
        usageMonitor: this.readString(config?.analyticsDashboards?.usageMonitor)
      },
      analyticsSuperset: {
        url: this.readString(analyticsSuperset.url),
        username: this.readString(analyticsSuperset.username),
        provider: this.readString(analyticsSuperset.provider),
        rls: {
          businessInsightsNonLear: this.normalizeRlsRulesForJson(analyticsSuperset?.rls?.businessInsightsNonLear),
          businessInsightsLear: this.normalizeRlsRulesForJson(analyticsSuperset?.rls?.businessInsightsLear),
          usageMonitor: this.normalizeRlsRulesForJson(analyticsSuperset?.rls?.usageMonitor)
        }
      }
    };

    if (typeof analyticsSuperset.passwordConfigured === 'boolean') {
      return {
        ...normalized,
        analyticsSuperset: {
          ...normalized.analyticsSuperset,
          passwordConfigured: analyticsSuperset.passwordConfigured
        }
      };
    }

    return normalized;
  }

  private normalizeRlsRules(rawRules: any, key: AnalyticsDashboardKey): RlsRuleConfig[] {
    if (!Array.isArray(rawRules) || rawRules.length === 0) {
      throw new Error(`${this.getDashboardLabel(key)} must include at least one RLS rule.`);
    }

    return rawRules.map((rule: any, index: number) => ({
      datasets: this.normalizeDatasets(rule?.datasets, `${this.getDashboardLabel(key)} rule ${index + 1}`),
      clauseTemplate: this.requireString(
        rule?.clauseTemplate,
        `${this.getDashboardLabel(key)} rule ${index + 1}: clause template is required.`
      )
    }));
  }

  private normalizeRlsRulesForJson(rawRules: any): RlsRuleConfig[] {
    if (!Array.isArray(rawRules)) {
      return [];
    }

    return rawRules.map((rule: any) => ({
      datasets: Array.isArray(rule?.datasets)
        ? rule.datasets.filter((dataset: any) => Number.isInteger(dataset))
        : [],
      clauseTemplate: this.readString(rule?.clauseTemplate)
    }));
  }

  private buildRlsRules(key: AnalyticsDashboardKey): RlsRuleConfig[] {
    const rules = this.rlsArray(key).controls.map((ruleControl, index) => {
      const datasetsText = ruleControl.get('datasets')?.value;
      const clauseTemplate = this.requireString(
        ruleControl.get('clauseTemplate')?.value,
        `${this.getDashboardLabel(key)} rule ${index + 1}: clause template is required.`
      );

      return {
        datasets: this.parseDatasets(datasetsText, `${this.getDashboardLabel(key)} rule ${index + 1}`),
        clauseTemplate
      };
    });

    if (rules.length === 0) {
      throw new Error(`${this.getDashboardLabel(key)} must include at least one RLS rule.`);
    }

    return rules;
  }

  private parseDatasets(value: any, label: string): number[] {
    const tokens = String(value ?? '')
      .split(',')
      .map(token => token.trim())
      .filter(token => token !== '');

    if (tokens.length === 0) {
      throw new Error(`${label}: provide at least one dataset ID.`);
    }

    return tokens.map(token => {
      const parsed = Number(token);
      if (!Number.isInteger(parsed)) {
        throw new Error(`${label}: dataset IDs must be comma-separated integers.`);
      }
      return parsed;
    });
  }

  private normalizeDatasets(value: any, label: string): number[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${label}: provide at least one dataset ID.`);
    }

    return value.map(dataset => {
      if (!Number.isInteger(dataset)) {
        throw new Error(`${label}: dataset IDs must be integers.`);
      }
      return dataset;
    });
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

  private readString(value: any): string {
    return typeof value === 'string' ? value : '';
  }

  private getDashboardLabel(key: AnalyticsDashboardKey): string {
    return this.dashboardSections.find(section => section.key === key)?.label ?? key;
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
