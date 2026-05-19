import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {EventMessageService} from "src/app/services/event-message.service";
import {LocalStorageService} from "src/app/services/local-storage.service";
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { ConfirmDialogComponent } from "src/app/shared/confirm-dialog/confirm-dialog.component";

@Component({
  selector: 'app-dome-blog',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './dome-blog.component.html',
  styleUrl: './dome-blog.component.css'
})
export class DomeBlogComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  partyId:any='';
  checkAdmin:boolean=false;
  private destroy$ = new Subject<void>();
  deletingEntryId: string | null = null;
  showDeleteConfirm = false;
  pendingDeleteEntry: any = null;
  deleteConfirmTitle = 'Delete entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'Delete';
  deleteConfirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-red-700 border border-transparent rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';

  entries:any[]=[ ]

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    await this.loadEntries();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      console.log('user info ---')
      console.log(aux)
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


  goToDetails(entry:any) {
    this.router.navigate(['/blog/', this.getEntryRouteId(entry)]);
  }

  goToCreate(){
    this.router.navigate(['/blog-entry']);
  }

  goToUpdate(id:any){
    this.router.navigate(['/blog-entry/', id]);
  }

  canManageEntry(entry: any): boolean {
    return this.checkAdmin;
  }

  isDeletingEntry(entry: any): boolean {
    return this.deletingEntryId === entry?._id;
  }

  openDeleteDialog(entry: any) {
    if (!entry?._id || this.isDeletingEntry(entry)) {
      return;
    }

    this.pendingDeleteEntry = entry;
    this.deleteConfirmMessage = `Are you sure you want to delete "${entry.title}"? This action cannot be undone.`;
    this.showDeleteConfirm = true;
  }

  closeDeleteDialog() {
    this.showDeleteConfirm = false;
    this.pendingDeleteEntry = null;
  }

  async confirmDeleteEntry() {
    if (!this.pendingDeleteEntry?._id) {
      this.closeDeleteDialog();
      return;
    }

    this.deletingEntryId = this.pendingDeleteEntry._id;
    this.closeDeleteDialog();
    try {
      await this.domeBlogService.deleteBlogEntry(this.deletingEntryId);
      await this.loadEntries();
    } catch (error) {
      console.error('There was an error while deleting the entry!', error);
    } finally {
      this.deletingEntryId = null;
    }
  }

  async loadEntries() {
    try {
      let entries = await this.domeBlogService.getBlogEntries();
      this.entries = Array.isArray(entries) ? entries : [];
    } catch (error) {
      this.entries = [];
    }
  }

  getEntryRouteId(entry:any): string {
    if (entry?.slug && typeof entry.slug === 'string' && entry.slug.trim().length > 0) {
      return entry.slug.trim();
    }

    return entry?._id;
  }

  getFeaturedImage(entry: any): string | null {
    if (typeof entry?.featuredImage === 'string' && entry.featuredImage.trim().length > 0) {
      return entry.featuredImage.trim();
    }

    if (typeof entry?.featuredImage?.url === 'string' && entry.featuredImage.url.trim().length > 0) {
      return entry.featuredImage.url.trim();
    }

    return null;
  }

  getEntryTags(entry: any): string[] {
    const rawTags = entry?.tags;
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

  getEntryExcerpt(entry: any): string {
    const explicitExcerpt = (entry?.excerpt || '').toString().trim();
    if (explicitExcerpt) {
      return explicitExcerpt;
    }

    const metaDescription = (entry?.metaDescription || '').toString().trim();
    if (metaDescription) {
      return metaDescription;
    }

    const plainTextContent = this.stripMarkdown((entry?.content || '').toString());
    return this.truncateText(plainTextContent, 260);
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
