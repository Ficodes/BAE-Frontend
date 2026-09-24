import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [CardComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide offer tag metadata from the card description', () => {
    component.productOff = {
      description: 'Visible description\n\n[TAGS]:["cloud","ai"]'
    };

    expect(component.getVisibleDescription()).toBe('Visible description');
    expect(component.getShortDescription()).toBe('Visible description');
  });

  it('should keep normal descriptions unchanged', () => {
    component.productOff = {
      description: 'Visible <strong>description</strong>'
    };

    expect(component.getVisibleDescription()).toBe('Visible <strong>description</strong>');
    expect(component.getShortDescription()).toBe('Visible description');
  });
});
