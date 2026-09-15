import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  let component: FaqComponent;
  let fixture: ComponentFixture<FaqComponent>;
  let domeBlogService: jasmine.SpyObj<DomeBlogServiceService>;

  beforeEach(async () => {
    domeBlogService = jasmine.createSpyObj<DomeBlogServiceService>('DomeBlogServiceService', ['getBlogEntries', 'deleteBlogEntry']);
    domeBlogService.getBlogEntries.and.resolveTo([]);
    domeBlogService.deleteBlogEntry.and.resolveTo({});

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      declarations: [FaqComponent],
      providers: [
        { provide: DomeBlogServiceService, useValue: domeBlogService },
        { provide: LocalStorageService, useValue: { getObject: jasmine.createSpy('getObject').and.returnValue({}) } }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open one FAQ at a time', () => {
    component.toggleFaq('one');
    expect(component.isOpen('one')).toBeTrue();

    component.toggleFaq('two');
    expect(component.isOpen('one')).toBeFalse();
    expect(component.isOpen('two')).toBeTrue();
  });
});
