import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateProductSpecComponent } from './create-product-spec.component';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('CreateProductSpecComponent', () => {
  let component: CreateProductSpecComponent;
  let fixture: ComponentFixture<CreateProductSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateProductSpecComponent],
      imports: [TranslateModule.forRoot(), ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductSpecComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
