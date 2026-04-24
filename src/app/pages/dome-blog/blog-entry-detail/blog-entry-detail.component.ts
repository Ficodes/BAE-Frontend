import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { MarkdownComponent } from "ngx-markdown";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { LoginInfo } from "src/app/models/interfaces";
import * as moment from 'moment';
import { ConfirmDialogComponent } from "src/app/shared/confirm-dialog/confirm-dialog.component";
import { Meta, Title } from "@angular/platform-browser";

@Component({
  selector: 'app-blog-entry-detail',
  standalone: true,
  imports: [CommonModule, MarkdownComponent, ConfirmDialogComponent],
  templateUrl: './blog-entry-detail.component.html',
  styleUrl: './blog-entry-detail.component.css'
})
export class BlogEntryDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private domeBlogService: DomeBlogServiceService,
    private localStorage: LocalStorageService,
    private titleService: Title,
    private metaService: Meta
  ) {
  }
  entry:any={};
  blogId:any='';
  partyId:any='';
  checkAdmin:boolean=false;
  deleting:boolean=false;
  showDeleteConfirm = false;
  deleteConfirmTitle = 'Delete entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'Delete';
  deleteConfirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-red-700 border border-transparent rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    this.blogId = this.route.snapshot.paramMap.get('slugOrId') || this.route.snapshot.paramMap.get('id')!;
    this.entry = await this.getEntryBySlugOrId(this.blogId);
    this.applySeoMetadata();
  }

  goBack(){
    this.router.navigate(['/blog']);
  }

  goToUpdate() {
    const entryId = this.entry?._id || (this.isObjectId(this.blogId) ? this.blogId : null);
    if (!entryId) {
      return;
    }

    this.router.navigate(['/blog-entry/', entryId]);
  }

  canManageEntry(): boolean {
    return this.checkAdmin;
  }

  openDeleteDialog() {
    const entryId = this.entry?._id || (this.isObjectId(this.blogId) ? this.blogId : null);
    if (!entryId || this.deleting) {
      return;
    }

    this.deleteConfirmMessage = `Are you sure you want to delete "${this.entry?.title || 'this post'}"? This action cannot be undone.`;
    this.showDeleteConfirm = true;
  }

  closeDeleteDialog() {
    this.showDeleteConfirm = false;
  }

  async confirmDeleteEntry() {
    const entryId = this.entry?._id || (this.isObjectId(this.blogId) ? this.blogId : null);
    if (!entryId) {
      this.closeDeleteDialog();
      return;
    }

    this.closeDeleteDialog();
    this.deleting = true;
    try {
      await this.domeBlogService.deleteBlogEntry(entryId);
      this.goBack();
    } catch (error) {
      console.error('There was an error while deleting the entry!', error);
    } finally {
      this.deleting = false;
    }
  }

  async getEntryBySlugOrId(slugOrId: string) {
    if (!slugOrId) {
      return {};
    }

    if (this.isObjectId(slugOrId)) {
      try {
        return await this.domeBlogService.getBlogEntryById(slugOrId);
      } catch (error) {
      }
    }

    try {
      const entries = await this.domeBlogService.getBlogEntries();
      const matchedEntry = entries.find((entry: any) => entry.slug === slugOrId);
      if (matchedEntry?._id) {
        try {
          return await this.domeBlogService.getBlogEntryById(matchedEntry._id);
        } catch (error) {
          return matchedEntry;
        }
      }

      if (matchedEntry) {
        return matchedEntry;
      }
    } catch (error) {
    }

    try {
      return await this.domeBlogService.getBlogEntryById(slugOrId);
    } catch (error) {
      return {};
    }
  }

  isObjectId(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
      }
      this.checkAdmin=aux.roles.some(role =>
        role.name === 'admin'
      );
    }
  }

  private applySeoMetadata() {
    const title = (this.entry?.title || '').toString().trim();
    const metaDescription = this.getEntryMetaDescription();

    if (title) {
      this.titleService.setTitle(title);
    }

    if (metaDescription) {
      this.metaService.updateTag({ name: 'description', content: metaDescription });
    }
  }

  private getEntryMetaDescription(): string {
    const explicitMeta = (this.entry?.metaDescription || '').toString().trim();
    if (explicitMeta) {
      return this.truncateText(explicitMeta, 160);
    }

    const excerpt = (this.entry?.excerpt || '').toString().trim();
    if (excerpt) {
      return this.truncateText(excerpt, 160);
    }

    const plainContent = this.stripMarkdown((this.entry?.content || '').toString());
    return this.truncateText(plainContent, 160);
  }

  getFeaturedImage(): string | null {
    if (typeof this.entry?.featuredImage === 'string' && this.entry.featuredImage.trim().length > 0) {
      return this.entry.featuredImage.trim();
    }

    if (typeof this.entry?.featuredImage?.url === 'string' && this.entry.featuredImage.url.trim().length > 0) {
      return this.entry.featuredImage.url.trim();
    }

    return null;
  }

  getEntryTags(): string[] {
    const rawTags = this.entry?.tags;
    if (Array.isArray(rawTags)) {
      return rawTags
        .map((tag) => (tag ?? '').toString().trim())
        .filter((tag) => tag.length > 0);
    }

    if (typeof rawTags === 'string') {
      return rawTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    return [];
  }

  private stripMarkdown(content: string): string {
    return content
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/[`*_>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trim()}...`;
  }
}
