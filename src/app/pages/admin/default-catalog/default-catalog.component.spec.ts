import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DefaultCatalogComponent } from './default-catalog.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';

describe('DefaultCatalogComponent', () => {
  let component: DefaultCatalogComponent;
  let fixture: ComponentFixture<DefaultCatalogComponent>;
  let api: jasmine.SpyObj<ApiServiceService>;
  let originalDefaultCatalogId: string;

  beforeEach(async () => {
    originalDefaultCatalogId = environment.DFT_CATALOG_ID;
    environment.DFT_CATALOG_ID = '';

    api = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getCatalog',
      'updateAdminCatalog',
      'createDefaultCatalog',
      'setDefaultCatalog'
    ]);

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      declarations: [DefaultCatalogComponent],
      providers: [
        { provide: ApiServiceService, useValue: api }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DefaultCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    environment.DFT_CATALOG_ID = originalDefaultCatalogId;
  });

  it('should create a missing default catalog in one request', async () => {
    api.createDefaultCatalog.and.returnValue(of({ id: 'catalog-1' }));
    component.defaultCatalogForm.setValue({
      name: ' Default Catalog ',
      description: 'Main marketplace catalog'
    });

    await component.saveDefaultCatalog();

    expect(api.createDefaultCatalog).toHaveBeenCalledOnceWith({
      name: 'Default Catalog',
      description: 'Main marketplace catalog'
    });
    expect(api.updateAdminCatalog).not.toHaveBeenCalled();
    expect(api.setDefaultCatalog).not.toHaveBeenCalled();
    expect(component.defaultCatalogId).toBe('catalog-1');
    expect(environment.DFT_CATALOG_ID).toBe('catalog-1');
  });

  it('should keep updating an existing default catalog through the update flow', async () => {
    component.defaultCatalogId = 'catalog-1';
    api.updateAdminCatalog.and.returnValue(of({}));
    api.setDefaultCatalog.and.returnValue(of({}));
    component.defaultCatalogForm.setValue({
      name: 'Default Catalog',
      description: 'Updated description'
    });

    await component.saveDefaultCatalog();

    expect(api.updateAdminCatalog).toHaveBeenCalledOnceWith({
      name: 'Default Catalog',
      description: 'Updated description',
      lifecycleStatus: 'Active'
    }, 'catalog-1');
    expect(api.setDefaultCatalog).toHaveBeenCalledOnceWith('catalog-1');
    expect(api.createDefaultCatalog).not.toHaveBeenCalled();
  });
});
