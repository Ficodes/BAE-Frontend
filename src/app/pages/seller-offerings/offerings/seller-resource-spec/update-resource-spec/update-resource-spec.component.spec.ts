import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UpdateResourceSpecComponent } from './update-resource-spec.component';

describe('UpdateResourceSpecComponent', () => {
  let component: UpdateResourceSpecComponent;
  let fixture: ComponentFixture<UpdateResourceSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateResourceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateResourceSpecComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
