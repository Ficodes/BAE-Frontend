import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';

import { DomeBlogServiceService } from './dome-blog-service.service';

describe('DomeBlogServiceService', () => {
  let service: DomeBlogServiceService;
  let httpMock: HttpTestingController;

  const localStorageStub = {
    getItem: jasmine.createSpy('getItem'),
    setItem: jasmine.createSpy('setItem'),
    removeItem: jasmine.createSpy('removeItem'),
    clear: jasmine.createSpy('clear'),
    getObject: jasmine.createSpy('getObject'),
    setObject: jasmine.createSpy('setObject'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [{ provide: LocalStorageService, useValue: localStorageStub }],
    });
    service = TestBed.inject(DomeBlogServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('createBlogEntry should POST to /domeblog with feedback payload', () => {
    const payload = { title: 'My post', content: 'Body' };
    const responseBody = { id: 'blog-1' };

    service.createBlogEntry(payload).subscribe((response) => {
      expect(response).toEqual(responseBody);
    });

    const req = httpMock.expectOne(`${environment.BASE_URL}/domeblog`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(responseBody);
  });

  it('getBlogEntries should GET /domeblog', async () => {
    const responseBody = [{ id: 'blog-1' }, { id: 'blog-2' }];

    const promise = service.getBlogEntries();
    const req = httpMock.expectOne(`${environment.BASE_URL}/domeblog`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('getBlogEntryById should GET /domeblog/:id', async () => {
    const id = 'blog-1';
    const responseBody = { id, title: 'My post' };

    const promise = service.getBlogEntryById(id);
    const req = httpMock.expectOne(`${environment.BASE_URL}/domeblog/${id}`);

    expect(req.request.method).toBe('GET');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('updateBlogEntry should PATCH /domeblog/:id with body', async () => {
    const id = 'blog-1';
    const payload = { title: 'Updated title' };
    const responseBody = { id, ...payload };

    const promise = service.updateBlogEntry(payload, id);
    const req = httpMock.expectOne(`${environment.BASE_URL}/domeblog/${id}`);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });

  it('deleteBlogEntry should DELETE /domeblog/:id', async () => {
    const id = 'blog-1';
    const responseBody = { success: true };

    const promise = service.deleteBlogEntry(id);
    const req = httpMock.expectOne(`${environment.BASE_URL}/domeblog/${id}`);

    expect(req.request.method).toBe('DELETE');
    req.flush(responseBody);

    await expectAsync(promise).toBeResolvedTo(responseBody);
  });
});
