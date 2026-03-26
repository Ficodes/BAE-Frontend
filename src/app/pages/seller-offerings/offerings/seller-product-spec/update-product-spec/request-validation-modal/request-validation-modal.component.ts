import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { LoginInfo } from 'src/app/models/interfaces';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';

type ValidationEvidenceRow = {
  type: string;
  name: string;
  value: string;
  missing: boolean;
};
type OrganizationInfo = {
  organizationName: string;
  organizationVat: string;
  organizationAddress: string;
  organizationCountry: string;
  organizationWebsite: string;
  organizationEmail: string;
};

@Component({
  selector: 'request-validation-modal',
  templateUrl: './request-validation-modal.component.html',
  styleUrl: './request-validation-modal.component.css'
})
export class RequestValidationModalComponent implements OnChanges {
  @Input() showModal: boolean = false;
  @Input() productSpec: any;
  @Input() selfAtt: any;
  @Input() selectedISOS: any[] = [];
  @Input() additionalISOS: any[] = [];
  requestValidationLoading: boolean = false;
  requestValidationError: string = '';
  organizationInfo: OrganizationInfo = this.getEmptyOrganizationInfo();

  @Output() closeModal = new EventEmitter<void>();

  constructor(
    private localStorage: LocalStorageService,
    private accountService: AccountServiceService,
    private prodSpecService: ProductSpecServiceService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showModal']?.currentValue === true) {
      this.requestValidationError = '';
      this.loadOrganizationInfoFromCurrentSession();
    }
  }

  get validationEvidenceRows(): ValidationEvidenceRow[] {
    const rows: ValidationEvidenceRow[] = [];
    const selfAttestationValue = this.selfAtt?.productSpecCharacteristicValue?.[0]?.value ?? '';

    rows.push({
      type: 'Self attestation',
      name: 'Self attestation',
      value: selfAttestationValue,
      missing: !selfAttestationValue
    });

    for (const certification of this.selectedISOS) {
      const value = certification?.url ?? '';
      rows.push({
        type: 'Third-party certification',
        name: this.normalizeName(certification?.name),
        value,
        missing: !value
      });
    }

    for (const certification of this.additionalISOS) {
      const value = certification?.url ?? '';
      rows.push({
        type: 'Additional certification',
        name: this.normalizeName(certification?.name),
        value,
        missing: !value
      });
    }

    return rows;
  }

  normalizeName(name?: string): string {
    return name?.replace(/compliance:/i, '').trim() ?? '';
  }

  isHttpUrl(value?: string): boolean {
    return /^https?:\/\//i.test(value ?? '');
  }

  hasMissingOrganizationInfo(): boolean {
    return [
      this.organizationInfo.organizationName,
      this.organizationInfo.organizationVat,
      this.organizationInfo.organizationAddress,
      this.organizationInfo.organizationCountry,
      this.organizationInfo.organizationWebsite,
      this.organizationInfo.organizationEmail
    ].some((value) => this.isMissing(value));
  }

  isMissing(value?: string): boolean {
    return !value || value.trim() === '';
  }

  submitRequestValidation(): void {
    if (this.hasMissingOrganizationInfo() || this.requestValidationLoading) {
      return;
    }

    if (!this.productSpec) {
      this.requestValidationError = 'Product specification information is not available.';
      return;
    }

    this.requestValidationLoading = true;
    this.requestValidationError = '';

    this.prodSpecService.requestComplianceCertificate(this.buildRequestPayload(this.productSpec)).subscribe({
      next: () => {
        this.requestValidationLoading = false;
        this.closeModal.emit();
      },
      error: (error) => {
        console.error('There was an error while requesting validation!', error);
        this.requestValidationLoading = false;
        this.requestValidationError = this.extractErrorMessage(error);
      }
    });
  }

  private async loadOrganizationInfoFromCurrentSession(): Promise<void> {
    const organizationPartyId = this.getOrganizationPartyId();
    if (!organizationPartyId) {
      this.organizationInfo = this.getEmptyOrganizationInfo();
      return;
    }

    try {
      const organization = await this.accountService.getOrgInfo(organizationPartyId);
      this.organizationInfo = this.mapOrganizationInfo(organization);
    } catch (error) {
      console.error('There was an error while loading organization info!', error);
      this.organizationInfo = this.getEmptyOrganizationInfo();
    }
  }

  private getOrganizationPartyId(): string {
    const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;

    if (!loginInfo || JSON.stringify(loginInfo) === '{}') {
      return '';
    }

    if (loginInfo.logged_as === loginInfo.id) {
      return '';
    }

    const organizations = Array.isArray(loginInfo.organizations) ? loginInfo.organizations : [];
    const loggedOrganization = organizations.find((organization: any) => organization?.id == loginInfo.logged_as);
    return loggedOrganization?.partyId ?? '';
  }

  private mapOrganizationInfo(organization: any): OrganizationInfo {
    const contactMedium = Array.isArray(organization?.contactMedium) ? organization.contactMedium : [];
    const partyCharacteristics = Array.isArray(organization?.partyCharacteristic) ? organization.partyCharacteristic : [];
    const externalReferences = Array.isArray(organization?.externalReference) ? organization.externalReference : [];

    const emailMedium = contactMedium.find((medium: any) => medium?.mediumType === 'Email');
    const postalMedium = contactMedium.find((medium: any) => medium?.mediumType === 'PostalAddress');
    const postalCharacteristic = postalMedium?.characteristic ?? {};
    const characteristicCountry = this.getPartyCharacteristicValue(partyCharacteristics, 'country');

    return {
      organizationName: organization?.tradingName ?? organization?.name ?? '',
      organizationVat: this.getOrganizationVat(externalReferences),
      organizationAddress: this.formatPostalAddress(postalCharacteristic),
      organizationCountry: characteristicCountry,
      organizationWebsite: this.getPartyCharacteristicValue(partyCharacteristics, 'website'),
      organizationEmail: emailMedium?.characteristic?.emailAddress ?? ''
    };
  }

  private getOrganizationVat(externalReferences: any[]): string {
    if (!externalReferences.length) {
      return '';
    }

    const idmReference = externalReferences.find((reference: any) =>
      (reference?.externalReferenceType ?? '').toLowerCase() === 'idm_id'
    );

    return idmReference?.name ?? '';
  }

  private getPartyCharacteristicValue(characteristics: any[], key: string): string {
    const characteristic = characteristics.find((item: any) => item?.name === key);
    return characteristic?.value ?? '';
  }

  private formatPostalAddress(address: any): string {
    if (!address) {
      return '';
    }

    return [
      address.street1,
      address.postCode,
      address.city,
      address.stateOrProvince
    ].filter((value: any) => !!value).join(', ');
  }

  private getEmptyOrganizationInfo(): OrganizationInfo {
    return {
      organizationName: '',
      organizationVat: '',
      organizationAddress: '',
      organizationCountry: '',
      organizationWebsite: '',
      organizationEmail: ''
    };
  }

  private buildRequestPayload(productSpec: any): any {
    return JSON.parse(JSON.stringify(productSpec));
  }

  private extractErrorMessage(error: any): string {
    const message = error?.error?.error ?? error?.error?.message ?? error?.message;
    return message ? `Error: ${message}` : 'Error: there was a problem requesting the validation.';
  }
}
