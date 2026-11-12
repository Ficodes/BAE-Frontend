import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';
import { AttachmentServiceService, FileInfo } from 'src/app/services/attachment-service.service';

@Component({
  selector: 'app-managed-file',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './managed-file.component.html'
})
export class ManagedFileComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) fileId = '';
  @Input() prominent = false;
  file?: FileInfo;
  fileName = '';
  loading = false;
  loadError = false;
  downloading = false;
  downloadError = false;
  private metadataRequest?: Subscription;
  private downloadRequest?: Subscription;
  private downloadUrl?: string;

  constructor(private attachments: AttachmentServiceService) {}

  ngOnChanges(): void {
    this.loadFile();
  }

  loadFile(): void {
    this.metadataRequest?.unsubscribe();
    this.downloadRequest?.unsubscribe();
    this.revokeDownloadUrl();
    this.file = undefined;
    this.fileName = '';
    this.loadError = false;
    this.downloadError = false;
    this.loading = !!this.fileId;
    if (!this.fileId) return;
    this.metadataRequest = this.attachments.getFileInfo(this.fileId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: file => {
          this.file = file;
          try {
            const path = new URL(file.location, 'http://charging.local').pathname;
            this.fileName = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
          } catch {
            this.fileName = '';
          }
        },
        error: () => this.loadError = true
      });
  }

  download(): void {
    if (!this.file || this.downloading) return;
    this.downloadError = false;
    this.downloading = true;
    // Handle malformed locations as a recoverable download error as well.
    try {
      this.downloadRequest = this.attachments.downloadManagedFile(this.file)
        .pipe(finalize(() => this.downloading = false))
        .subscribe({
          next: blob => {
            this.revokeDownloadUrl();
            this.downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = this.downloadUrl;
            link.download = this.fileName || 'download';
            link.click();
          },
          error: () => this.downloadError = true
        });
    } catch {
      this.downloading = false;
      this.downloadError = true;
    }
  }

  ngOnDestroy(): void {
    this.metadataRequest?.unsubscribe();
    this.downloadRequest?.unsubscribe();
    this.revokeDownloadUrl();
  }

  private revokeDownloadUrl(): void {
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
    this.downloadUrl = undefined;
  }
}
