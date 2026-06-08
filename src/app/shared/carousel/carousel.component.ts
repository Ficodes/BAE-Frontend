import {
  Component,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight
} from '@fortawesome/pro-solid-svg-icons';

/**
 * Generic reusable horizontal carousel.
 *
 * Core responsibilities:
 *
 * - Handles horizontal scrolling logic.
 * - Calculates navigation limits.
 * - Applies translateX transform to the track.
 * - Renders navigation arrows.
 * - Renders pagination dots.
 *
 * This component DOES NOT render slide content directly.
 * Instead, it uses Angular content projection (`ng-content`).
 *
 * This allows the parent component to fully control:
 *
 * - Slide layout
 * - Slide styling
 * - Slide structure
 *
 * while the carousel manages:
 *
 * - scrolling
 * - navigation
 * - pagination
 *
 * Typical usage:
 *
 * <app-carousel
 *   [items]="cards"
 *   [visible]="3">
 *
 *   @for (card of cards) {
 *     <div
 *       class="shrink-0 px-4"
 *       [style.width.%]="100 / 3">
 *
 *       <!-- slide content -->
 *
 *     </div>
 *   }
 *
 * </app-carousel>
 */

@Component({
  selector: 'app-carousel',
  standalone: true,
  templateUrl: './carousel.component.html',
  imports: [FontAwesomeModule]
})
export class CarouselComponent<T> implements OnChanges {

  /**
   * Items array.
   *
   * IMPORTANT:
   * The carousel does NOT render these items.
   *
   * The array is used only to:
   *
   * - calculate total number of slides
   * - determine navigation bounds
   * - compute pagination dots
   */
  @Input({ required: true })
  items!: T[];

  /**
   * Number of visible slides at once.
   *
   * Example:
   *
   * visible = 3
   *
   * viewport shows:
   *
   * [0] [1] [2]
   *
   * Then scroll moves:
   *
   * [1] [2] [3]
   */
  @Input({ required: true })
  visible = 3;

  /**
   * Arrow visual theme.
   *
   * light:
   * - white background
   * - dark icon
   *
   * dark:
   * - transparent background
   * - white border + icon
   */
  @Input()
  arrowTheme: 'light' | 'dark' = 'light';

  /**
   * Pagination dots theme.
   *
   * light:
   * default dashboard style
   *
   * accent:
   * landing accent color (#00ADD3)
   */
  @Input()
  dotsTheme: 'light' | 'accent' = 'light';

  /**
   * Enables horizontal padding around the carousel.
   *
   * Useful when arrows should sit
   * outside content boundaries.
   */
  @Input()
  sidePadding = true;

  @Input()
  loop = false;

  /**
   * Current visible index.
   *
   * Represents the FIRST visible item.
   *
   * Example:
   *
   * index = 0
   * visible = 3
   *
   * visible items:
   * 0,1,2
   */
  index = 0;

  /**
   * Navigation icons.
   */
  faChevronRight = faChevronRight;
  faChevronLeft = faChevronLeft;

  /**
   * Maximum allowed scroll index.
   *
   * Prevents overflow scrolling.
   *
   * Example:
   *
   * items = 5
   * visible = 3
   *
   * maxIndex = 2
   */
  get maxIndex(): number {
    return Math.max(0, this.items.length - this.visible);
  }

  /**
   * Total number of pagination pages.
   *
   * Each page corresponds to a possible index.
   */
  get pages(): number {
    return this.maxIndex + 1;
  }

  /**
   * CSS transform applied to the track.
   *
   * Moves content horizontally.
   *
   * Movement step:
   *
   * 100 / visible
   *
   * Example:
   *
   * visible = 3
   * index = 1
   *
   * translateX(-33.33%)
   */
  get trackTransform(): string {
    return `translateX(-${this.index * (100 / this.visible)}%)`;
  }

  /**
   * Wrapper dynamic class.
   *
   * Controls outer horizontal padding.
   */
  get wrapperClass(): string {
    return this.sidePadding
      ? 'relative px-0 sm:px-4 md:px-12 lg:px-16 xl:px-20'
      : 'relative';
  }

  /**
   * Left arrow style selector.
   *
   * Changes based on theme.
   */
  get leftButtonClass(): string {
    return this.arrowTheme === 'dark'
      ? 'absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-transparent text-white transition hover:bg-white/10 disabled:opacity-40'
      : 'absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-md transition disabled:opacity-40';
  }

  /**
   * Right arrow style selector.
   */
  get rightButtonClass(): string {
    return this.arrowTheme === 'dark'
      ? 'absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-transparent text-white transition hover:bg-white/10 disabled:opacity-40'
      : 'absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-md transition disabled:opacity-40';
  }

  /**
   * Returns correct dot color class.
   *
   * Depends on:
   *
   * - active state
   * - theme
   */
  dotClass(active: boolean): string {

    if (this.dotsTheme === 'accent') {
      return active
        ? 'bg-[#00ADD3]'
        : 'bg-[#D1F7FF]';
    }

    return active
      ? 'bg-blue-700'
      : 'bg-slate-300';
  }

  /**
   * Move forward by one step.
   */
  next(): void {
    if (this.loop && this.index >= this.maxIndex) {
      this.index = 0;
      return;
    }
    this.index = Math.min(
      this.index + 1,
      this.maxIndex
    );
  }

  /**
   * Move backward by one step.
   */
  prev(): void {
    if (this.loop && this.index <= 0) {
      this.index = this.maxIndex;
      return;
    }
    this.index = Math.max(
      this.index - 1,
      0
    );
  }

  /**
   * Jump to specific index.
   *
   * Used by pagination dots.
   */
  goTo(i: number): void {
    this.index = Math.max(
      0,
      Math.min(i, this.maxIndex)
    );
  }

  /**
   * Ensures index never exceeds bounds
   * when inputs change.
   */
  ngOnChanges(
    changes: SimpleChanges
  ): void {

    this.index = Math.min(
      this.index,
      this.maxIndex
    );
  }

  /**
   * Re-validates index on window resize.
   *
   * Necessary when `visible`
   * changes responsively.
   */
  @HostListener('window:resize')
  onResize(): void {

    this.index = Math.min(
      this.index,
      this.maxIndex
    );
  }
}
