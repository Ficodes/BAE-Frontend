import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {EventMessageService} from "src/app/services/event-message.service";
import {LocalStorageService} from "src/app/services/local-storage.service";
import { DomeBlogContentType, DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { LoginInfo } from 'src/app/models/interfaces';
import moment from 'moment';
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
  private readonly pageLimit = 9;

  constructor(
    private router: Router,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
    private route?: ActivatedRoute,
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
  contentType: DomeBlogContentType = 'blog';
  pageTitle = 'Blog';
  createButtonLabel = 'Add a new entry';
  routeBase = '/blog';
  isNewsLayout = false;
  currentPage = 1;
  hasMoreEntries = false;
  loadingMore = false;

  async ngOnInit(): Promise<void> {
    this.applyRouteConfiguration();
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
    this.router.navigate([`${this.routeBase}/`, this.getEntryRouteId(entry)]);
  }

  goToCreate(){
    this.router.navigate(['/blog-entry'], { queryParams: { type: this.contentType } });
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
      this.currentPage = 1;
      const response = await this.domeBlogService.getBlogEntries({
        contentType: this.contentType,
        page: this.currentPage,
        limit: this.pageLimit
      });
      const { entries, hasMore } = this.normalizeEntryResponse(response, this.currentPage);
      this.entries = entries;
      this.hasMoreEntries = hasMore;
    } catch (error) {
      this.entries = [];
      this.hasMoreEntries = false;
    }
  }

  async loadMoreEntries() {
    if (this.loadingMore || !this.hasMoreEntries) {
      return;
    }

    this.loadingMore = true;
    try {
      const nextPage = this.currentPage + 1;
      const response = await this.domeBlogService.getBlogEntries({
        contentType: this.contentType,
        page: nextPage,
        limit: this.pageLimit
      });
      const { entries, hasMore } = this.normalizeEntryResponse(response, nextPage);
      this.entries = [...this.entries, ...entries];
      this.currentPage = nextPage;
      this.hasMoreEntries = hasMore;
    } catch (error) {
      this.hasMoreEntries = false;
    } finally {
      this.loadingMore = false;
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

  getCardTitleClass(): string {
    return this.isNewsLayout
      ? 'text-[28px] leading-tight md:text-[30px]'
      : 'text-2xl';
  }

  getImageClass(): string {
    return this.isNewsLayout
      ? 'h-72 w-full rounded-lg border border-gray-300 object-cover md:h-64 md:w-[432px] md:min-w-[432px] dark:border-gray-700'
      : 'h-52 w-full rounded-lg border border-gray-300 object-contain p-2 md:h-44 md:w-72 md:min-w-72 dark:border-gray-700';
  }

  private applyRouteConfiguration() {
    const routeContentType = this.route?.snapshot.data?.['contentType'] as DomeBlogContentType | undefined;
    this.contentType = routeContentType || 'blog';
    this.isNewsLayout = this.contentType === 'news';
    this.routeBase = this.isNewsLayout ? '/news' : '/blog';
    this.pageTitle = this.isNewsLayout ? 'News & Events' : 'Blog';
    this.createButtonLabel = this.isNewsLayout ? 'Add news/event' : 'Add a new entry';
  }

  private normalizeEntryResponse(response: any, page: number): { entries: any[]; hasMore: boolean } {
    const rawEntries = this.extractEntries(response);
    const entries = rawEntries.filter((entry) => this.matchesContentType(entry));
    const total = Number(response?.total ?? response?.count ?? response?.pagination?.total ?? 0);
    const hasExplicitNext = Boolean(response?.next || response?.hasMore || response?.pagination?.hasNext);
    const hasMore = hasExplicitNext || (total > 0 && page * this.pageLimit < total);

    return { entries, hasMore };
  }

  private extractEntries(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const possibleEntries = response?.items || response?.entries || response?.data || response?.results || response?.content;
    return Array.isArray(possibleEntries) ? possibleEntries : [];
  }

  private matchesContentType(entry: any): boolean {
    const entryContentType = (entry?.contentType || entry?.type || '').toString().trim().toLowerCase();
    if (this.contentType === 'blog') {
      return !entryContentType || entryContentType === 'blog';
    }

    return entryContentType === this.contentType;
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
