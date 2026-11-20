import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environments/environment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [AdminComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows plugin navigation for platform admins and returns to other sections', () => {
    spyOn(TestBed.inject(LocalStorageService), 'getObject').and.returnValue({
      expire: Date.now() / 1000 + 3600, roles: [{ name: environment.ADMIN_ROLE }]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="adminPluginsSection"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="adminPluginsMobileSection"]')).not.toBeNull();
    component.goToPlugins();
    expect(component.show_plugins).toBeTrue();
    expect(component.show_categories).toBeFalse();
    expect(fixture.nativeElement.querySelector('admin-plugins')).not.toBeNull();
    component.goToCategories();
    expect(component.show_plugins).toBeFalse();
    expect(fixture.nativeElement.querySelector('admin-plugins')).toBeNull();
  });

  it('hides plugin navigation from certifiers and organization administrators', () => {
    spyOn(TestBed.inject(LocalStorageService), 'getObject').and.returnValue({
      expire: Date.now() / 1000 + 3600, roles: [{ name: 'certifier' }],
      organizations: [{ roles: [{ name: environment.ADMIN_ROLE }] }]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="adminPluginsSection"]')).toBeNull();
    component.goToPlugins();
    expect(component.show_plugins).toBeFalse();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
