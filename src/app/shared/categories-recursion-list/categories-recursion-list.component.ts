import { Component, Input, ChangeDetectorRef } from '@angular/core';
import {Category} from "../../models/interfaces";
import {EventMessageService} from "src/app/services/event-message.service";

@Component({
  selector: 'categories-recursion-list',
  templateUrl: './categories-recursion-list.component.html',
  styleUrl: './categories-recursion-list.component.css'
})
export class CategoriesRecursionListComponent {
  @Input() child: Category;
  @Input() parent: Category;
  @Input() path: string;

  constructor(
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
  ) {
    
  }

  addCategory(cat:any){
    this.eventMessage.emitCategoryAdded(cat);
  }

  goToUpdate(cat:any){
    this.eventMessage.emitUpdateCategory(cat);
  }

}