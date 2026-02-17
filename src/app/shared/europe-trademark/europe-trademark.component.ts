import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-europe-trademark',
  template: `
    <div class="border-t border-gray-200 dark:border-gray-600 w-full">
      <div class="flex flex-row items-center justify-items-center pt-4">
        <img
          class="h-12 w-auto ml-4"
          src="assets/logos/euflag.png"
          alt="EU flag image"
        />
        <p class="ml-4 text-base font-normal text-gray-500 dark:text-gray-400">
          {{ 'europeTrademark' | translate }}
        </p>
      </div>
    </div>
  `,
  standalone: true,
  imports: [TranslateModule],
})
export class EuropeTrademarkComponent {
  constructor() {}
}
