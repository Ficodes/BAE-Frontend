import { Component } from '@angular/core';

@Component({
  selector: 'app-europe-trademark',
  template: `
    <div class="w-full">
  <div class="mx-auto max-w-[1180px] px-6 py-3 flex items-center gap-3">

    <img
      src="assets/logos/euflag.png"
      alt="EU flag"
      class="h-[18px] w-auto"
    />

    <p class="text-[14px] text-gray-500 dark:text-gray-400 leading-none">
      {{ 'europeTrademark' | translate }}
    </p>

  </div>
</div>
  `,
})
export class EuropeTrademarkComponent {
  constructor() { }
}
