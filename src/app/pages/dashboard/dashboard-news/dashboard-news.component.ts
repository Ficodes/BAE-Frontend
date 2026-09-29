import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faChevronLeft, faChevronRight } from '@fortawesome/pro-regular-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { DomeBlogContentType, DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';

export const NEWS_WIDGET_CONTENT_TYPE: DomeBlogContentType = 'blog';
export const NEWS_WIDGET_ROUTE_BASE = '/blog';
export const NEWS_WIDGET_CARD_COUNT = 3;

@Component({
  selector: 'app-dashboard-news',
  standalone: true,
  templateUrl: './dashboard-news.component.html',
  styleUrl: './dashboard-news.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule, RouterLink, FontAwesomeModule]
})
export class DashboardNewsComponent implements OnInit {
  faArrowRight = faArrowRight;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  readonly routeBase = NEWS_WIDGET_ROUTE_BASE;

  readonly placeholderDots = Array.from({ length: NEWS_WIDGET_CARD_COUNT });

  static readonly SWIPE_THRESHOLD_PX = 50;

  entries: any[] = [];
  isLoading = true;
  hasError = false;

  activeIndex = 0;

  transitionTick = 0;

  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  constructor(
    private domeBlogService: DomeBlogServiceService,
    private cdr: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadLatestEntries();
  }

  get isSectionVisible(): boolean {
    return this.isLoading || (!this.hasError && this.entries.length > 0);
  }

  get activeEntry(): any | null {
    return this.entries[this.activeIndex] ?? null;
  }

  get hasMultipleEntries(): boolean {
    return this.entries.length > 1;
  }

  next(): void {
    this.goTo(this.activeIndex + 1);
  }

  previous(): void {
    this.goTo(this.activeIndex - 1);
  }

  goTo(index: number): void {
    const count = this.entries.length;
    if (count === 0 || !Number.isInteger(index)) {
      return;
    }

    const target = ((index % count) + count) % count;
    if (target === this.activeIndex) {
      return;
    }

    this.activeIndex = target;
    this.transitionTick++;
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.hasMultipleEntries || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.touches?.[0];
    if (!touch || event.touches.length > 1) {
      this.resetTouch();
      return;
    }

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches?.[0];
    const startX = this.touchStartX;
    const startY = this.touchStartY;
    this.resetTouch();

    if (!touch || startX === null || startY === null || !this.hasMultipleEntries) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < DashboardNewsComponent.SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      this.next();
    } else {
      this.previous();
    }
  }

  resetTouch(): void {
    this.touchStartX = null;
    this.touchStartY = null;
  }

  getEntryRouteId(entry: any): string {
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
    return this.truncateText(plainTextContent, 160);
  }

  getEntryDate(entry: any): Date | null {
    const timestamp = new Date(entry?.date).getTime();
    return Number.isNaN(timestamp) ? null : new Date(timestamp);
  }

  matchesContentType(entry: any, contentType: DomeBlogContentType = NEWS_WIDGET_CONTENT_TYPE): boolean {
    const entryContentType = (entry?.contentType || entry?.type || '').toString().trim().toLowerCase();

    if (contentType === 'blog') {
      return !entryContentType || entryContentType === 'blog';
    }

    return entryContentType === contentType;
  }

  extractEntries(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const possibleEntries = response?.items || response?.entries || response?.data || response?.results || response?.content;
    return Array.isArray(possibleEntries) ? possibleEntries : [];
  }

  sortByDateDescending(entries: any[]): any[] {
    return [...entries].sort((a, b) => this.getEntryTimestamp(b) - this.getEntryTimestamp(a));
  }

  private getEntryTimestamp(entry: any): number {
    const timestamp = new Date(entry?.date).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private async loadLatestEntries(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    try {
      const response = await this.domeBlogService.getBlogEntries({
        contentType: NEWS_WIDGET_CONTENT_TYPE,
        page: 1,
        limit: NEWS_WIDGET_CARD_COUNT,
      });

      const matching = this.extractEntries(response).filter((entry) => this.matchesContentType(entry));

      this.entries = this.sortByDateDescending(matching).slice(0, NEWS_WIDGET_CARD_COUNT);
      this.activeIndex = 0;
      this.isLoading = false;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Unable to load the homepage news widget entries', error);
      this.entries = [];
      this.activeIndex = 0;
      this.hasError = true;
      this.isLoading = false;
      this.cdr.markForCheck();
    }
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
