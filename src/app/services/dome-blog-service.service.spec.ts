import { TestBed } from '@angular/core/testing';

import { DomeBlogServiceService } from './dome-blog-service.service';

describe('DomeBlogServiceService', () => {
  let service: DomeBlogServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DomeBlogServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
