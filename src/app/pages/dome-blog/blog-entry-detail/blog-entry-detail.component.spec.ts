import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MarkdownModule } from 'ngx-markdown';

import { BlogEntryDetailComponent } from './blog-entry-detail.component';

describe('BlogEntryDetailComponent', () => {
  let component: BlogEntryDetailComponent;
  let fixture: ComponentFixture<BlogEntryDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [BlogEntryDetailComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot(), MarkdownModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogEntryDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
