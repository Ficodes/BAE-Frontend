import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DomeBlogComponent } from './dome-blog.component';

describe('DomeBlogComponent', () => {
  let component: DomeBlogComponent;
  let fixture: ComponentFixture<DomeBlogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomeBlogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DomeBlogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
