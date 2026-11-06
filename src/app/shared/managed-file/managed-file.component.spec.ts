import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { AttachmentServiceService, FileInfo } from 'src/app/services/attachment-service.service';
import { ManagedFileComponent } from './managed-file.component';

describe('ManagedFileComponent', () => {
  let fixture: ComponentFixture<ManagedFileComponent>;
  let component: ManagedFileComponent;
  let attachments: jasmine.SpyObj<AttachmentServiceService>;
  const file = {
    id: 'file-id', contentType: 'application/pdf',
    location: 'http://proxy.docker:8004/charging/media/assets/provider/my%20document.pdf'
  };

  beforeEach(async () => {
    attachments = jasmine.createSpyObj('AttachmentServiceService', ['getFileInfo', 'downloadManagedFile']);
    attachments.getFileInfo.and.returnValue(of(file));
    await TestBed.configureTestingModule({
      imports: [ManagedFileComponent, TranslateModule.forRoot()],
      providers: [{ provide: AttachmentServiceService, useValue: attachments }]
    }).compileComponents();
    fixture = TestBed.createComponent(ManagedFileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fileId', file.id);
    fixture.detectChanges();
  });

  it('shows the decoded filename and MIME type instead of the file ID', () => {
    expect(attachments.getFileInfo).toHaveBeenCalledWith(file.id);
    expect(fixture.nativeElement.textContent).toContain('my document.pdf');
    expect(fixture.nativeElement.textContent).toContain('application/pdf');
    expect(fixture.nativeElement.textContent).not.toContain(file.id);
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('downloads a blob and releases its object URL when destroyed', () => {
    const blob = new Blob(['pdf'], { type: file.contentType });
    attachments.downloadManagedFile.and.returnValue(of(blob));
    const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:local-file');
    const revoke = spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    component.download();
    expect(attachments.downloadManagedFile).toHaveBeenCalledWith(file);
    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:local-file');
  });

  it('allows retry after a metadata failure', () => {
    attachments.getFileInfo.and.returnValue(throwError(() => new Error('401')));
    component.loadFile();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    attachments.getFileInfo.and.returnValue(of(file));
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(component.fileName).toBe('my document.pdf');
    expect(component.loadError).toBeFalse();
  });

  it('allows retry after a download failure', () => {
    attachments.downloadManagedFile.and.returnValue(throwError(() => new Error('401')));
    component.download();
    expect(component.downloadError).toBeTrue();
    expect(component.downloading).toBeFalse();
  });

  it('cancels stale metadata when the saved file changes', () => {
    const stale = new Subject<FileInfo>();
    attachments.getFileInfo.and.returnValue(stale);
    component.loadFile();
    attachments.getFileInfo.and.returnValue(of({ ...file, id: 'new-file', location: '/charging/media/assets/new.pdf' }));
    fixture.componentRef.setInput('fileId', 'new-file');
    fixture.detectChanges();
    stale.next(file);
    expect(component.fileName).toBe('new.pdf');
    expect(component.loading).toBeFalse();
  });
});
