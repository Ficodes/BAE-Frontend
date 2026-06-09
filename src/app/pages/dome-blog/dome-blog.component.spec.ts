import { DomeBlogComponent } from './dome-blog.component';
import { Subject } from 'rxjs';

describe('DomeBlogComponent', () => {
  const buildComponent = (entries: any[] = []) => {
    const messages$ = new Subject<any>();
    const router = {
      navigate: jasmine.createSpy('navigate')
    } as any;
    const eventMessage = { messages$ } as any;
    const localStorageService = {
      getObject: jasmine.createSpy('getObject').and.returnValue({})
    } as any;
    const domeBlogService = {
      getBlogEntries: jasmine.createSpy('getBlogEntries').and.resolveTo(entries),
      deleteBlogEntry: jasmine.createSpy('deleteBlogEntry').and.resolveTo({ ok: true })
    } as any;

    const component = new DomeBlogComponent(router, eventMessage, localStorageService, domeBlogService);
    return { component, router, domeBlogService, messages$ };
  };

  it('should create', () => {
    const { component } = buildComponent();
    expect(component).toBeTruthy();
  });

  it('should use slug for route id when available', () => {
    const { component } = buildComponent();
    expect(component.getEntryRouteId({ _id: '1', slug: 'my-post' })).toBe('my-post');
    expect(component.getEntryRouteId({ _id: '1' })).toBe('1');
  });

  it('should normalize tags from both array and csv string', () => {
    const { component } = buildComponent();
    expect(component.getEntryTags({ tags: [' ai ', '', 'news'] })).toEqual(['ai', 'news']);
    expect(component.getEntryTags({ tags: 'alpha, beta , , gamma' })).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('should prioritize excerpt and metaDescription before markdown fallback', () => {
    const { component } = buildComponent();
    expect(component.getEntryExcerpt({ excerpt: ' Short excerpt ' })).toBe('Short excerpt');
    expect(component.getEntryExcerpt({ excerpt: '  ', metaDescription: ' Meta text ' })).toBe('Meta text');
    expect(component.getEntryExcerpt({ content: '# Title **bold** [link](https://x.com)' })).toContain('Title');
  });

  it('should open delete modal with selected entry', () => {
    const { component } = buildComponent();
    component.openDeleteDialog({ _id: 'entry-1', title: 'Post A' });

    expect(component.showDeleteConfirm).toBeTrue();
    expect(component.pendingDeleteEntry?._id).toBe('entry-1');
    expect(component.deleteConfirmMessage).toContain('Post A');
  });

  it('should delete selected entry and refresh list', async () => {
    const { component, domeBlogService } = buildComponent();
    spyOn(component, 'loadEntries').and.resolveTo();
    component.pendingDeleteEntry = { _id: 'entry-2', title: 'Post B' };

    await component.confirmDeleteEntry();

    expect(domeBlogService.deleteBlogEntry).toHaveBeenCalledWith('entry-2');
    expect(component.loadEntries).toHaveBeenCalled();
    expect(component.deletingEntryId).toBeNull();
  });

  it('should navigate to details with computed route id', () => {
    const { component, router } = buildComponent();
    component.goToDetails({ _id: 'entry-3', slug: 'custom-slug' });
    expect(router.navigate).toHaveBeenCalledWith(['/blog/', 'custom-slug']);
  });
});
