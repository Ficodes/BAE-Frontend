import { signal } from '@angular/core';

export class PaginatedList<T> {
  readonly items = signal<T[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);

  private page = 0;
  private prefetched: T[] = [];
  private readonly fetcher: (page: number) => Promise<T[]>;
  private readonly pageSize: number;

  constructor(fetcher: (page: number) => Promise<T[]>, pageSize: number) {
    this.fetcher = fetcher;
    this.pageSize = pageSize;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.page = 0;
    this.items.set([]);
    this.prefetched = [];

    try {
      this.items.set(await this.fetcher(0));
      this.page = this.pageSize;
      this.prefetched = await this.fetcher(this.page);
      this.page += this.pageSize;
      this.hasMore.set(this.prefetched.some(item => item != null));
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore()) return;
    this.loadingMore.set(true);

    try {
      this.items.set([...this.items(), ...this.prefetched]);
      this.prefetched = await this.fetcher(this.page);
      this.page += this.pageSize;
      this.hasMore.set(this.prefetched.some(item => item != null));
    } finally {
      this.loadingMore.set(false);
    }
  }
}
