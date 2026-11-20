import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { PluginInfo } from 'src/app/models/asset-type.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { PluginManagementService } from 'src/app/services/plugin-management.service';
import { isPlatformAdministrator } from 'src/app/shared/auth/platform-admin';
import { formatApiErrorMessage } from 'src/app/shared/error-message/api-error-message';

@Component({
  selector: 'admin-plugins',
  standalone: true,
  imports: [TranslateModule, ConfirmDialogComponent],
  templateUrl: './plugins.component.html'
})
export class PluginsComponent implements OnInit {
  @ViewChild('packageInput') packageInput?: ElementRef<HTMLInputElement>;
  plugins: PluginInfo[] = [];
  file: File | null = null;
  loading = false;
  installing = false;
  pendingDeletion: PluginInfo | null = null;
  deletingId = '';
  deleteError = '';
  deleteSuccess = '';
  deleteUncertain = false;
  listError = '';
  installError = '';
  successMessage = '';
  uncertain = false;
  reconciliationRequired = true;

  constructor(
    private api: PluginManagementService,
    private storage: LocalStorageService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  get isAdmin(): boolean {
    return isPlatformAdministrator(this.storage.getObject('login_items'));
  }

  get canModify(): boolean {
    return this.isAdmin && !this.installing && !this.loading && !this.deletingId && !this.reconciliationRequired;
  }

  get canInstall(): boolean {
    return this.canModify && !!this.file && !this.pendingDeletion;
  }

  ngOnInit(): void {
    this.loadPlugins();
  }

  loadPlugins(): void {
    if (!this.isAdmin || this.loading || this.installing || this.deletingId) return;
    this.pendingDeletion = null;
    this.loading = true;
    this.listError = '';
    this.api.listPlugins().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading = false)
    ).subscribe({
      next: plugins => {
        this.plugins = plugins;
        this.reconciliationRequired = false;
      },
      error: error => {
        this.listError = formatApiErrorMessage(this.translate, 'ADMIN_PLUGINS._list_error', error);
      }
    });
  }

  selectPackage(event: Event): void {
    if (this.installing || this.deletingId) return;
    const files = (event.target as HTMLInputElement).files;
    this.file = null;
    this.installError = '';
    this.successMessage = '';
    if (!files?.length) return;
    const file = files[0];
    if (files.length !== 1 || !file.size || !/\.zip$/i.test(file.name)) {
      this.installError = this.translate.instant('ADMIN_PLUGINS._invalid_file');
      return;
    }
    this.file = file;
  }

  requestDelete(plugin: PluginInfo): void {
    if (!this.canModify) return;
    this.pendingDeletion = plugin;
    this.deleteError = '';
    this.deleteSuccess = '';
    this.deleteUncertain = false;
    this.successMessage = '';
  }

  confirmDelete(): void {
    if (!this.canModify || !this.pendingDeletion) return;
    const plugin = this.pendingDeletion;
    this.pendingDeletion = null;
    this.deletingId = plugin.id;
    this.api.deletePlugin(plugin.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.deletingId = '')
    ).subscribe({
      next: () => {
        this.deletingId = '';
        this.deleteSuccess = this.translate.instant('ADMIN_PLUGINS._delete_success', { name: plugin.name });
        this.reconciliationRequired = true;
        this.loadPlugins();
      },
      error: error => {
        this.deletingId = '';
        const keys: Record<number, string> = {
          401: '_unauthorized', 403: '_forbidden', 404: '_delete_not_found', 409: '_delete_conflict'
        };
        this.deleteError = formatApiErrorMessage(this.translate,
          'ADMIN_PLUGINS.' + (keys[error.status] || '_delete_error'), error);
        this.deleteUncertain = !error.status || error.status === 408 || error.status >= 500;
        if (error.status === 404 || this.deleteUncertain) {
          this.reconciliationRequired = true;
          this.loadPlugins();
        }
      }
    });
  }

  install(): void {
    if (!this.canInstall) return;
    this.installing = true;
    this.deleteError = '';
    this.deleteSuccess = '';
    this.deleteUncertain = false;
    this.installError = '';
    this.successMessage = '';
    this.uncertain = false;
    this.api.installPlugin(this.file!).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.installing = false)
    ).subscribe({
      next: response => {
        this.installing = false;
        this.successMessage = this.translate.instant('ADMIN_PLUGINS._success', {
          name: response.body?.name || this.file?.name,
          version: response.body?.version || ''
        });
        this.file = null;
        if (this.packageInput) this.packageInput.nativeElement.value = '';
        this.reconciliationRequired = true;
        this.loadPlugins();
      },
      error: error => {
        this.installing = false;
        const keys: Record<number, string> = {
          400: '_bad_package', 401: '_unauthorized', 403: '_forbidden', 405: '_method_error',
          409: '_conflict', 413: '_too_large', 415: '_multipart_error', 422: '_invalid_package',
          502: '_catalog_error', 503: '_unavailable'
        };
        this.installError = formatApiErrorMessage(this.translate,
          'ADMIN_PLUGINS.' + (keys[error.status] || '_install_error'), error);
        this.uncertain = !error.status || error.status === 408 || error.status >= 500;
        if (this.uncertain) {
          this.reconciliationRequired = true;
          this.loadPlugins();
        }
      }
    });
  }
}
