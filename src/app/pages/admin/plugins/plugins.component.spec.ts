import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { PluginInfo } from 'src/app/models/asset-type.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { PluginManagementService } from 'src/app/services/plugin-management.service';
import { environment } from 'src/environments/environment';
import { PluginsComponent } from './plugins.component';

describe('PluginsComponent', () => {
  let api: jasmine.SpyObj<PluginManagementService>;
  let fixture: ComponentFixture<PluginsComponent>;
  let component: PluginsComponent;
  let login: any;
  const plugin: PluginInfo = {
    id: 'logging', href: '/plugins/logging', name: 'Logging', type: 'service', author: 'Provider',
    version: '1.0', categoryId: 'category', mediaTypes: [], requiresFile: false, overrides: []
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj('api', ['listPlugins', 'installPlugin', 'deletePlugin']);
    api.listPlugins.and.returnValue(of([plugin, { ...plugin, id: 'resource', type: 'resource' }]));
    api.deletePlugin.and.returnValue(of(undefined));
    api.installPlugin.and.returnValue(of(new HttpResponse({ body: plugin })));
    login = { expire: Date.now() / 1000 + 3600, roles: [{ name: environment.ADMIN_ROLE }] };
    await TestBed.configureTestingModule({
      imports: [PluginsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PluginManagementService, useValue: api },
        { provide: LocalStorageService, useValue: { getObject: () => login } }
      ]
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { ERRORS: { _reason: '{{reason}}' }, ADMIN_PLUGINS: {
      _success: 'Installed {{name}} {{version}}', _conflict: 'Version conflict', _invalid_file: 'Invalid ZIP'
    } });
    translate.use('en');
    fixture = TestBed.createComponent(PluginsComponent);
    component = fixture.componentInstance;
  });

  function initialize(): void { fixture.detectChanges(); }
  function select(files = [new File(['zip'], 'plugin.zip')]): void {
    component.selectPackage({ target: { files } } as unknown as Event);
    fixture.detectChanges();
  }

  it('lists service and resource plugins', () => {
    initialize();
    expect(fixture.nativeElement.querySelectorAll('[data-cy="adminPluginRow"]').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Logging');
    expect(component.canInstall).toBeFalse();
  });

  for (const roles of [[], [{ name: 'seller' }], [{ name: 'certifier' }]]) {
    it('blocks access without a personal platform administrator role: ' + JSON.stringify(roles), () => {
      login.roles = roles;
      login.organizations = [{ roles: [{ name: environment.ADMIN_ROLE }] }];
      initialize();
      select();
      component.install();
      expect(api.listPlugins).not.toHaveBeenCalled();
      expect(api.installPlugin).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  }

  it('blocks expired sessions', () => {
    login.expire = 0;
    initialize();
    expect(component.isAdmin).toBeFalse();
    expect(api.listPlugins).not.toHaveBeenCalled();
  });

  it('rejects empty, non-ZIP, and multiple packages before submitting', () => {
    initialize();
    for (const files of [
      [new File([], 'empty.zip')], [new File(['text'], 'plugin.txt')],
      [new File(['a'], 'a.zip'), new File(['b'], 'b.zip')]
    ]) {
      select(files);
      component.install();
      expect(component.installError).toBe('Invalid ZIP');
      expect(component.canInstall).toBeFalse();
    }
    expect(api.installPlugin).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions and refreshes after installing a newer version', () => {
    const pending = new Subject<HttpResponse<PluginInfo>>();
    api.installPlugin.and.returnValue(pending);
    initialize();
    select();
    const file = component.file;
    component.install();
    fixture.detectChanges();
    component.install();
    expect(api.installPlugin).toHaveBeenCalledOnceWith(file!);
    expect(fixture.nativeElement.querySelector('[data-cy="adminInstallPlugin"]').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('input').disabled).toBeTrue();
    const upgraded = { ...plugin, version: '2.0' };
    api.listPlugins.and.returnValue(of([upgraded]));
    pending.next(new HttpResponse({ body: upgraded }));
    pending.complete();
    expect(api.listPlugins).toHaveBeenCalledTimes(2);
    expect(component.plugins).toEqual([upgraded]);
    expect(component.successMessage).toBe('Installed Logging 2.0');
    expect(component.file).toBeNull();
    expect(component.installing).toBeFalse();
  });

  it('shows server validation/conflict details without retrying automatically', () => {
    initialize();
    select();
    api.installPlugin.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { result: 'error', error: 'Version must be newer' }
    })));
    component.install();
    expect(component.installError).toContain('Version conflict');
    expect(component.installError).toContain('Version must be newer');
    expect(api.installPlugin).toHaveBeenCalledTimes(1);
    expect(component.installing).toBeFalse();
    expect(component.uncertain).toBeFalse();
  });

  for (const status of [0, 500, 502, 503]) {
    it('refreshes after an uncertain installation outcome: HTTP ' + status, () => {
      initialize();
      select();
      const refreshed = new Subject<PluginInfo[]>();
      api.listPlugins.and.returnValue(refreshed);
      api.installPlugin.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.install();
      component.install();
      expect(component.uncertain).toBeTrue();
      expect(component.canInstall).toBeFalse();
      expect(api.listPlugins).toHaveBeenCalledTimes(2);
      expect(api.installPlugin).toHaveBeenCalledTimes(1);
      refreshed.next([plugin]);
      refreshed.complete();
      expect(component.canInstall).toBeTrue();
    });
  }

  it('requires a successful refresh before retrying if reconciliation fails', () => {
    initialize();
    select();
    api.listPlugins.and.returnValue(throwError(() => new Error('Offline')));
    api.installPlugin.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.install();
    expect(component.listError).toBeTruthy();
    expect(component.canInstall).toBeFalse();
    component.install();
    expect(api.installPlugin).toHaveBeenCalledTimes(1);
    api.listPlugins.and.returnValue(of([plugin]));
    component.loadPlugins();
    expect(component.canInstall).toBeTrue();
  });

  it('requires confirmation, supports cancel, and refreshes after deletion', () => {
    initialize();
    const deleteButton = fixture.nativeElement.querySelector('[data-cy="adminDeletePlugin"]');
    deleteButton.click();
    fixture.detectChanges();
    expect(api.deletePlugin).not.toHaveBeenCalled();
    const modal = fixture.nativeElement.querySelector('app-confirm-dialog');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('ADMIN_PLUGINS._delete_confirm');
    expect(modal.closest('table')).toBeNull();
    expect(component.canInstall).toBeFalse();
    fixture.nativeElement.querySelector('app-confirm-dialog button:first-child').click();
    fixture.detectChanges();
    expect(component.pendingDeletion).toBeNull();
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
    expect(api.deletePlugin).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[data-cy="adminDeletePlugin"]').click();
    fixture.detectChanges();
    api.listPlugins.and.returnValue(of([]));
    fixture.nativeElement.querySelector('app-confirm-dialog button:last-child').click();
    expect(api.deletePlugin).toHaveBeenCalledOnceWith(plugin.id);
    expect(api.listPlugins).toHaveBeenCalledTimes(2);
    expect(component.plugins).toEqual([]);
    expect(component.deleteSuccess).toBeTruthy();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('blocks installation, refresh, and duplicate deletion while deletion is pending', () => {
    initialize();
    select();
    const pending = new Subject<void>();
    api.deletePlugin.and.returnValue(pending);
    component.requestDelete(plugin);
    component.confirmDelete();
    component.requestDelete(plugin);
    component.confirmDelete();
    component.install();
    component.loadPlugins();
    fixture.detectChanges();
    expect(api.deletePlugin).toHaveBeenCalledOnceWith(plugin.id);
    expect(api.installPlugin).not.toHaveBeenCalled();
    expect(api.listPlugins).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[data-cy="adminInstallPlugin"]').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-cy="adminDeletePlugin"]').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-cy="adminRefreshPlugins"]').disabled).toBeTrue();
    pending.next();
    pending.complete();
    expect(component.deletingId).toBe('');
  });

  it('does not allow deletion by non-admins or during installation', () => {
    initialize();
    component.installing = true;
    component.requestDelete(plugin);
    expect(component.pendingDeletion).toBeNull();
    component.installing = false;
    component.requestDelete(plugin);
    login.roles = [];
    component.confirmDelete();
    expect(api.deletePlugin).not.toHaveBeenCalled();
  });

  for (const status of [401, 403, 409]) {
    it('preserves the plugin and reports deletion errors: HTTP ' + status, () => {
      initialize();
      api.deletePlugin.and.returnValue(throwError(() => new HttpErrorResponse({
        status, error: { error: 'Deletion rejected' }
      })));
      component.requestDelete(plugin);
      component.confirmDelete();
      expect(component.deleteError).toContain('Deletion rejected');
      expect(component.plugins).toContain(plugin);
      expect(component.deletingId).toBe('');
      expect(api.listPlugins).toHaveBeenCalledTimes(1);
      expect(api.deletePlugin).toHaveBeenCalledTimes(1);
    });
  }

  it('refreshes a stale list when the plugin has already been removed', () => {
    initialize();
    api.deletePlugin.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    api.listPlugins.and.returnValue(of([]));
    component.requestDelete(plugin);
    component.confirmDelete();
    expect(component.deleteError).toContain('ADMIN_PLUGINS._delete_not_found');
    expect(component.plugins).toEqual([]);
    expect(api.listPlugins).toHaveBeenCalledTimes(2);
  });

  for (const status of [0, 500]) {
    it('requires reconciliation after an uncertain deletion: HTTP ' + status, () => {
      initialize();
      api.deletePlugin.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      api.listPlugins.and.returnValue(throwError(() => new Error('Offline')));
      component.requestDelete(plugin);
      component.confirmDelete();
      expect(component.deleteUncertain).toBeTrue();
      expect(component.reconciliationRequired).toBeTrue();
      expect(component.canModify).toBeFalse();
      component.requestDelete(plugin);
      component.confirmDelete();
      expect(api.deletePlugin).toHaveBeenCalledTimes(1);
      api.listPlugins.and.returnValue(of([]));
      component.loadPlugins();
      expect(component.canModify).toBeTrue();
      expect(component.plugins).toEqual([]);
    });
  }

  it('recovers from an initial list error and displays the empty state', () => {
    api.listPlugins.and.returnValue(throwError(() => new Error('Offline')));
    initialize();
    select();
    expect(component.canInstall).toBeFalse();
    api.listPlugins.and.returnValue(of([]));
    component.loadPlugins();
    fixture.detectChanges();
    expect(component.listError).toBe('');
    expect(fixture.nativeElement.textContent).toContain('ADMIN_PLUGINS._empty');
    expect(component.canInstall).toBeTrue();
  });
});
