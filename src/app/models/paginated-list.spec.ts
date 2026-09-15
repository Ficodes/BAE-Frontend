import { TestBed } from '@angular/core/testing';
import { PaginatedList } from './paginated-list';

describe('PaginatedList', () => {
  const PAGE_SIZE = 10;

  function makeItems(count: number, offset = 0): string[] {
    return Array.from({ length: count }, (_, i) => `item-${offset + i}`);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should start with empty items, loading false and hasMore false', () => {
    const list = new PaginatedList(() => Promise.resolve([]), PAGE_SIZE);
    expect(list.items()).toEqual([]);
    expect(list.loading()).toBeFalse();
    expect(list.loadingMore()).toBeFalse();
    expect(list.hasMore()).toBeFalse();
  });

  it('load should set loading=true during fetch and false when done', async () => {
    const loadingStates: boolean[] = [];
    const fetcher = jasmine.createSpy().and.callFake(() => {
      loadingStates.push(list.loading());
      return Promise.resolve([]);
    });
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(loadingStates[0]).toBeTrue();
    expect(list.loading()).toBeFalse();
  });

  it('load should populate items from the first fetch call', async () => {
    const page0 = makeItems(10);
    const fetcher = jasmine.createSpy()
      .and.returnValues(Promise.resolve(page0), Promise.resolve([]));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(list.items()).toEqual(page0);
  });

  it('load should set hasMore=true when prefetch returns non-null items', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(Promise.resolve(makeItems(10)), Promise.resolve(makeItems(10, 10)));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(list.hasMore()).toBeTrue();
  });

  it('load should set hasMore=false when prefetch returns empty array', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(Promise.resolve(makeItems(5)), Promise.resolve([]));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(list.hasMore()).toBeFalse();
  });

  it('load should set hasMore=false when prefetch returns array of nulls', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(Promise.resolve(makeItems(5)), Promise.resolve([null, null] as any));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(list.hasMore()).toBeFalse();
  });

  it('load should reset items and state on reload', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(
        Promise.resolve(makeItems(10)),    // first load: page 0
        Promise.resolve(makeItems(10, 10)), // first load: prefetch
        Promise.resolve(makeItems(10, 20)), // loadMore: next prefetch
        Promise.resolve(makeItems(3, 30)),  // second load: page 0
        Promise.resolve([])                // second load: prefetch
      );
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    await list.loadMore();
    await list.load();
    expect(list.items()).toEqual(makeItems(3, 30));
  });

  it('load should set loading=false even when fetcher rejects', async () => {
    const fetcher = jasmine.createSpy().and.returnValue(Promise.reject(new Error('fail')));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    try {
      await list.load();
    } catch {
      // expected
    }
    expect(list.loading()).toBeFalse();
  });

  it('loadMore should do nothing when hasMore is false', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(Promise.resolve(makeItems(5)), Promise.resolve([]));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    const callCount = fetcher.calls.count();

    await list.loadMore();
    expect(fetcher.calls.count()).toBe(callCount);
    expect(list.items()).toEqual(makeItems(5));
  });

  it('loadMore should set loadingMore=true during fetch and false when done', async () => {
    let resolveSecond!: (v: string[]) => void;
    const fetcher = jasmine.createSpy()
      .and.returnValues(
        Promise.resolve(makeItems(10)),
        Promise.resolve(makeItems(10, 10)),
        new Promise<string[]>(r => { resolveSecond = r; })
      );
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();

    const morePromise = list.loadMore();
    expect(list.loadingMore()).toBeTrue();
    resolveSecond([]);
    await morePromise;
    expect(list.loadingMore()).toBeFalse();
  });

  it('loadMore should append prefetched items to existing items', async () => {
    const page0 = makeItems(10);
    const page1 = makeItems(10, 10);
    const fetcher = jasmine.createSpy()
      .and.returnValues(
        Promise.resolve(page0),
        Promise.resolve(page1),
        Promise.resolve([])
      );
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    await list.loadMore();
    expect(list.items()).toEqual([...page0, ...page1]);
  });

  it('loadMore should update hasMore based on next prefetch result', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(
        Promise.resolve(makeItems(10)),
        Promise.resolve(makeItems(10, 10)),
        Promise.resolve(makeItems(5, 20)),
        Promise.resolve([])
      );
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(list.hasMore()).toBeTrue();
    await list.loadMore();
    expect(list.hasMore()).toBeTrue();
    await list.loadMore();
    expect(list.hasMore()).toBeFalse();
  });

  it('loadMore should set loadingMore=false even when fetcher rejects', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(
        Promise.resolve(makeItems(10)),
        Promise.resolve(makeItems(10, 10)),
        Promise.reject(new Error('fail'))
      );
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    try {
      await list.loadMore();
    } catch {
      // expected
    }
    expect(list.loadingMore()).toBeFalse();
  });

  it('load should call fetcher with page 0 first, then pageSize', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(Promise.resolve([]), Promise.resolve([]));
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    expect(fetcher.calls.argsFor(0)).toEqual([0]);
    expect(fetcher.calls.argsFor(1)).toEqual([PAGE_SIZE]);
  });

  it('loadMore should advance the page cursor on each call', async () => {
    const fetcher = jasmine.createSpy()
      .and.returnValues(
        Promise.resolve(makeItems(10)),
        Promise.resolve(makeItems(10, 10)),
        Promise.resolve(makeItems(10, 20)),
        Promise.resolve([])
      );
    const list = new PaginatedList(fetcher, PAGE_SIZE);
    await list.load();
    await list.loadMore();
    expect(fetcher.calls.argsFor(2)).toEqual([PAGE_SIZE * 2]);
  });
});
