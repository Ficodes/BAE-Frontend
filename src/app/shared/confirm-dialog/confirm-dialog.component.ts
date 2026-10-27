import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-offerings-overlay/50 flex items-center justify-center z-[70]">
      <div class="bg-offerings-surface text-offerings-heading dark:bg-tertiary-100 dark:text-offerings-on-dark rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">{{ title || ('COMMON._confirm_action' | translate) }}</h3>
        <p class="text-offerings-muted-text dark:text-offerings-on-dark-body mb-6">{{ message || ('COMMON._confirm_message' | translate) }}</p>
        <div class="flex justify-end space-x-3">
          <button
            (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-offerings-heading bg-offerings-surface border border-offerings-border-strong rounded-md hover:bg-offerings-page focus:outline-none focus:ring-2 focus:ring-offerings-active-chip dark:bg-tertiary-100 dark:text-offerings-on-dark-body dark:border-secondary-400 dark:hover:bg-secondary-100"
          >
            {{ 'COMMON._cancel' | translate }}
          </button>
          <button
            (click)="onConfirm()"
            [class]="confirmButtonClass"
          >
            {{ confirmText || ('COMMON._confirm' | translate) }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = '';
  @Input() confirmButtonClass = 'px-4 py-2 text-sm font-medium text-offerings-on-dark bg-offerings-link border border-transparent rounded-md hover:bg-offerings-link-hover focus:outline-none focus:ring-2 focus:ring-offerings-active-chip';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
