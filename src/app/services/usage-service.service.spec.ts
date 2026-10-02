import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UsageServiceService } from './usage-service.service';

describe('UsageServiceService', () => {
  let service: UsageServiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(UsageServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request usage specs with lifecycle status filters when provided', async () => {
    const promise = service.getUsageSpecs(0, ['Active', 'Launched'], 'party-1');

    const req = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1&lifecycleStatus=Active,Launched`
    );
    req.flush([]);

    await expectAsync(promise).toBeResolvedTo([]);
  });

  it('should request usage specs without lifecycle filters when status is empty', async () => {
    const promise = service.getUsageSpecs(0, [], 'party-1');

    const req = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1`
    );
    req.flush([]);

    await expectAsync(promise).toBeResolvedTo([]);
  });

  it('should request all usage spec pages by status', async () => {
    const firstPage = Array.from({ length: UsageServiceService.USAGE_SPEC_LIMIT }, (_, index) => ({ id: `usage-${index}` }));
    const secondPage = [{ id: 'usage-last' }];
    const promise = service.getUsageSpecsByStatus(['Launched'], 'party-1');

    const firstReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1&lifecycleStatus=Launched`
    );
    firstReq.flush(firstPage);
    await Promise.resolve();

    const secondReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=${UsageServiceService.USAGE_SPEC_LIMIT}&relatedParty.id=party-1&lifecycleStatus=Launched`
    );
    secondReq.flush(secondPage);

    await expectAsync(promise).toBeResolvedTo([...firstPage, ...secondPage]);
  });
});
