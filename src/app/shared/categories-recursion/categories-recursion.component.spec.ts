import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CategoriesRecursionComponent } from './categories-recursion.component';

describe('CategoriesRecursionComponent', () => {
  let component: CategoriesRecursionComponent;
  let fixture: ComponentFixture<CategoriesRecursionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CategoriesRecursionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CategoriesRecursionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
