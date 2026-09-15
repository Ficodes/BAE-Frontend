import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { LoginInfo } from 'src/app/models/interfaces';
import { DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css'
})
export class FaqComponent implements OnInit {
  faqs: any[] = [];
  openFaqId = '';
  checkAdmin = false;
  deletingEntryId: string | null = null;
  showDeleteConfirm = false;
  pendingDeleteEntry: any = null;
  deleteConfirmTitle = 'Delete FAQ';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'Delete';
  deleteConfirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-red-700 border border-transparent rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';

  constructor(
    private router: Router,
    private domeBlogService: DomeBlogServiceService,
    private localStorage: LocalStorageService
  ) {}

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    await this.loadFaqs();
  }

  async loadFaqs() {
    try {
      const response = await this.domeBlogService.getBlogEntries({ contentType: 'faq' });
      this.faqs = this.extractEntries(response).filter((entry) => this.isFaqEntry(entry));
    } catch (error) {
      this.faqs = [];
    }
  }

  toggleFaq(id: string) {
    this.openFaqId = this.openFaqId === id ? '' : id;
  }

  isOpen(id: string): boolean {
    return this.openFaqId === id;
  }

  getEntryId(entry: any): string {
    return entry?._id || entry?.id || entry?.slug || entry?.title;
  }

  goToCreate() {
    this.router.navigate(['/blog-entry'], { queryParams: { type: 'faq' } });
  }

  goToUpdate(entry: any) {
    const id = entry?._id || entry?.id;
    if (!id) {
      return;
    }

    this.router.navigate(['/blog-entry/', id], { queryParams: { type: 'faq' } });
  }

  canManageEntry(): boolean {
    return this.checkAdmin;
  }

  isDeletingEntry(entry: any): boolean {
    return this.deletingEntryId === (entry?._id || entry?.id);
  }

  openDeleteDialog(entry: any) {
    const id = entry?._id || entry?.id;
    if (!id || this.isDeletingEntry(entry)) {
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
    const id = this.pendingDeleteEntry?._id || this.pendingDeleteEntry?.id;
    if (!id) {
      this.closeDeleteDialog();
      return;
    }

    this.deletingEntryId = id;
    this.closeDeleteDialog();
    try {
      await this.domeBlogService.deleteBlogEntry(id);
      await this.loadFaqs();
    } catch (error) {
      console.error('There was an error while deleting the FAQ entry!', error);
    } finally {
      this.deletingEntryId = null;
    }
  }

  private initPartyInfo(){
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      this.checkAdmin=aux.roles.some(role =>
        role.name === 'admin'
      );
    }
  }

  private extractEntries(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const possibleEntries = response?.items || response?.entries || response?.data || response?.results || response?.content;
    return Array.isArray(possibleEntries) ? possibleEntries : [];
  }

  private isFaqEntry(entry: any): boolean {
    const contentType = (entry?.contentType || entry?.type || '').toString().trim().toLowerCase();
    return contentType === 'faq';
  }

}
