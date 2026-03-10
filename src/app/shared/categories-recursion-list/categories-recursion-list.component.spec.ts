import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CategoriesRecursionListComponent } from './categories-recursion-list.component';

describe('CategoriesRecursionListComponent', () => {
  let component: CategoriesRecursionListComponent;
  let fixture: ComponentFixture<CategoriesRecursionListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CategoriesRecursionListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CategoriesRecursionListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
