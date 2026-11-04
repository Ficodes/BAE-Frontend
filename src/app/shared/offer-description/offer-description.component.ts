import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowProgress, faArrowRightArrowLeft, faDownload, faMinus, faObjectExclude, faPlus, faSwap } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { findIconByName } from 'src/app/config/popular-icons';
import { parseOfferDescription } from './offer-description.util';

@Component({
  selector: 'app-offer-description',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslateModule, MarkdownModule],
  templateUrl: './offer-description.component.html',
  styleUrl: './offer-description.component.css'
})
export class OfferDescriptionComponent implements OnChanges {
  @Input() description: string | undefined;
  @Input() relationships: any[] = [];
  @Input() attachments: any[] = [];
  sections = parseOfferDescription(undefined);
  descMoreOpen = false;
  howItWorksMoreOpen = false;
  openFaqIdx: number | null = null;
  resolveIcon = findIconByName;
  readonly faArrowProgress = faArrowProgress;
  readonly faArrowRightArrowLeft = faArrowRightArrowLeft;
  readonly faObjectExclude = faObjectExclude;
  readonly faSwap = faSwap;
  readonly faPlus = faPlus;
  readonly faMinus = faMinus;
  readonly faDownload = faDownload;

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['description']) return;
    this.sections = parseOfferDescription(this.description);
    this.descMoreOpen = false;
    this.howItWorksMoreOpen = false;
    this.openFaqIdx = null;
  }
  hasLongWord(value: string | undefined, threshold = 20): boolean { return !!value?.split(/\s+/).some(word => word.length > threshold); }
  isLongText(value: string | undefined): boolean { return (value ?? '').length > 280; }
  toggleFaq(index: number) { this.openFaqIdx = this.openFaqIdx === index ? null : index; }
  isFaqOpen(index: number): boolean { return this.openFaqIdx === index; }
  goToLink(url: string) { window.open(url, '_blank', 'noopener,noreferrer'); }
}
