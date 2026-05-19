import { BlogEntryDetailComponent } from './blog-entry-detail.component';
import { convertToParamMap } from '@angular/router';

describe('BlogEntryDetailComponent', () => {
  const buildComponent = (slugOrId = 'entry-slug', serviceOverrides?: Partial<any>) => {
    const route = {
      snapshot: {
        paramMap: convertToParamMap({ slugOrId })
      }
    } as any;
    const router = { navigate: jasmine.createSpy('navigate') } as any;
    const domeBlogService = {
      getBlogEntries: jasmine.createSpy('getBlogEntries').and.resolveTo([
        { _id: 'entry-1', slug: 'entry-slug' }
      ]),
      getBlogEntryById: jasmine.createSpy('getBlogEntryById').and.resolveTo({
        _id: 'entry-1',
        title: 'Entry title',
        metaDescription: 'Meta description',
        content: 'Body content'
      }),
      deleteBlogEntry: jasmine.createSpy('deleteBlogEntry').and.resolveTo({ ok: true }),
      ...serviceOverrides
    } as any;

    const localStorageService = {
      getObject: jasmine.createSpy('getObject').and.returnValue({})
    } as any;
    const titleService = { setTitle: jasmine.createSpy('setTitle') } as any;
    const metaService = { updateTag: jasmine.createSpy('updateTag') } as any;

    const component = new BlogEntryDetailComponent(
      route,
      router,
      domeBlogService,
      localStorageService,
      titleService,
      metaService
    );

    return { component, router, domeBlogService, titleService, metaService };
  };

  it('should create', () => {
    const { component } = buildComponent();
    expect(component).toBeTruthy();
  });

  it('should resolve slug to entry and apply seo metadata on init', async () => {
    const { component, domeBlogService, titleService, metaService } = buildComponent('entry-slug');

    await component.ngOnInit();

    expect(domeBlogService.getBlogEntries).toHaveBeenCalled();
    expect(domeBlogService.getBlogEntryById).toHaveBeenCalledWith('entry-1');
    expect(titleService.setTitle).toHaveBeenCalledWith('Entry title');
    expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Meta description' });
  });

  it('should return featured image from string or object', () => {
    const { component } = buildComponent();
    component.entry = { featuredImage: ' https://cdn/test.png ' };
    expect(component.getFeaturedImage()).toBe('https://cdn/test.png');

    component.entry = { featuredImage: { url: ' https://cdn/obj.png ' } };
    expect(component.getFeaturedImage()).toBe('https://cdn/obj.png');
  });

  it('should normalize tags from array and csv', () => {
    const { component } = buildComponent();
    component.entry = { tags: [' ai ', '', 'news'] };
    expect(component.getEntryTags()).toEqual(['ai', 'news']);

    component.entry = { tags: 'one, two, , three' };
    expect(component.getEntryTags()).toEqual(['one', 'two', 'three']);
  });

  it('should open delete confirmation when entry id exists', () => {
    const { component } = buildComponent();
    component.entry = { _id: 'entry-2', title: 'Delete me' };

    component.openDeleteDialog();

    expect(component.showDeleteConfirm).toBeTrue();
    expect(component.deleteConfirmMessage).toContain('Delete me');
  });

  it('should delete entry and navigate back', async () => {
    const { component, domeBlogService, router } = buildComponent();
    component.entry = { _id: 'entry-5', title: 'Post' };

    await component.confirmDeleteEntry();

    expect(domeBlogService.deleteBlogEntry).toHaveBeenCalledWith('entry-5');
    expect(router.navigate).toHaveBeenCalledWith(['/blog']);
    expect(component.deleting).toBeFalse();
  });

  it('should fallback to id lookup for object ids', async () => {
    const objectId = '507f1f77bcf86cd799439011';
    const { component, domeBlogService } = buildComponent(objectId);
    domeBlogService.getBlogEntryById.and.resolveTo({ _id: objectId, title: 'By id' });

    const result = await component.getEntryBySlugOrId(objectId);

    expect(domeBlogService.getBlogEntryById).toHaveBeenCalledWith(objectId);
    expect(result._id).toBe(objectId);
  });
});
