import { Component, Input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/pro-solid-svg-icons';

/**
 * Generic carousel component.
 *
 * This component provides the structural and behavioral logic for a horizontal carousel.
 * It does NOT define the content of the slides. Instead, the slide content is provided
 * by the parent component using Angular content projection (`ng-content`).
 *
 * The carousel works by:
 * 1. Rendering a horizontal flex container (the "track").
 * 2. Moving the track using `translateX` when the index changes.
 * 3. Showing a fixed number of visible items (`visible`).
 * 4. Allowing navigation through arrows or dots.
 *
 * The parent component is responsible for:
 * - Passing the `items` array (used only to calculate the carousel bounds).
 * - Rendering each slide via `@for` inside the `<app-carousel>` tag.
 * - Setting the width of each slide (usually `100 / visible`).
 *
 * Example usage:
 *
 * <app-carousel [items]="products" [visible]="3">
 *
 *   @for (product of products; track product.id) {
 *     <div class="shrink-0 px-4" [style.width.%]="100 / 3">
 *       <!-- custom slide content -->
 *     </div>
 *   }
 *
 * </app-carousel>
 *
 * Important:
 * The carousel itself does not know anything about the structure of the items.
 * It only controls scrolling and pagination.
 */

@Component({
  selector: 'app-carousel',
  standalone: true,
  templateUrl: './carousel.component.html',
  imports: [FontAwesomeModule]
})
export class CarouselComponent<T> {
  /**
   * Array of items rendered inside the carousel.
   *
   * The carousel does not directly render these items.
   * The array is used only to calculate:
   * - how many slides exist
   * - the maximum scroll index
   * - the number of pagination dots
   */
  @Input({ required: true }) items!: T[];

  /**
   * Number of elements visible at the same time.
   *
   * Example:
   * visible = 3 → three cards visible in the viewport
   */
  @Input({ required: true }) visible: number;

  /**
   * Current scroll index.
   *
   * This represents the first visible element in the viewport.
   * Example:
   * index = 0 → show items 0,1,2
   * index = 1 → show items 1,2,3
   */
  index = 0;

  faChevronRight = faChevronRight;
  faChevronLeft = faChevronLeft

  /**
   * Maximum scroll position.
   *
   * Example:
   * items = 10
   * visible = 3
   *
   * maxIndex = 7
   *
   * This prevents the carousel from scrolling past the last element.
   */
  get maxIndex(): number {
    return Math.max(0, this.items.length - this.visible);
  }

  /**
   * Number of pagination dots.
   *
   * Each dot represents a possible starting position.
   */
  get pages(): number {
    return this.maxIndex + 1;
  }

  /**
   * CSS transform applied to the carousel track.
   *
   * The track is moved horizontally using translateX.
   * The movement step corresponds to the width of a single item.
   */
  get trackTransform(): string {
    return `translateX(-${this.index * (100 / this.visible)}%)`;
  }

  /**
   * Move carousel forward by one element.
   */
  next() {
    this.index = Math.min(this.index + 1, this.maxIndex);
  }

  /**
   * Move carousel backward by one element.
   */
  prev() {
    this.index = Math.max(this.index - 1, 0);
  }

  /**
   * Jump directly to a specific index.
   * Used by pagination dots.
   */
  goTo(i: number) {
    this.index = Math.max(0, Math.min(i, this.maxIndex));
  }

}
