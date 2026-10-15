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

  it('should use each latest token and stop HTTP requests after a short deleted page', async () => {
    const fullPage = Array.from({ length: UsageServiceService.USAGE_SPEC_LIMIT }, (_, id) => ({ id }));
    const statuses = ['Retired', 'Obsolete'];

    for (let index = 0; index < 3; index++) {
      const promise = service.getUsageSpecs(index * UsageServiceService.USAGE_SPEC_LIMIT, statuses, 'party-1', true);
      const req = httpMock.expectOne(request => request.url.includes(`offset=${index * UsageServiceService.USAGE_SPEC_LIMIT}&`));
      expect(req.request.headers.get('X-Filtered-Pagination-Token')).toBe(index === 0 ? null : `token-${index}`);
      req.flush(index < 2 ? fullPage : [{ id: 'last' }], {
        headers: { 'X-Filtered-Pagination-Token': `token-${index + 1}`, 'X-Total-Count': '1000' }
      });
      await promise;
    }

    await expectAsync(service.getUsageSpecs(3 * UsageServiceService.USAGE_SPEC_LIMIT, statuses, 'party-1', true)).toBeResolvedTo([]);
    httpMock.expectNone(request => request.url.includes(`offset=${3 * UsageServiceService.USAGE_SPEC_LIMIT}&`));
    expect((service as any).filteredPaginationToken).toBeNull();
  });

  it('should clear the previous token when a full response has no token', async () => {
    const fullPage = Array.from({ length: UsageServiceService.USAGE_SPEC_LIMIT }, (_, id) => ({ id }));
    for (let index = 0; index < 3; index++) {
      const promise = service.getUsageSpecs(index * UsageServiceService.USAGE_SPEC_LIMIT, ['Launched'], 'party-1');
      const req = httpMock.expectOne(request => request.url.includes(`offset=${index * UsageServiceService.USAGE_SPEC_LIMIT}&`));
      expect(req.request.headers.get('X-Filtered-Pagination-Token')).toBe(index === 1 ? 'token-1' : null);
      req.flush(fullPage, index === 0 ? { headers: { 'X-Filtered-Pagination-Token': 'token-1' } } : {});
      await promise;
    }
  });

  it('should discard old query responses and start account and filter changes without a token', async () => {
    const fullPage = Array.from({ length: UsageServiceService.USAGE_SPEC_LIMIT }, (_, id) => ({ id }));
    const initial = service.getUsageSpecs(0, ['Retired', 'Obsolete'], 'party-1', true);
    httpMock.expectOne(request => request.url.includes('offset=0&')).flush(fullPage, {
      headers: { 'X-Filtered-Pagination-Token': 'old-token' }
    });
    await initial;
    const oldPage = service.getUsageSpecs(6, ['Retired', 'Obsolete'], 'party-1', true);
    const oldReq = httpMock.expectOne(request => request.url.includes('offset=6&'));

    const newPage = service.getUsageSpecs(0, ['Retired', 'Obsolete'], 'party-2', true);
    const newReq = httpMock.expectOne(request => request.url.includes('party-2'));
    expect(newReq.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    newReq.flush(fullPage, { headers: { 'X-Filtered-Pagination-Token': 'new-token' } });
    await newPage;

    oldReq.flush(fullPage, { headers: { 'X-Filtered-Pagination-Token': 'stale-token' } });
    await expectAsync(oldPage).toBeResolvedTo([]);

    const continuation = service.getUsageSpecs(6, ['Retired', 'Obsolete'], 'party-2', true);
    const continuationReq = httpMock.expectOne(request => request.url.includes('party-2'));
    expect(continuationReq.request.headers.get('X-Filtered-Pagination-Token')).toBe('new-token');
    continuationReq.flush([]);
    await continuation;

    const changedFilter = service.getUsageSpecs(0, ['Launched'], 'party-2');
    const filterReq = httpMock.expectOne(request => request.url.includes('lifecycleStatus=Launched'));
    expect(filterReq.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    filterReq.flush([]);
    await changedFilter;
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
    await new Promise(resolve => setTimeout(resolve, 0));

    const secondReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=${UsageServiceService.USAGE_SPEC_LIMIT}&relatedParty.id=party-1&lifecycleStatus=Launched`
    );
    secondReq.flush(secondPage);

    await expectAsync(promise).toBeResolvedTo([...firstPage, ...secondPage]);
  });

  it('should send the filtered pagination token on the next retired and obsolete page request', async () => {
    const firstPage = [{ id: 'usage-1' }];
    const secondPage = [{ id: 'usage-2' }];
    const token = 'opaque-token==,do-not-parse';

    const firstPromise = service.getUsageSpecs(0, ['Retired', 'Obsolete'], 'party-1');
    const firstReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1&lifecycleStatus=Retired,Obsolete`
    );
    expect(firstReq.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    firstReq.flush(firstPage, { headers: { 'X-Filtered-Pagination-Token': token } });
    await expectAsync(firstPromise).toBeResolvedTo(firstPage);

    const secondPromise = service.getUsageSpecs(UsageServiceService.USAGE_SPEC_LIMIT, ['Retired', 'Obsolete'], 'party-1');
    const secondReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=${UsageServiceService.USAGE_SPEC_LIMIT}&relatedParty.id=party-1&lifecycleStatus=Retired,Obsolete`
    );
    expect(secondReq.request.headers.get('X-Filtered-Pagination-Token')).toBe(token);
    secondReq.flush(secondPage);

    await expectAsync(secondPromise).toBeResolvedTo(secondPage);
  });

  it('should use filtered pagination when any usage spec response provides a token', async () => {
    const token = 'launched-token';

    const firstPromise = service.getUsageSpecs(0, ['Launched'], 'party-1');
    const firstReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1&lifecycleStatus=Launched`
    );
    expect(firstReq.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    firstReq.flush([{ id: 'usage-1' }], { headers: { 'X-Filtered-Pagination-Token': token } });
    await expectAsync(firstPromise).toBeResolvedTo([{ id: 'usage-1' }]);

    const secondPromise = service.getUsageSpecs(UsageServiceService.USAGE_SPEC_LIMIT, ['Launched'], 'party-1');
    const secondReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=${UsageServiceService.USAGE_SPEC_LIMIT}&relatedParty.id=party-1&lifecycleStatus=Launched`
    );
    expect(secondReq.request.headers.get('X-Filtered-Pagination-Token')).toBe(token);
    secondReq.flush([]);

    await expectAsync(secondPromise).toBeResolvedTo([]);
  });

  it('should clear the filtered pagination token when reset', async () => {
    const token = 'current-query-token';

    const firstPromise = service.getUsageSpecs(0, ['Retired', 'Obsolete'], 'party-1');
    const firstReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1&lifecycleStatus=Retired,Obsolete`
    );
    firstReq.flush([{ id: 'usage-1' }], { headers: { 'X-Filtered-Pagination-Token': token } });
    await expectAsync(firstPromise).toBeResolvedTo([{ id: 'usage-1' }]);

    service.resetFilteredPaginationToken();

    const nextPromise = service.getUsageSpecs(0, ['Retired', 'Obsolete'], 'party-1');
    const nextReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams === `${UsageServiceService.BASE_URL}/usage/usageSpecification?limit=${UsageServiceService.USAGE_SPEC_LIMIT}&offset=0&relatedParty.id=party-1&lifecycleStatus=Retired,Obsolete`
    );
    expect(nextReq.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    nextReq.flush([]);

    await expectAsync(nextPromise).toBeResolvedTo([]);
  });
});
