import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { SellerProductSpecComponent } from './seller-product-spec/seller-product-spec.component';
import { SellerServiceSpecComponent } from './seller-service-spec/seller-service-spec.component';
import { SellerResourceSpecComponent } from './seller-resource-spec/seller-resource-spec.component';
import { environment } from 'src/environments/environment';

interface SpecPaginationCase {
  name: string;
  componentType: Type<any>;
  serviceType: Type<any>;
  listMethod: string;
  serviceMethod: string;
  itemsProperty: string;
  bufferProperty: string;
  limit: number;
}

const cases: SpecPaginationCase[] = [
  {
    name: 'product', componentType: SellerProductSpecComponent, serviceType: ProductSpecServiceService,
    listMethod: 'getProdSpecs', serviceMethod: 'getProdSpecByUser',
    itemsProperty: 'prodSpecs', bufferProperty: 'nextProdSpecs', limit: environment.PROD_SPEC_LIMIT
  },
  {
    name: 'service', componentType: SellerServiceSpecComponent, serviceType: ServiceSpecServiceService,
    listMethod: 'getServSpecs', serviceMethod: 'getServiceSpecByUser',
    itemsProperty: 'servSpecs', bufferProperty: 'nextServSpecs', limit: environment.SERV_SPEC_LIMIT
  },
  {
    name: 'resource', componentType: SellerResourceSpecComponent, serviceType: ResourceSpecServiceService,
    listMethod: 'getResSpecs', serviceMethod: 'getResourceSpecByUser',
    itemsProperty: 'resSpecs', bufferProperty: 'nextResSpecs', limit: environment.RES_SPEC_LIMIT
  }
];

