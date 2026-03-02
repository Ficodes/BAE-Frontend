import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UpdateProductSpecComponent } from './update-product-spec.component';

describe('UpdateProductSpecComponent', () => {
  let component: UpdateProductSpecComponent;
  let fixture: ComponentFixture<UpdateProductSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateProductSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateProductSpecComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
