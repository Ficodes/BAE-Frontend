import { Component, Input, ChangeDetectorRef } from '@angular/core';
import {Category} from "../../models/interfaces";
import {EventMessageService} from "src/app/services/event-message.service";
import {DatePipe, NgClass} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";

@Component({
  selector: 'categories-recursion',
  templateUrl: './categories-recursion.component.html',
  styleUrl: './categories-recursion.component.css'
})
export class CategoriesRecursionComponent {
  @Input() child: Category;
  @Input() parent: Category;
  @Input() selected: Category[];
  @Input() path: string;

  constructor(
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
  ) {

  }

  isCategorySelected(cat:any){
    if(this.selected!=undefined){
      const index = this.selected.findIndex(item => item.id === cat.id);
      if (index !== -1) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  addCategory(cat:any){
    this.eventMessage.emitCategoryAdded(cat);
  }

}
