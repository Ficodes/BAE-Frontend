import {
  AfterContentInit,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/pro-solid-svg-icons";
import { VerticalScrollCardsDirective } from './vertical-scroll-cards-directive';

@Component({
  selector: "app-vertical-scroll-cards",
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: "./vertical-scroll-cards.component.html",
  styleUrl: "./vertical-scroll-cards.component.css"
})
export class VerticalScrollCardsComponent implements AfterContentInit, OnDestroy {
  /*
    Main scrollable container.

    All scroll interactions happen here.
  */
  @ViewChild("scrollContainer")
  scrollContainer!: ElementRef<HTMLDivElement>;

  /*
    All projected items marked with
    appVerticalSnapScrollItem.

    Automatically updates when DOM changes.
  */
  @ContentChildren(VerticalScrollCardsDirective)
  itemDirectives!: QueryList<VerticalScrollCardsDirective>;

  /*
    Public configuration inputs.

    These allow reuse of the component
    across different layouts.
  */

  /* Height of scroll viewport */
  @Input() height = 636;

  /* Vertical gap between items */
  @Input() gap = 24;

  /* Left offset of the vertical indicator */
  @Input() indicatorLeft = 14;

  /* Enable fade masks */
  @Input() showFade = true;

  /* Fade mask height */
  @Input() fadeHeight = 32;

  /*
    Emits whenever active item changes.
    Useful for external sync (analytics, UI, etc.)
  */
  @Output() activeIndexChange =
    new EventEmitter<number>();

  /*
    Internal UI state
  */

  activeIndex = 0;

  indicatorTop = 0;
  indicatorHeight = 0;
  indicatorVisible = false;

  stackPaddingTop = 0;
  stackPaddingBottom = 0;

  protected readonly faChevronUp = faChevronUp;
  protected readonly faChevronDown = faChevronDown;

  get canScrollUp(): boolean {
    return this.activeIndex > 0;
  }

  get canScrollDown(): boolean {
    const total = this.itemDirectives?.length ?? 0;
    return this.activeIndex < total - 1;
  }

  scrollPrev(): void {
    if (!this.canScrollUp) return;
    this.scrollToIndex(this.activeIndex - 1, "smooth");
  }

  scrollNext(): void {
    if (!this.canScrollDown) return;
    this.scrollToIndex(this.activeIndex + 1, "smooth");
  }

  /*
    Internal control flags
  */

  private wheelLocked = false;
  private rafId: number | null = null;

  private scrollEndTimer:
    ReturnType<typeof setTimeout> | null = null;

  private initialLayoutTimer:
    ReturnType<typeof setTimeout> | null = null;

  /*
    Runs after projected content becomes available.
  */
  ngAfterContentInit(): void {

    this.runInitialLayout();

    /*
      Re-run layout when projected
      items change dynamically.
    */
    this.itemDirectives.changes.subscribe(() => {
      this.runInitialLayout(this.activeIndex);
    });
  }

  /*
    Cleanup timers and RAF.
  */
  ngOnDestroy(): void {

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.scrollEndTimer) {
      clearTimeout(this.scrollEndTimer);
    }

    if (this.initialLayoutTimer) {
      clearTimeout(this.initialLayoutTimer);
    }
  }

  /*
    Recompute layout on resize.
  */
  @HostListener("window:resize")
  onResize(): void {

    this.runInitialLayout(this.activeIndex);

  }

  /*
    Custom wheel navigation.

    Instead of free scrolling,
    moves one item at a time.
  */
  onWheel(event: WheelEvent): void {

    event.preventDefault();

    if (this.wheelLocked) return;

    const direction = Math.sign(event.deltaY);

    if (direction === 0) return;

    const items = this.getItems();

    const nextIndex =
      direction > 0
        ? Math.min(this.activeIndex + 1, items.length - 1)
        : Math.max(this.activeIndex - 1, 0);

    if (nextIndex === this.activeIndex) return;

    this.wheelLocked = true;

    this.scrollToIndex(nextIndex, "smooth");

    /*
      Prevent rapid wheel stacking.
    */
    setTimeout(() => {

      this.wheelLocked = false;

    }, 420);
  }

  /*
    Scroll event handler.

    Uses requestAnimationFrame
    to avoid layout thrashing.
  */
  onScroll(): void {

    if (this.rafId !== null) {

      cancelAnimationFrame(this.rafId);

    }

    this.rafId = requestAnimationFrame(() => {

      this.syncActiveItemFromScroll();

      this.rafId = null;

    });

    /*
      Detect scroll end
      and snap to nearest item.
    */
    if (this.scrollEndTimer) {

      clearTimeout(this.scrollEndTimer);

    }

    this.scrollEndTimer = setTimeout(() => {

      this.snapToNearestItem();

    }, 90);
  }

  /*
    Initializes scroll positioning
    and indicator alignment.
  */
  private runInitialLayout(index = 0): void {

    this.indicatorVisible = false;

    if (this.initialLayoutTimer) {

      clearTimeout(this.initialLayoutTimer);

    }

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        this.updateStackPadding();

        this.scrollToIndex(index, "auto");

        /*
          Run again after DOM settles.
        */
        this.initialLayoutTimer = setTimeout(() => {

          this.updateStackPadding();

          this.scrollToIndex(index, "auto");

          this.indicatorVisible = true;

        }, 60);

      });

    });
  }

  /*
    Returns all DOM elements
    associated with scroll items.
  */
  private getItems(): HTMLElement[] {

    return this.itemDirectives
      ?.toArray()
      .map(item => item.elementRef.nativeElement) ?? [];

  }

  /*
    Adds dynamic padding so that
    first and last items can be centered.
  */
  private updateStackPadding(): void {

    const container =
      this.scrollContainer?.nativeElement;

    const items = this.getItems();

    if (!container || !items.length) return;

    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    this.stackPaddingTop = Math.max(
      0,
      (container.clientHeight - firstItem.offsetHeight) / 2
    );

    this.stackPaddingBottom = Math.max(
      0,
      (container.clientHeight - lastItem.offsetHeight) / 2
    );
  }

  /*
    Scrolls container so that
    item is vertically centered.
  */
  private scrollToIndex(
    index: number,
    behavior: ScrollBehavior
  ): void {

    const container =
      this.scrollContainer?.nativeElement;

    const items = this.getItems();

    if (!container || !items[index]) return;

    const item = items[index];

    const rawTop =
      item.offsetTop -
      (container.clientHeight / 2 - item.offsetHeight / 2);

    const maxScrollTop =
      Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );

    const targetTop =
      Math.max(0, Math.min(rawTop, maxScrollTop));

    this.setActiveIndex(index);

    container.scrollTo({
      top: targetTop,
      behavior
    });

    this.updateIndicatorFromItem(item, targetTop);
  }

  /*
    Finds closest item
    and snaps to it.
  */
  private snapToNearestItem(): void {

    const container =
      this.scrollContainer?.nativeElement;

    const items = this.getItems();

    if (!container || !items.length) return;

    const viewportCenter =
      container.scrollTop +
      container.clientHeight / 2;

    let bestIndex = 0;
    let bestDistance = Infinity;

    items.forEach((item, index) => {

      const itemCenter =
        item.offsetTop +
        item.offsetHeight / 2;

      const distance =
        Math.abs(itemCenter - viewportCenter);

      if (distance < bestDistance) {

        bestDistance = distance;

        bestIndex = index;

      }

    });

    this.scrollToIndex(bestIndex, "smooth");
  }

  /*
    Updates active index
    during scroll movement.
  */
  private syncActiveItemFromScroll(): void {

    const container =
      this.scrollContainer?.nativeElement;

    const items = this.getItems();

    if (!container || !items.length) return;

    const viewportCenter =
      container.scrollTop +
      container.clientHeight / 2;

    let bestIndex = 0;
    let bestDistance = Infinity;

    items.forEach((item, index) => {

      const itemCenter =
        item.offsetTop +
        item.offsetHeight / 2;

      const distance =
        Math.abs(itemCenter - viewportCenter);

      if (distance < bestDistance) {

        bestDistance = distance;

        bestIndex = index;

      }

    });

    this.setActiveIndex(bestIndex);

    this.updateIndicatorFromItem(
      items[bestIndex],
      container.scrollTop
    );
  }

  /*
    Updates visual indicator position.
  */
  private updateIndicatorFromItem(
    item: HTMLElement,
    scrollTop?: number
  ): void {

    const container =
      this.scrollContainer?.nativeElement;

    if (!container) return;

    const currentScrollTop =
      scrollTop ?? container.scrollTop;

    this.indicatorTop =
      item.offsetTop - currentScrollTop;

    this.indicatorHeight =
      item.offsetHeight;
  }

  /*
    Updates active index
    and emits change.
  */
  private setActiveIndex(index: number): void {

    this.activeIndex = index;

    this.activeIndexChange.emit(index);

  }
}
