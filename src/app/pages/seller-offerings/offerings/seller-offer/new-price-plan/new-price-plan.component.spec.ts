import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { NewPricePlanComponent } from './new-price-plan.component';

describe('NewPricePlanComponent', () => {
  let component: NewPricePlanComponent;
  let fixture: ComponentFixture<NewPricePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [NewPricePlanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewPricePlanComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
