import { ChangeDetectorRef } from '@angular/core';
import { DashboardNewsComponent, NEWS_WIDGET_CARD_COUNT } from './dashboard-news.component';
import { DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';

describe('DashboardNewsComponent', () => {
  const buildComponent = (response: any = { items: [] }) => {
    const domeBlogService = {
      getBlogEntries: jasmine.createSpy('getBlogEntries').and.resolveTo(response),
    } as unknown as jasmine.SpyObj<DomeBlogServiceService>;
    const cdr = {
      markForCheck: jasmine.createSpy('markForCheck'),
    } as unknown as ChangeDetectorRef;

    const component = new DashboardNewsComponent(domeBlogService, cdr);

    return { component, domeBlogService };
  };

  it('should request news entries for the dashboard news widget', async () => {
    const { component, domeBlogService } = buildComponent({ items: [{ _id: 'news-1', contentType: 'news' }] });

    await component.ngOnInit();

    expect(domeBlogService.getBlogEntries).toHaveBeenCalledWith({
      contentType: 'news',
      page: 1,
      limit: NEWS_WIDGET_CARD_COUNT,
    });
    expect(component.routeBase).toBe('/news');
    expect(component.entries).toEqual([{ _id: 'news-1', contentType: 'news' }]);
  });
});
