import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogEntryDetailComponent } from './blog-entry-detail.component';

describe('BlogEntryDetailComponent', () => {
  let component: BlogEntryDetailComponent;
  let fixture: ComponentFixture<BlogEntryDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogEntryDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogEntryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
