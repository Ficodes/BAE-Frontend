import {Component, OnInit} from '@angular/core';
import { NgClass } from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {LocalStorageService} from "../../services/local-storage.service";
import {Category} from "../../models/interfaces";
import {EventMessageService} from "../../services/event-message.service";
import {faAddressCard} from "@fortawesome/sharp-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faFilterList} from "@fortawesome/pro-regular-svg-icons";
import {faTag} from "@fortawesome/pro-solid-svg-icons";

@Component({
  selector: 'bae-categories-panel',
  standalone: true,
  imports: [
    TranslateModule,
    FaIconComponent,
    NgClass
  ],
  templateUrl: './categories-panel.component.html',
  styleUrl: './categories-panel.component.css'
})
export class CategoriesPanelComponent implements OnInit {
  selected: Category[] = [];

  constructor(private localStorage: LocalStorageService, private eventMessage: EventMessageService) {
    this.selected = [];
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'AddedFilter') {
        const cat = ev.value as Category; 
        const index = this.selected.findIndex(item => item.id === cat.id);
        if(index == -1) {
          this.selected.push(ev.value as Category)
        }
      } else if(ev.type === 'RemovedFilter') {
        const cat = ev.value as Category; 
        const index = this.selected.findIndex(item => item.id === cat.id);
        if(index > -1) {
          this.selected.splice(index,1);
        }
      }
    })
  }
  ngOnInit(): void {
    const stored:any = this.localStorage.getObject('selected_categories')
    this.selected = Array.isArray(stored) ? stored as Category[] : []
  }

  notifyDismiss(cat: Category) {
    console.log('Category dismissed: '+ JSON.stringify(cat));
    this.localStorage.removeCategoryFilter(cat);
    this.eventMessage.emitRemovedFilter(cat);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

  protected readonly faAddressCard = faAddressCard;
  protected readonly faFilterList = faFilterList;
  protected readonly faTag = faTag;
}
