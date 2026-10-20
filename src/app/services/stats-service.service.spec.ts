import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StatsServiceService } from './stats-service.service';
import { environment } from 'src/environments/environment';

describe('StatsServiceService', () => {
  let service: StatsServiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(StatsServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getProviderStats should URL-encode organization ids and normalize missing counters', async () => {
    const promise = service.getProviderStats('urn:ngsi-ld:organization:1234');

    const req = httpMock.expectOne(`${environment.BASE_URL}/stats/provider/urn%3Angsi-ld%3Aorganization%3A1234`);
    req.flush({
      productOffering: { Active: 2, Launched: 1 },
      catalog: { Obsolete: 3 },
      productSpecification: {},
      serviceSpecification: {},
      resourceSpecification: {},
      usageSpecification: { Retired: 4 }
    });

    await expectAsync(promise).toBeResolvedTo(jasmine.objectContaining({
      productOffering: { Active: 2, Launched: 1, Retired: 0, Obsolete: 0 },
      catalog: { Active: 0, Launched: 0, Retired: 0, Obsolete: 3 },
      usageSpecification: { Active: 0, Launched: 0, Retired: 4, Obsolete: 0 }
    }));
  });
});