// Exercise each seller component together with its real service and PaginationService.
for (const config of cases) {
  describe(`Deleted ${config.name} specification pagination`, () => {
    const tokenHeader = 'X-Filtered-Pagination-Token';
    let fixture: ComponentFixture<any>;
    let component: any;
    let service: any;
    let httpMock: HttpTestingController;
    let login: { id: string; logged_as: string; partyId: string };

    async function flushPromises(): Promise<void> {
      for (let i = 0; i < 8; i++) await Promise.resolve();
    }

    function page(offset = 0) {
      return Array.from({ length: config.limit }, (_, id) => ({ id: offset + id }));
    }

    function expectPage(offset: number, token: string | null = null) {
      const req = httpMock.expectOne(request => request.url.includes(`offset=${offset}&`));
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get(tokenHeader)).toBe(token);
      return req;
    }

    function fetch(offset: number, partyId = 'party-1', sort?: string, isBundle?: boolean, statuses = ['Retired', 'Obsolete'], cursor = true): Promise<any[]> {
      const args: any[] = [offset, statuses, partyId, sort];
      if (config.name === 'product') args.push(isBundle);
      args.push(cursor);
      return service[config.serviceMethod](...args);
    }

    async function loadWithBuffer(): Promise<void> {
      const pending = component[config.listMethod](false);
      const first = expectPage(0);
      expect(first.request.url).toContain('lifecycleStatus=Retired,Obsolete');
      first.flush(page(), { headers: { [tokenHeader]: 'opaque-token==,do-not-parse' } });
      await flushPromises();
      expectPage(config.limit, 'opaque-token==,do-not-parse').flush(page(config.limit), { headers: { [tokenHeader]: 'token-2' } });
      await pending;
    }

    beforeEach(async () => {
      login = { id: 'user-1', logged_as: 'user-1', partyId: 'party-1' };
      await TestBed.configureTestingModule({
        declarations: [config.componentType],
        imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
        providers: [{ provide: LocalStorageService, useValue: { getObject: () => login } }]
      }).overrideComponent(config.componentType, { set: { template: '' } }).compileComponents();

      fixture = TestBed.createComponent(config.componentType);
      component = fixture.componentInstance;
      spyOn(component, 'ngOnInit');
      component.partyId = 'party-1';
      component.selectedTab = 'Deleted';
      component.status = ['Retired', 'Obsolete'];
      service = TestBed.inject(config.serviceType);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('forwards the latest opaque token through prefetch and stops after appending the final short page', async () => {
      await loadWithBuffer();
      expect(component[config.itemsProperty]).toEqual(page());
      expect(component[config.bufferProperty]).toEqual(page(config.limit));
      expect(component.page_check).toBeTrue();

      const more = component.next();
      expectPage(2 * config.limit, 'token-2').flush([{ id: 'last' }], {
        headers: { [tokenHeader]: 'opaque-token==,do-not-parse', 'X-Total-Count': '1000' }
      });
      await more;
      await component.next();
      expect(component[config.itemsProperty]).toEqual([...page(), ...page(config.limit), { id: 'last' }]);
      expect(component[config.bufferProperty]).toEqual([]);
      expect(component.page_check).toBeFalse();
      await component.next();
      httpMock.expectNone(() => true);
      await expectAsync(fetch(3 * config.limit)).toBeResolvedTo([]);
    });

    it('does not prefetch after an empty or short initial Deleted page, even with a token', async () => {
      for (const items of [[], [{ id: 'last' }]]) {
        const pending = component[config.listMethod](false);
        expectPage(0).flush(items, { headers: { [tokenHeader]: 'unused-token' } });
        await pending;
        expect(component[config.itemsProperty]).toEqual(items);
        expect(component.page_check).toBeFalse();
        await component.next();
        httpMock.expectNone(() => true);
      }
    });

    it('keeps offset prefetching without cursor headers in Draft and Validated', async () => {
      await loadWithBuffer();
      for (const tab of ['Draft', 'Validated']) {
        component.selectTab(tab);
        const first = expectPage(0);
        expect(first.request.url).toContain(`lifecycleStatus=${tab === 'Draft' ? 'Active' : 'Launched'}`);
        first.flush([{ id: tab }], { headers: { [tokenHeader]: 'ignored-token' } });
        await flushPromises();
        expectPage(config.limit).flush([]);
        await flushPromises();
        expect(component[config.itemsProperty]).toEqual([{ id: tab }]);
        expect(component.page_check).toBeFalse();
      }
      component.selectTab('Deleted');
      expectPage(0).flush([]);
      await flushPromises();
    });

    it('leaves existing service callers on offset paging unless they explicitly opt in', async () => {
      await loadWithBuffer();
      for (const statuses of [['Active'], ['Launched'], ['Active', 'Launched'], ['Retired', 'Obsolete']]) {
        // Use the original method signature, without the new optional argument.
        const pending = service[config.serviceMethod](0, statuses, 'party-1', undefined);
        expectPage(0).flush([{ id: 'legacy' }], { headers: { [tokenHeader]: 'ignored-token' } });
        await expectAsync(pending).toBeResolvedTo([{ id: 'legacy' }]);
        const next = service[config.serviceMethod](config.limit, statuses, 'party-1', undefined);
        expectPage(config.limit).flush([]);
        await expectAsync(next).toBeResolvedTo([]);
      }
    });

    it('clears the old token when the latest full response has no token', async () => {
      await loadWithBuffer();
      const more = component.next();
      expectPage(2 * config.limit, 'token-2').flush(page(2 * config.limit));
      await more;
      const last = component.next();
      expectPage(3 * config.limit).flush([]);
      await last;
      expect(component.page_check).toBeFalse();
    });

    it('blocks repeated Load More calls while loading and prefetching', async () => {
      const initial = component[config.listMethod](false);
      await component.next();
      expectPage(0).flush(page(), { headers: { [tokenHeader]: 'opaque-token==,do-not-parse' } });
      await flushPromises();
      const buffer = expectPage(config.limit, 'opaque-token==,do-not-parse');
      await component.next();
      buffer.flush(page(config.limit), { headers: { [tokenHeader]: 'token-2' } });
      await initial;

      const more = component.next();
      await component.next();
      expectPage(2 * config.limit, 'token-2').flush([]);
      await more;
      expect(component[config.itemsProperty]).toEqual([...page(), ...page(config.limit)]);
      expect(component.loading_more).toBeFalse();
    });

    it('resets sorting and product type changes to a fresh query', async () => {
      await loadWithBuffer();
      component.onSortChange({ target: { value: 'name' } });
      const sorted = expectPage(0);
      expect(sorted.request.url).toContain('&sort=name');
      expect(component[config.itemsProperty]).toEqual([]);
      expect(component[config.bufferProperty]).toEqual([]);
      sorted.flush([]);
      await flushPromises();

      if (config.name === 'product') {
        await loadWithBuffer();
        component.onTypeChange({ target: { value: 'bundle' } });
        const bundled = expectPage(0);
        expect(bundled.request.url).toContain('&isBundle=true');
        bundled.flush([]);
        await flushPromises();
      }
    });

    it('ignores a stale initial response and prevents its prefetch after leaving Deleted', async () => {
      const previous = component[config.listMethod](false);
      const oldReq = expectPage(0);
      component.selectTab('Draft');
      expectPage(0).flush([{ id: 'draft' }]);
      await flushPromises();
      expectPage(config.limit).flush([]);
      await flushPromises();

      oldReq.flush(page(), { headers: { [tokenHeader]: 'stale-token' } });
      await previous;
      expect(component[config.itemsProperty]).toEqual([{ id: 'draft' }]);
      expect(component[config.bufferProperty]).toEqual([]);
      expect(component.page_check).toBeFalse();
      httpMock.expectNone(() => true);
    });

    it('resets on account changes and ignores a stale prefetched page', async () => {
      await loadWithBuffer();
      const previous = component.next();
      const oldReq = expectPage(2 * config.limit, 'token-2');
      login.partyId = 'party-2';
      TestBed.inject(EventMessageService).emitChangedSession({} as any);
      const newReq = expectPage(0);
      expect(newReq.request.url).toContain('relatedParty.id=party-2');
      expect(component[config.itemsProperty]).toEqual([]);
      expect(component[config.bufferProperty]).toEqual([]);
      newReq.flush(page(), { headers: { [tokenHeader]: 'new-token' } });
      await flushPromises();
      expectPage(config.limit, 'new-token').flush([{ id: 'new-last' }]);
      await flushPromises();

      oldReq.flush(page(2 * config.limit), { headers: { [tokenHeader]: 'stale-token' } });
      await previous;
      expect(component[config.itemsProperty]).toEqual(page());
      expect(component[config.bufferProperty]).toEqual([{ id: 'new-last' }]);
      await component.next();
      expect(component.page_check).toBeFalse();
    });

    it('discards pending requests and prevents prefetch after destruction', async () => {
      const pending = component[config.listMethod](false);
      const req = expectPage(0);
      fixture.destroy();
      req.flush(page(), { headers: { [tokenHeader]: 'stale-token' } });
      await pending;
      expect(component[config.itemsProperty]).toEqual([]);
      httpMock.expectNone(() => true);
    });

    it('resets the service cursor when party, lifecycle, sort, or product type changes', async () => {
      const queries: Array<{ party: string; sort?: string; bundle?: boolean; statuses: string[] }> = [
        { party: 'party-1', sort: undefined, bundle: undefined, statuses: ['Retired', 'Obsolete'] },
        { party: 'party-2', sort: undefined, bundle: undefined, statuses: ['Retired', 'Obsolete'] },
        { party: 'party-2', sort: 'name', bundle: undefined, statuses: ['Retired', 'Obsolete'] },
        { party: 'party-2', sort: 'name', bundle: undefined, statuses: ['Retired'] }
      ];
      if (config.name === 'product') queries.push({ party: 'party-2', sort: 'name', bundle: true, statuses: ['Retired'] });
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const pending = fetch(i * config.limit, query.party, query.sort, query.bundle, query.statuses);
        expectPage(i * config.limit).flush(page(), { headers: { [tokenHeader]: 'query-token' } });
        await pending;
      }
    });
  });
}
