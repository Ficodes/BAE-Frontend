import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StatsServiceService } from './stats-service.service';

describe('StatsServiceService', () => {
  let service: StatsServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(StatsServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
