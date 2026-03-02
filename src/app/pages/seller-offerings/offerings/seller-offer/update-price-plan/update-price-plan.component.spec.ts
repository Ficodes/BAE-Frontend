import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UpdatePricePlanComponent } from './update-price-plan.component';

describe('UpdatePricePlanComponent', () => {
  let component: UpdatePricePlanComponent;
  let fixture: ComponentFixture<UpdatePricePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdatePricePlanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdatePricePlanComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
