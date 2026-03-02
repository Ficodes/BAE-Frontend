import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UpdateServiceSpecComponent } from './update-service-spec.component';

describe('UpdateServiceSpecComponent', () => {
  let component: UpdateServiceSpecComponent;
  let fixture: ComponentFixture<UpdateServiceSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateServiceSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateServiceSpecComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
