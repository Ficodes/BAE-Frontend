import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  TenderCalendarDay,
  addCalendarMonths,
  formatTenderDateLabel,
  getTenderCalendarGrid,
  isIsoDateBefore,
  parseIsoDate,
  toIsoDate,
} from './tender-date-field.model';

@Component({
  selector: 'app-tender-date-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <button
        type="button"
        (click)="toggleCalendar()"
        [disabled]="disabled"
        class="flex h-12 w-full items-center justify-between rounded-lg border border-[#EBECEE] bg-white px-4 text-left text-[15px] text-[#0b1220] transition-colors hover:border-[#1f4fbf] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:bg-[#F7F9FD] disabled:text-[#9AA6B8]"
      >
        <span [ngClass]="value ? 'font-semibold text-[#0b1220]' : 'text-[#9AA6B8]'">
          {{ selectedDateLabel }}
        </span>
        <svg class="h-5 w-5 text-[#526179]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      </button>

      <div
        *ngIf="isCalendarOpen"
        class="absolute left-0 top-full z-[80] mt-2 w-[320px] rounded-2xl border border-[#EBECEE] bg-white p-3 shadow-[0_12px_32px_rgba(11,18,32,0.16)]"
      >
        <div class="mb-3 flex items-center justify-between">
          <button
            type="button"
            (click)="showPreviousMonth()"
            class="rounded-lg p-2 text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf]"
            aria-label="Previous month"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p class="text-sm font-semibold text-[#0b1220]">{{ visibleMonthLabel }}</p>
          <button
            type="button"
            (click)="showNextMonth()"
            class="rounded-lg p-2 text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf]"
            aria-label="Next month"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#526179]">
          <span *ngFor="let day of weekDayLabels">{{ day }}</span>
        </div>

        <div class="mt-2 grid grid-cols-7 gap-1">
          <button
            *ngFor="let day of calendarDays"
            type="button"
            (click)="selectDay(day)"
            [disabled]="isDisabled(day)"
            [ngClass]="getDayClass(day)"
            class="flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {{ day.day }}
          </button>
        </div>

        <div class="mt-3 flex items-center justify-between border-t border-[#EBECEE] pt-3">
          <button
            type="button"
            (click)="clearDate()"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf]"
          >
            Clear
          </button>
          <button
            type="button"
            (click)="selectToday()"
            [disabled]="isTodayDisabled"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1f4fbf] transition-colors hover:bg-[#EBF0F7] disabled:cursor-not-allowed disabled:text-[#9AA6B8]"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  `,
})
export class TenderDateFieldComponent implements OnChanges {
  @Input() value = '';
  @Input() min = '';
  @Input() placeholder = 'DD/MM/YYYY';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  readonly weekDayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  isCalendarOpen = false;
  visibleMonth = new Date();
  todayIso = toIsoDate(new Date());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      const selected = parseIsoDate(this.value);
      if (selected) {
        this.visibleMonth = selected;
      }
    }
  }

  @HostListener('document:click')
  closeCalendar(): void {
    this.isCalendarOpen = false;
  }

  get selectedDateLabel(): string {
    return formatTenderDateLabel(this.value, this.placeholder);
  }

  get visibleMonthLabel(): string {
    return this.visibleMonth.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }

  get calendarDays(): TenderCalendarDay[] {
    return getTenderCalendarGrid(this.visibleMonth);
  }

  get isTodayDisabled(): boolean {
    return isIsoDateBefore(this.todayIso, this.min);
  }

  toggleCalendar(): void {
    if (this.disabled) return;
    this.visibleMonth = parseIsoDate(this.value) ?? new Date();
    this.isCalendarOpen = !this.isCalendarOpen;
  }

  showPreviousMonth(): void {
    this.visibleMonth = addCalendarMonths(this.visibleMonth, -1);
  }

  showNextMonth(): void {
    this.visibleMonth = addCalendarMonths(this.visibleMonth, 1);
  }

  selectDay(day: TenderCalendarDay): void {
    if (this.isDisabled(day)) return;
    this.valueChange.emit(day.iso);
    this.isCalendarOpen = false;
  }

  selectToday(): void {
    if (this.isTodayDisabled) return;
    this.valueChange.emit(this.todayIso);
    this.isCalendarOpen = false;
  }

  clearDate(): void {
    this.valueChange.emit('');
    this.isCalendarOpen = false;
  }

  isDisabled(day: TenderCalendarDay): boolean {
    return isIsoDateBefore(day.iso, this.min);
  }

  getDayClass(day: TenderCalendarDay): string {
    if (day.iso === this.value) {
      return 'bg-[#1f4fbf] text-white hover:bg-[#183f99]';
    }

    if (this.isDisabled(day)) {
      return 'text-[#CBD3DF]';
    }

    if (day.iso === this.todayIso) {
      return 'bg-[#EBF0F7] text-[#1f4fbf] hover:bg-[#DDE6F6]';
    }

    return day.inCurrentMonth
      ? 'text-[#0b1220] hover:bg-[#EBF0F7]'
      : 'text-[#9AA6B8] hover:bg-[#F7F9FD]';
  }
}
