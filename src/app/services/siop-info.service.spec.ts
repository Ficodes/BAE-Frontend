import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SiopInfoService } from './siop-info.service';

describe('SiopInfoService', () => {
  let service: SiopInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(SiopInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
