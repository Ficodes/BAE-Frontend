import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FeedbackServiceService } from './feedback-service.service';

describe('FeedbackServiceService', () => {
  let service: FeedbackServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(FeedbackServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
