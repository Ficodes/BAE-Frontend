import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b1220]/45 px-4 font-[Blinker]">
      <div class="w-full max-w-md rounded-2xl border border-[#EBECEE] bg-white p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]">
        <h3 class="mb-4 text-lg font-bold text-[#0b1220]">{{ title }}</h3>
        <p class="mb-6 text-sm text-[#526179]">{{ message }}</p>
        <div class="flex justify-end gap-3 border-t border-[#EBECEE] pt-4">
          <button
            (click)="onCancel()"
            class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC]"
          >
            Cancel
          </button>
          <button
            (click)="onConfirm()"
            [class]="confirmButtonClass"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() confirmButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
