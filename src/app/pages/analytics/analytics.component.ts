import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { embedDashboard, type EmbeddedDashboard } from '@superset-ui/embedded-sdk';
import { firstValueFrom } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environments/environment';

type AnalyticsTabKey = 'businessInsights' | 'usageMonitor';

interface AnalyticsTab {
  key: AnalyticsTabKey;
  label: string;
  description: string;
  iconPath: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('supersetMount') supersetMount?: ElementRef<HTMLElement>;

  readonly tabs: AnalyticsTab[] = [
    {
      key: 'businessInsights',
      label: 'Business Insights',
      description: 'Marketplace business performance, engagement and commercial analytics.',
      iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z'
    },
    {
      key: 'usageMonitor',
      label: 'Usage Monitor',
      description: 'Platform usage monitoring for marketplace administrators.',
      iconPath: 'M9 17v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6m4 0V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10m14 0H5m14 0a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2',
      adminOnly: true
    }
  ];

  selectedTab: AnalyticsTabKey = 'businessInsights';
  loading = false;
  errorMessage = '';
  statusMessage = '';

  private embeddedDashboard: EmbeddedDashboard | null = null;
  private embedSequence = 0;

  constructor(
    private http: HttpClient,
    private localStorage: LocalStorageService
  ) {}

  ngAfterViewInit(): void {
    void this.embedSelectedDashboard();
  }

  ngOnDestroy(): void {
    this.unmountDashboard();
  }

  selectTab(tab: AnalyticsTabKey): void {
    if (this.selectedTab === tab || !this.visibleTabs.some(visibleTab => visibleTab.key === tab)) {
      return;
    }

    this.selectedTab = tab;
    void this.embedSelectedDashboard();
  }

  get selectedTabConfig(): AnalyticsTab {
    return this.visibleTabs.find(tab => tab.key === this.selectedTab) ?? this.visibleTabs[0] ?? this.tabs[0];
  }

  get visibleTabs(): AnalyticsTab[] {
    return this.tabs.filter(tab => !tab.adminOnly || this.isAdmin);
  }

  get isAdmin(): boolean {
    const loginInfo = this.localStorage.getObject('login_items') as any;
    if (!loginInfo || JSON.stringify(loginInfo) === '{}') {
      return false;
    }

    const adminRole = environment.ADMIN_ROLE?.toLowerCase();
    const userRoles = (loginInfo.roles ?? []).map((role: any) => role.name?.toLowerCase());
    const loggedOrganization = (loginInfo.organizations ?? []).find((organization: any) => organization.id === loginInfo.logged_as);
    const organizationRoles = (loggedOrganization?.roles ?? []).map((role: any) => role.name?.toLowerCase());

    return userRoles.includes(adminRole) || organizationRoles.includes(adminRole);
  }

  get supersetDomain(): string {
    return environment.analyticsSupersetDomain ?? '';
  }

  get analyticsEnabled(): boolean {
    return environment.analyticsEnabled;
  }

  get hasDashboardConfig(): boolean {
    return this.analyticsEnabled && Boolean(this.supersetDomain);
  }

  getTabClass(tab: AnalyticsTabKey): string {
    return this.selectedTab === tab
      ? 'bg-[#1f4fbf] text-white shadow-sm'
      : 'bg-transparent text-[#526179] hover:bg-[#EBF0F7] hover:text-[#1f4fbf]';
  }

  private async embedSelectedDashboard(): Promise<void> {
    const sequence = ++this.embedSequence;
    const mountPoint = this.supersetMount?.nativeElement;

    this.unmountDashboard();
    this.errorMessage = '';

    if (!mountPoint) {
      return;
    }

    mountPoint.innerHTML = '';

    if (!this.analyticsEnabled) {
      this.loading = false;
      this.statusMessage = 'Analytics is disabled.';
      return;
    }

    if (!this.supersetDomain) {
      this.loading = false;
      this.statusMessage = 'Dashboard configuration is missing.';
      return;
    }

    this.loading = true;
    this.statusMessage = 'Loading dashboard...';

    try {
      const guestToken = await this.fetchGuestToken(this.selectedTab);

      if (sequence !== this.embedSequence) {
        return;
      }

      const embeddedDashboard = await embedDashboard({
        id: guestToken.dashboardId,
        supersetDomain: this.supersetDomain,
        mountPoint,
        fetchGuestToken: () => Promise.resolve(guestToken.token),
        dashboardUiConfig: {
          hideTitle: false,
          hideTab: false,
          hideChartControls: true,
          filters: {
            expanded: true,
            visible: true
          },
          urlParams: {}
        },
        iframeSandboxExtras: [
          'allow-top-navigation',
          'allow-popups-to-escape-sandbox'
        ],
        referrerPolicy: '*' as ReferrerPolicy
      });

      if (sequence !== this.embedSequence) {
        embeddedDashboard.unmount();
        return;
      }

      this.embeddedDashboard = embeddedDashboard;
      this.statusMessage = '';
    } catch (error) {
      console.error('Failed to embed Superset dashboard', error);
      if (sequence === this.embedSequence) {
        this.errorMessage = 'Unable to load dashboard.';
        this.statusMessage = '';
      }
    } finally {
      if (sequence === this.embedSequence) {
        this.loading = false;
      }
    }
  }

  private async fetchGuestToken(tab: AnalyticsTabKey): Promise<{ dashboardId: string; token: string }> {
    const endpoint = this.resolveBackendUrl(environment.analyticsGuestTokenEndpoint);
    const response = await firstValueFrom(this.http.post<any>(endpoint, { tab }));
    const dashboardId = response?.dashboardId ?? response?.dashboard_id ?? response?.id ?? '';
    const token = this.extractGuestToken(response);

    if (!dashboardId) {
      throw new Error('Guest token endpoint did not return a dashboard id.');
    }
    if (!token) {
      throw new Error('Guest token endpoint did not return a token.');
    }

    return { dashboardId, token };
  }

  private extractGuestToken(response: any): string {
    if (typeof response === 'string') {
      return response;
    }

    return response?.token
      ?? response?.guestToken
      ?? response?.guest_token
      ?? '';
  }

  private resolveBackendUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${environment.BASE_URL}${normalizedEndpoint}`;
  }

  private unmountDashboard(): void {
    this.embeddedDashboard?.unmount();
    this.embeddedDashboard = null;
  }
}
