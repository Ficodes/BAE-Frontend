import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import moment from 'moment';
import { euCountries } from '../../models/country.const';
import { LoginInfo } from '../../models/interfaces';
import { AccountServiceService } from '../../services/account-service.service';
import { EventMessageService } from '../../services/event-message.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { environment } from '../../../environments/environment';

interface OrganizationProfile {
  partyCharacteristic?: { name?: string; value?: unknown }[];
  contactMedium?: {
    mediumType?: string;
    preferred?: boolean;
    characteristic?: { contactType?: string; emailAddress?: string };
  }[];
}

interface PaymentInfo {
  gatewaysCount?: number | string | null;
  providerUrl?: string | null;
}

interface OrganizationContext {
  key: string;
  partyId: string;
  name: string;
  canEdit: boolean;
}

@Component({
  selector: 'app-organization-profile-notice',
  standalone: true,
  imports: [CommonModule, A11yModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './organization-profile-notice.component.html',
  host: { '[attr.aria-busy]': 'checking' }
})
export class OrganizationProfileNoticeComponent implements OnInit, OnDestroy {
  isOpen = false;
  checking = false;
  saving = false;
  canEdit = false;
  loadFailed = false;
  saveFailed = false;
  saveErrorMessage = '';
  missingCountry = false;
  missingEmail = false;
  missingPaymentInfo = false;
  organizationName = '';
  readonly countries = euCountries;
  readonly form = new FormGroup({
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.email,
      Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'),
      Validators.maxLength(320)
    ] })
  });

  private contextKey = '';
  private contextVersion = 0;
  private readonly contextChanged$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly localStorage: LocalStorageService,
    private readonly accountService: AccountServiceService,
    private readonly eventMessage: EventMessageService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly translate: TranslateService
  ) {}

  get missingDetails(): string {
    const keys: string[] = [];
    if (this.missingCountry) keys.push('_required_country');
    if (this.missingEmail) keys.push('_required_email');
    if (this.missingPaymentInfo) keys.push('_required_payment_info');
    const details: string[] = keys.map(key => this.translate.instant(`ORGANIZATION_PROFILE_NOTICE.${key}`));
    const last = details[details.length - 1];
    if (details.length <= 1) return last ?? '';
    return `${details.slice(0, -1).join(', ')} ${this.translate.instant('ORGANIZATION_PROFILE_NOTICE._and')} ${last}`;
  }

  ngOnInit(): void {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.type === 'LoginProcess' || event.type === 'ChangedSession') {
        void this.checkOrganization(event.type === 'LoginProcess');
      }
    });
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => void this.checkOrganization());
    void this.checkOrganization();
  }

  ngOnDestroy(): void {
    this.contextKey = '';
    this.contextVersion++;
    this.destroy$.next();
    this.destroy$.complete();
    this.contextChanged$.complete();
  }

  dismiss(): void {
    this.isOpen = false;
  }

  async checkOrganization(force = false): Promise<void> {
    const context = this.getContext();
    const key = context?.key ?? '';
    if (!force && key === this.contextKey) return;

    const version = ++this.contextVersion;
    this.contextChanged$.next();
    this.contextKey = key;
    this.isOpen = false;
    this.checking = false;
    this.saving = false;
    this.loadFailed = false;
    this.saveFailed = false;
    this.saveErrorMessage = '';
    this.missingPaymentInfo = false;
    if (!context) return;

    this.checking = true;
    this.canEdit = context.canEdit;
    this.organizationName = context.name;
    try {
      const [profile, paymentInfo]: [OrganizationProfile, PaymentInfo] = await Promise.all([
        this.accountService.getOrgInfo(context.partyId),
        firstValueFrom(this.http.get<PaymentInfo>(`${environment.BASE_URL}/paymentInfo`).pipe(
          takeUntil(this.contextChanged$),
          takeUntil(this.destroy$)
        ))
      ]);
      if (!this.isCurrentContext(context.key, version)) return;
      this.missingCountry = !this.hasCountry(profile);
      this.missingEmail = !this.hasEmail(profile);
      this.missingPaymentInfo = Number(paymentInfo?.gatewaysCount ?? 0) === 0;
      this.form.enable();
      this.form.reset({ country: '', email: '' });
      if (!this.missingCountry) this.form.controls.country.disable();
      if (!this.missingEmail) this.form.controls.email.disable();
      this.isOpen = this.missingCountry || this.missingEmail || this.missingPaymentInfo;
    } catch {
      if (!this.isCurrentContext(context.key, version)) return;
      this.loadFailed = true;
      this.isOpen = true;
    } finally {
      if (this.isCurrentContext(context.key, version)) this.checking = false;
    }
  }

  async openPaymentDashboard(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<PaymentInfo>(`${environment.BASE_URL}/paymentInfo`).pipe(
        takeUntil(this.contextChanged$),
        takeUntil(this.destroy$)
      ));
      if (data.providerUrl) window.open(data.providerUrl, '_blank', 'noopener,noreferrer');
    } catch {
    }
  }

  async save(): Promise<void> {
    const context = this.getContext();
    if (!context?.canEdit || context.key !== this.contextKey || !this.isOpen || this.loadFailed || this.saving) return;
    if (!this.missingCountry && !this.missingEmail) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const version = this.contextVersion;
    const values = this.form.getRawValue();
    this.saving = true;
    this.saveFailed = false;
    this.saveErrorMessage = '';
    try {
      // Read again so changes made since opening the notice are preserved.
      const profile: OrganizationProfile = await this.accountService.getOrgInfo(context.partyId);
      if (!this.isCurrentContext(context.key, version)) return;
      const patch: OrganizationProfile = {};
      if (this.missingCountry && !this.hasCountry(profile)) {
        const characteristics = [...(profile.partyCharacteristic ?? [])];
        const index = characteristics.findIndex(item => item.name === 'country');
        const country = { ...characteristics[index], name: 'country', value: values.country };
        if (index < 0) characteristics.push(country);
        else characteristics[index] = country;
        patch.partyCharacteristic = characteristics;
      }
      if (this.missingEmail && !this.hasEmail(profile)) {
        patch.contactMedium = [...(profile.contactMedium ?? []), {
          mediumType: 'Email',
          preferred: true,
          characteristic: {
            contactType: 'Email',
            emailAddress: values.email
          }
        }];
      }
      if (Object.keys(patch).length > 0) {
        await firstValueFrom(this.accountService.updateOrgInfo(context.partyId, patch).pipe(
          takeUntil(this.contextChanged$),
          takeUntil(this.destroy$)
        ));
      }
      if (!this.isCurrentContext(context.key, version)) return;
      this.missingCountry = false;
      this.missingEmail = false;
      this.form.disable();
      this.isOpen = this.missingPaymentInfo;
      this.eventMessage.emitOrganizationProfileUpdated(context.partyId);
    } catch (error) {
      if (this.isCurrentContext(context.key, version)) {
        this.saveFailed = true;
        const response = (error as { error?: { message?: unknown; error?: unknown } } | null)?.error;
        const message = response?.message ?? response?.error;
        this.saveErrorMessage = typeof message === 'string' ? message : '';
      }
    } finally {
      if (this.isCurrentContext(context.key, version)) this.saving = false;
    }
  }

  private getContext(): OrganizationContext | null {
    const session = this.localStorage.getObject('login_items') as LoginInfo | null;
    if (!session?.id || !session.logged_as || !Number.isFinite(session.expire) || session.expire <= moment().unix() + 4 || session.logged_as === session.id) return null;
    const organization = session.organizations?.find(item => item.id === session.logged_as);
    if (!organization?.partyId) return null;
    const canEdit = (organization.roles ?? []).some((role: { name?: string }) => role.name === environment.ORG_ADMIN_ROLE);
    return {
      key: JSON.stringify([session.id, organization.id, organization.partyId, canEdit]),
      partyId: organization.partyId,
      name: organization.name || organization.id,
      canEdit
    };
  }

  private isCurrentContext(key: string, version: number): boolean {
    return this.contextVersion === version && this.contextKey === key && this.getContext()?.key === key;
  }

  private hasCountry(profile: OrganizationProfile): boolean {
    return (profile.partyCharacteristic ?? []).some(item =>
      item.name === 'country' && item.value !== undefined && item.value !== null
    );
  }

  private isEmailMedium(medium: NonNullable<OrganizationProfile['contactMedium']>[number]): boolean {
    return medium.mediumType?.toLowerCase() === 'email';
  }

  private hasEmail(profile: OrganizationProfile): boolean {
    return (profile.contactMedium ?? []).some(medium => this.isEmailMedium(medium));
  }
}
