import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SearchFiltersConfigComponent } from './search-filters-config.component';

describe('SearchFiltersConfigComponent', () => {
  let component: SearchFiltersConfigComponent;
  let fixture: ComponentFixture<SearchFiltersConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SearchFiltersConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchFiltersConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default offer form placement to none', () => {
    const mapped = (component as any).mapRuntimeFilter({
      name: 'businessDomain',
      source: 'categoryRoot',
      rootName: 'Business Domains'
    });

    expect(mapped.offerFormPlacement).toBe('none');
  });

  it('should include generalInfo placement for one category root filter', () => {
    component.filtersArray.push((component as any).createFilterGroup({
      name: 'businessDomain',
      label: 'Business domain',
      source: 'categoryRoot',
      rootName: 'Business Domains',
      offerFormPlacement: 'generalInfo',
      options: []
    }));

    const payload = (component as any).buildFiltersPayload();

    expect(payload).toEqual([
      {
        name: 'businessDomain',
        label: 'Business domain',
        source: 'categoryRoot',
        rootName: 'Business Domains',
        offerFormPlacement: 'generalInfo'
      }
    ]);
  });

  it('should include categorySection placement for category root filters', () => {
    component.filtersArray.push((component as any).createFilterGroup({
      name: 'deploymentModel',
      label: 'Deployment model',
      source: 'categoryRoot',
      rootName: 'Deployment Models',
      offerFormPlacement: 'categorySection',
      options: []
    }));

    const payload = (component as any).buildFiltersPayload();

    expect(payload).toEqual([
      {
        name: 'deploymentModel',
        label: 'Deployment model',
        source: 'categoryRoot',
        rootName: 'Deployment Models',
        offerFormPlacement: 'categorySection'
      }
    ]);
  });

  it('should allow more than one category section offer form placement', () => {
    component.filtersArray.push((component as any).createFilterGroup({
      name: 'deploymentModel',
      label: 'Deployment model',
      source: 'categoryRoot',
      rootName: 'Deployment Models',
      offerFormPlacement: 'categorySection',
      options: []
    }));
    component.filtersArray.push((component as any).createFilterGroup({
      name: 'integrationType',
      label: 'Integration type',
      source: 'categoryRoot',
      rootName: 'Integration Types',
      offerFormPlacement: 'categorySection',
      options: []
    }));

    expect(() => (component as any).buildFiltersPayload()).not.toThrow();
  });

  it('should reject more than one general info offer form placement', () => {
    component.filtersArray.push((component as any).createFilterGroup({
      name: 'businessDomain',
      label: 'Business domain',
      source: 'categoryRoot',
      rootName: 'Business Domains',
      offerFormPlacement: 'generalInfo',
      options: []
    }));
    component.filtersArray.push((component as any).createFilterGroup({
      name: 'deploymentModel',
      label: 'Deployment model',
      source: 'categoryRoot',
      rootName: 'Deployment Models',
      offerFormPlacement: 'generalInfo',
      options: []
    }));

    expect(() => (component as any).buildFiltersPayload()).toThrowError(
      'Only one categoryRoot filter can be placed in the offer General Info section.'
    );
  });
});
