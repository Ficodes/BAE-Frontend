import { EntryFormComponent } from './entry-form.component';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

describe('EntryFormComponent', () => {
  const buildComponent = (options?: {
    routeId?: string | null;
    entryById?: any;
    entries?: any[];
  }) => {
    const routeId = options?.routeId ?? null;
    const route = {
      snapshot: {
        paramMap: convertToParamMap(routeId ? { id: routeId } : {})
      }
    } as any;

    const router = {
      navigate: jasmine.createSpy('navigate')
    } as any;

    const localStorageService = {
      getObject: jasmine.createSpy('getObject').and.returnValue({})
    } as any;

    const domeBlogService = {
      getBlogEntries: jasmine.createSpy('getBlogEntries').and.resolveTo(options?.entries ?? []),
      getBlogEntryById: jasmine.createSpy('getBlogEntryById').and.resolveTo(options?.entryById ?? {}),
      createBlogEntry: jasmine.createSpy('createBlogEntry').and.returnValue(of({ ok: true })),
      updateBlogEntry: jasmine.createSpy('updateBlogEntry').and.resolveTo({ ok: true }),
      deleteBlogEntry: jasmine.createSpy('deleteBlogEntry').and.resolveTo({ ok: true })
    } as any;

    const attachmentService = {
      uploadFile: jasmine.createSpy('uploadFile').and.returnValue(of({ content: 'https://cdn/image.png' }))
    } as any;

    const component = new EntryFormComponent(
      route,
      router,
      localStorageService,
      domeBlogService,
      attachmentService
    );

    return { component, route, router, domeBlogService };
  };

  it('should create', () => {
    const { component } = buildComponent();
    expect(component).toBeTruthy();
  });

  it('should normalize slug values', () => {
    const { component } = buildComponent();
    expect(component.slugify('  Hello World!!!  ')).toBe('hello-world');
    expect(component.slugify('Test---Slug')).toBe('test-slug');
  });

  it('should parse tags as deduped normalized array', () => {
    const { component } = buildComponent();
    component.entryForm.controls['tags'].setValue('AI,  growth  marketing, ai, , Product   Updates ');

    expect(component.parseTagsFromForm()).toEqual(['AI', 'growth marketing', 'Product Updates']);
  });

  it('should populate edit form values including tags and featured image on init', async () => {
    const { component, domeBlogService } = buildComponent({
      routeId: 'entry-1',
      entries: [],
      entryById: {
        _id: 'entry-1',
        title: 'Post Title',
        slug: 'post-title',
        featuredImage: { url: 'https://cdn/cover.png' },
        metaDescription: 'Meta text',
        excerpt: 'Excerpt text',
        tags: ['one', 'two'],
        content: 'Body'
      }
    });

    await component.ngOnInit();

    expect(domeBlogService.getBlogEntryById).toHaveBeenCalledWith('entry-1');
    expect(component.entryForm.controls['slug'].value).toBe('post-title');
    expect(component.entryForm.controls['featuredImage'].value).toBe('https://cdn/cover.png');
    expect(component.entryForm.controls['tags'].value).toBe('one, two');
  });

  it('should include tags and seo fields in create payload', async () => {
    const { component, domeBlogService, router } = buildComponent();
    component.partyId = 'party-1';
    component.name = 'Author Name';
    component.entryForm.setValue({
      title: 'My Entry',
      slug: 'my-entry',
      featuredImage: 'https://cdn/cover.png',
      metaDescription: 'Meta',
      excerpt: 'Excerpt',
      tags: 'AI, ai, Launches',
      content: 'Body'
    });

    await component.create();

    expect(domeBlogService.createBlogEntry).toHaveBeenCalledWith({
      title: 'My Entry',
      slug: 'my-entry',
      featuredImage: 'https://cdn/cover.png',
      metaDescription: 'Meta',
      excerpt: 'Excerpt',
      tags: ['AI', 'Launches'],
      partyId: 'party-1',
      author: 'Author Name',
      content: 'Body'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/blog']);
  });

  it('should extract featured image url from object value', () => {
    const { component } = buildComponent();
    component.entryForm.controls['featuredImage'].setValue({ url: 'https://cdn/object.png' } as any);

    expect(component.getFeaturedImageUrl()).toBe('https://cdn/object.png');
  });

  it('should detect duplicate slug from existing entries except same id', () => {
    const { component } = buildComponent();
    component.blogId = 'entry-2';
    component.existingEntries = [
      { _id: 'entry-2', slug: 'same-slug' },
      { _id: 'entry-3', slug: 'same-slug' }
    ];
    component.entryForm.controls['slug'].setValue('same-slug');

    expect(component.isSlugTaken()).toBeTrue();
  });

  it('should block submit while featured image is uploading', () => {
    const { component } = buildComponent();
    component.entryForm.setValue({
      title: 'My Entry',
      slug: 'my-entry',
      featuredImage: '',
      metaDescription: '',
      excerpt: '',
      tags: '',
      content: 'Body'
    });
    component.uploadingFeaturedImage = true;

    expect(component.canSubmit()).toBeFalse();
  });

  it('should delete entry and navigate back when confirmed', async () => {
    const { component, domeBlogService, router } = buildComponent({ routeId: 'entry-9' });
    component.blogId = 'entry-9';

    await component.confirmDelete();

    expect(domeBlogService.deleteBlogEntry).toHaveBeenCalledWith('entry-9');
    expect(router.navigate).toHaveBeenCalledWith(['/blog']);
    expect(component.loading).toBeFalse();
  });
});
