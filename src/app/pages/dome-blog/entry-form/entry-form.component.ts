import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {MarkdownTextareaComponent} from "src/app/shared/forms/markdown-textarea/markdown-textarea.component";
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { AttachmentServiceService } from "src/app/services/attachment-service.service";
import {LocalStorageService} from "src/app/services/local-storage.service";
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { ConfirmDialogComponent } from "src/app/shared/confirm-dialog/confirm-dialog.component";
import { environment } from "src/environments/environment";

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [MarkdownTextareaComponent, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.css'
})
export class EntryFormComponent implements OnInit {
  private readonly slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  private readonly filenameRegex = /^[A-Za-z0-9_.-]+$/;
  readonly maxFileSize: number = environment.MAX_FILE_SIZE;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
    private attachmentService: AttachmentServiceService
  ) {
  }

  entryForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    slug: new FormControl('', [Validators.required, Validators.pattern(this.slugRegex)]),
    featuredImage: new FormControl(''),
    metaDescription: new FormControl('', [Validators.maxLength(160)]),
    excerpt: new FormControl('', [Validators.maxLength(300)]),
    tags: new FormControl(''),
    content: new FormControl('', [Validators.required]),
  });

  loading:boolean=false;
  partyId:any='';
  showError:boolean=false;
  errorMessage:any='';
  name:any='';
  blogId:any=undefined;
  existingEntries: any[] = [];
  slugManuallyEdited = false;
  showDeleteConfirm = false;
  deleteConfirmTitle = 'Delete entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'Delete';
  deleteConfirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-red-700 border border-transparent rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';
  uploadingFeaturedImage = false;

  async ngOnInit(): Promise<void> {
    this.setupSlugHandlers();
    this.blogId = this.route.snapshot.paramMap.get('id')!;
    await this.loadExistingEntries();
    if(this.blogId){
      let blogInfo = await this.domeBlogService.getBlogEntryById(this.blogId);
      this.entryForm.controls['title'].setValue(blogInfo.title);
      const slugValue = this.slugify(blogInfo.slug || blogInfo.title || '');
      this.entryForm.controls['slug'].setValue(slugValue, { emitEvent: false });
      this.entryForm.controls['featuredImage'].setValue(this.extractFeaturedImageUrl(blogInfo.featuredImage));
      this.entryForm.controls['metaDescription'].setValue(blogInfo.metaDescription || '');
      this.entryForm.controls['excerpt'].setValue(blogInfo.excerpt || '');
      this.entryForm.controls['tags'].setValue(this.formatTagsForInput(blogInfo.tags));
      this.slugManuallyEdited = slugValue.length > 0 && slugValue !== this.slugify(blogInfo.title || '');
      this.entryForm.controls['content'].setValue(blogInfo.content);
    } else {
      this.entryForm.controls['slug'].setValue(this.slugify(this.entryForm.value.title || ''), { emitEvent: false });
    }
    this.initPartyInfo();
  }

  goBack(){
    this.router.navigate(['/blog']);
  }

  async create(){
    if (this.entryForm.invalid || this.isSlugTaken()) {
      this.entryForm.markAllAsTouched();
      return;
    }

    let body={
      title: this.entryForm.value.title,
      slug: this.entryForm.value.slug,
      featuredImage: this.getFeaturedImageUrl(),
      metaDescription: this.entryForm.value.metaDescription,
      excerpt: this.entryForm.value.excerpt,
      tags: this.parseTagsFromForm(),
      partyId: this.partyId,
      author: this.name,
      content: this.entryForm.value.content,
    }
    //await lastValueFrom(this.domeBlogService.createBlogEntry(body))
    this.domeBlogService.createBlogEntry(body).subscribe({
      next: data => {
        this.loading=false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage='Error: '+error.error.error;
        } else {
          this.errorMessage='There was an error while creating the entry!';
        }
        this.loading=false;
        this.showError=true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    });
  }

  async update(){
    if (this.entryForm.invalid || this.isSlugTaken()) {
      this.entryForm.markAllAsTouched();
      return;
    }

    let body={
      title: this.entryForm.value.title,
      slug: this.entryForm.value.slug,
      featuredImage: this.getFeaturedImageUrl(),
      metaDescription: this.entryForm.value.metaDescription,
      excerpt: this.entryForm.value.excerpt,
      tags: this.parseTagsFromForm(),
      content: this.entryForm.value.content
    }
    //await lastValueFrom(this.domeBlogService.createBlogEntry(body))
    try {
      await this.domeBlogService.updateBlogEntry(body,this.blogId)
      this.loading=false;
      this.goBack();
    } catch (error) {
      this.errorMessage='There was an error while updating the entry!'
      this.showError=true;
      setTimeout(() => {
        this.showError = false;
      }, 3000);
    }
  }

  openDeleteDialog() {
    if (!this.blogId || this.loading) {
      return;
    }

    this.deleteConfirmMessage = `Are you sure you want to delete "${this.entryForm.controls['title'].value || 'this post'}"? This action cannot be undone.`;
    this.showDeleteConfirm = true;
  }

  closeDeleteDialog() {
    this.showDeleteConfirm = false;
  }

  async confirmDelete(){
    if (!this.blogId) {
      this.closeDeleteDialog();
      return;
    }

    this.closeDeleteDialog();
    this.loading = true;
    try {
      await this.domeBlogService.deleteBlogEntry(this.blogId);
      this.loading=false;
      this.goBack();
    } catch (error) {
      this.loading=false;
      this.errorMessage='There was an error while deleting the entry!'
      this.showError=true;
      setTimeout(() => {
        this.showError = false;
      }, 3000);
    }
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        this.name = aux.user;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        this.name = loggedOrg.name;
      }
    }
  }

  async loadExistingEntries() {
    try {
      const entries = await this.domeBlogService.getBlogEntries();
      this.existingEntries = Array.isArray(entries) ? entries : [];
    } catch (error) {
      this.existingEntries = [];
    }
  }

  setupSlugHandlers() {
    this.entryForm.controls['title'].valueChanges.subscribe((value) => {
      if (this.slugManuallyEdited) {
        return;
      }

      this.entryForm.controls['slug'].setValue(this.slugify(value || ''), { emitEvent: false });
    });

    this.entryForm.controls['slug'].valueChanges.subscribe((value) => {
      const normalized = this.slugify(value || '');
      if (value !== normalized) {
        this.entryForm.controls['slug'].setValue(normalized, { emitEvent: false });
      }

      const generatedFromTitle = this.slugify(this.entryForm.controls['title'].value || '');
      this.slugManuallyEdited = normalized.length > 0 && normalized !== generatedFromTitle;
    });
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  isSlugTaken(): boolean {
    const slug = this.slugify(this.entryForm.controls['slug'].value || '');
    if (!slug) {
      return false;
    }

    return this.existingEntries.some((entry) => {
      const existingSlug = this.slugify((entry.slug || entry.title || '') as string);
      return existingSlug === slug && entry._id !== this.blogId;
    });
  }

  canSubmit(): boolean {
    return !this.loading && !this.uploadingFeaturedImage && this.entryForm.valid && !this.isSlugTaken();
  }

  onFeaturedImageSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showTemporaryError('File must have a valid image format!');
      inputElement.value = '';
      return;
    }

    if (file.size > this.maxFileSize) {
      this.showTemporaryError('File size must be under 3MB.');
      inputElement.value = '';
      return;
    }

    const sanitizedFileName = file.name.replace(/[^A-Za-z0-9_.-]/g, '_');
    const uploadFileName = `blogcover_${Date.now()}_${sanitizedFileName}`;
    if (!this.filenameRegex.test(uploadFileName)) {
      this.showTemporaryError('File name contains unsupported characters.');
      inputElement.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const rawResult = e.target?.result;
      if (typeof rawResult !== 'string' || !rawResult.includes(',')) {
        this.showTemporaryError('There was an error while processing the image file.');
        inputElement.value = '';
        return;
      }

      const base64String = rawResult.split(',')[1];
      const fileBody = {
        content: {
          name: uploadFileName,
          data: base64String
        },
        contentType: file.type,
        isPublic: true
      };

      this.uploadingFeaturedImage = true;
      this.attachmentService.uploadFile(fileBody).subscribe({
        next: (data) => {
          const uploadedUrl = (data?.content || '').toString();
          if (!uploadedUrl) {
            this.showTemporaryError('There was an error while uploading the featured image.');
            return;
          }

          this.entryForm.controls['featuredImage'].setValue(uploadedUrl);
        },
        error: (error) => {
          console.error('There was an error while uploading featured image!', error);
          if (error.status === 413) {
            this.showTemporaryError('File size too large! Must be under 3MB.');
            return;
          }
          if (error?.error?.error) {
            this.showTemporaryError(`Error: ${error.error.error}`);
            return;
          }
          this.showTemporaryError('There was an error while uploading the featured image.');
        },
        complete: () => {
          this.uploadingFeaturedImage = false;
          inputElement.value = '';
        }
      });
    };

    reader.onerror = () => {
      this.showTemporaryError('There was an error while reading the image file.');
      inputElement.value = '';
    };

    reader.readAsDataURL(file);
  }

  removeFeaturedImage() {
    this.entryForm.controls['featuredImage'].setValue('');
  }

  getFeaturedImageUrl(): string {
    return this.extractFeaturedImageUrl(this.entryForm.controls['featuredImage'].value);
  }

  parseTagsFromForm(): string[] {
    const rawValue = (this.entryForm.controls['tags'].value || '').toString();
    if (!rawValue.trim()) {
      return [];
    }

    const dedupedTags = new Map<string, string>();
    rawValue.split(',').forEach((tag) => {
      const normalizedTag = tag.trim().replace(/\s+/g, ' ');
      if (!normalizedTag) {
        return;
      }

      const dedupeKey = normalizedTag.toLowerCase();
      if (!dedupedTags.has(dedupeKey)) {
        dedupedTags.set(dedupeKey, normalizedTag);
      }
    });

    return Array.from(dedupedTags.values());
  }

  private formatTagsForInput(tags: any): string {
    if (Array.isArray(tags)) {
      return tags
        .map((tag) => (tag ?? '').toString().trim())
        .filter((tag) => tag.length > 0)
        .join(', ');
    }

    if (typeof tags === 'string') {
      return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .join(', ');
    }

    return '';
  }

  private extractFeaturedImageUrl(featuredImage: any): string {
    if (!featuredImage) {
      return '';
    }

    if (typeof featuredImage === 'string') {
      return featuredImage.trim();
    }

    if (typeof featuredImage?.url === 'string') {
      return featuredImage.url.trim();
    }

    return '';
  }

  private showTemporaryError(message: string) {
    this.errorMessage = message;
    this.showError = true;
    this.uploadingFeaturedImage = false;
    setTimeout(() => {
      this.showError = false;
    }, 3000);
  }

}
