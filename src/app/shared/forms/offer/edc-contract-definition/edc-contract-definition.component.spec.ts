import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { EdcContractDefinitionComponent } from './edc-contract-definition.component';

describe('LicenseComponent', () => {
  let component: EdcContractDefinitionComponent;
  let fixture: ComponentFixture<EdcContractDefinitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [EdcContractDefinitionComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EdcContractDefinitionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
