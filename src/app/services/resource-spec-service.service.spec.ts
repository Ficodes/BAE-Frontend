import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResourceSpecServiceService } from './resource-spec-service.service';

describe('ResourceSpecServiceService', () => {
  let service: ResourceSpecServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ResourceSpecServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
