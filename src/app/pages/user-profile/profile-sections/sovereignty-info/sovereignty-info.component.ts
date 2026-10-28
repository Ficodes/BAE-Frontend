import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { LoginInfo } from 'src/app/models/interfaces';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environments/environment';

interface SovereigntyObjective {
  code: string;
  label: string;
  score: string | null;
}

interface ParsedAssessment {
  score: string;
  seal: string;
  objectives: Record<string, string>;
}

interface StoredAssessment extends ParsedAssessment {
  public: boolean;
  importedAt: string;
}

const ASSESSMENT_CHARACTERISTIC = 'sovereigntyAssessment';

@Component({
  selector: 'sovereignty-info',
  templateUrl: './sovereignty-info.component.html'
})
export class SovereigntyInfoComponent implements OnInit {
  objectives: SovereigntyObjective[] = [
    { code: 'SOV-1', label: 'PROFILE._sov_strategic', score: null },
    { code: 'SOV-2', label: 'PROFILE._sov_legal', score: null },
    { code: 'SOV-3', label: 'PROFILE._sov_data_ai', score: null },
    { code: 'SOV-4', label: 'PROFILE._sov_operational', score: null },
    { code: 'SOV-5', label: 'PROFILE._sov_supply_chain', score: null },
    { code: 'SOV-6', label: 'PROFILE._sov_technology', score: null },
    { code: 'SOV-7', label: 'PROFILE._sov_security', score: null },
    { code: 'SOV-8', label: 'PROFILE._sov_environmental', score: null }
  ];
  sovereigntyScore: string | null = null;
  overallSeal: string | null = null;
  showOnPublicProfile: boolean = false;

  showImportModal: boolean = false;
  reportFile: File | null = null;
  reportError: string | null = null;
  reportDragOver: boolean = false;
  pendingAssessment: ParsedAssessment | null = null;
  partyId: string = '';
  isReadOnly: boolean = true;
  saving: boolean = false;
  storedAssessment: StoredAssessment | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private localStorage: LocalStorageService
  ) {}

  ngOnInit() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) == '{}' || ((aux.expire - moment().unix()) - 4) <= 0 || aux.logged_as == aux.id) return;
    const loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
    if (!loggedOrg) return;
    this.partyId = loggedOrg.partyId;
    this.isReadOnly = !(loggedOrg.roles || []).some((role: any) => role.name === environment.ORG_ADMIN_ROLE);
    this.accountService.getOrgInfo(this.partyId).then(org => {
      const stored = (org?.partyCharacteristic ?? []).find((c: any) => c.name === ASSESSMENT_CHARACTERISTIC)?.value;
      if (stored?.score) this.applyAssessment(stored);
      this.cdr.detectChanges();
    });
  }

  get hasAssessment(): boolean {
    return this.sovereigntyScore != null;
  }

  get frameworkUrl(): string {
    return environment.SOVEREIGNTY_FRAMEWORK_URL;
  }

  togglePublicProfile() {
    if (!this.storedAssessment || this.isReadOnly || this.saving) return;
    const previous = this.storedAssessment;
    const updated = { ...previous, public: !previous.public };
    this.applyAssessment(updated);
    this.saveAssessment(updated).catch(() => this.applyAssessment(previous));
  }

  openImportModal() {
    this.reportFile = null;
    this.pendingAssessment = null;
    this.reportError = null;
    this.reportDragOver = false;
    this.showImportModal = true;
  }

  @HostListener('document:keydown.escape')
  closeImportModal() {
    this.showImportModal = false;
    this.reportFile = null;
    this.pendingAssessment = null;
    this.reportError = null;
    this.reportDragOver = false;
  }

  reportDropped(files: NgxFileDropEntry[]) {
    this.reportDragOver = false;
    const entry = files.find(f => f.fileEntry.isFile);
    if (!entry) return;
    (entry.fileEntry as FileSystemFileEntry).file((file: File) => {
      if (!/\.txt$/i.test(file.name)) {
        this.rejectReport('PROFILE._import_assessment_invalid');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = this.parseAssessmentReport(reader.result as string);
        if (parsed) {
          this.reportFile = file;
          this.pendingAssessment = parsed;
          this.reportError = null;
          this.cdr.detectChanges();
        } else {
          this.rejectReport('PROFILE._import_assessment_unrecognized');
        }
      };
      reader.onerror = () => this.rejectReport('PROFILE._import_assessment_read_error');
      reader.readAsText(file);
    });
  }

  removeReportFile() {
    this.reportFile = null;
    this.pendingAssessment = null;
    this.reportError = null;
  }

  importResults() {
    const parsed = this.pendingAssessment;
    if (!parsed || this.saving) return;
    const assessment: StoredAssessment = {
      ...parsed,
      public: this.storedAssessment?.public ?? true,
      importedAt: new Date().toISOString()
    };
    this.saveAssessment(assessment)
      .then(() => {
        this.applyAssessment(assessment);
        this.closeImportModal();
      })
      .catch(() => this.reportError = 'PROFILE._import_assessment_save_error');
  }

  private applyAssessment(assessment: StoredAssessment) {
    this.storedAssessment = assessment;
    this.objectives = this.objectives.map(o => ({ ...o, score: assessment.objectives?.[o.code] ?? null }));
    this.sovereigntyScore = assessment.score;
    this.overallSeal = assessment.seal;
    this.showOnPublicProfile = assessment.public !== false;
  }

  private async saveAssessment(assessment: StoredAssessment) {
    this.saving = true;
    try {
      const org = await this.accountService.getOrgInfo(this.partyId);
      const chars = (org?.partyCharacteristic ?? []).filter((c: any) => c.name !== ASSESSMENT_CHARACTERISTIC);
      chars.push({ name: ASSESSMENT_CHARACTERISTIC, value: assessment });
      await lastValueFrom(this.accountService.updateOrgInfo(this.partyId, { partyCharacteristic: chars }));
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private rejectReport(error: string) {
    this.reportFile = null;
    this.pendingAssessment = null;
    this.reportError = error;
    this.cdr.detectChanges();
  }

  private parseAssessmentReport(text: string): ParsedAssessment | null {
    const report = text.replace(/[\u2010-\u2015\u2212]/g, '-');
    const score = report.match(/Sovereignty Score\s*:\s*(\d+(?:[.,]\d+)?)\s*%/i);
    const seal = report.match(/^\s*SEAL\b[^:\n]*:\s*SEAL-(\d)/im);
    if (!score || !seal) return null;
    const objectives: Record<string, string> = {};
    for (const match of report.matchAll(/^\s*SOV-([1-8])\b[^\n]*?:\s*(\d+(?:[.,]\d+)?)\s*%/gim)) {
      objectives['SOV-' + match[1]] ??= match[2] + '%';
    }
    if (this.objectives.some(o => !objectives[o.code])) return null;
    return { score: score[1] + '%', seal: 'SEAL-' + seal[1], objectives };
  }
}
