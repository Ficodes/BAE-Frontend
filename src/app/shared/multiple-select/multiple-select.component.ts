import { Component, EventEmitter, Input, Output } from '@angular/core';
import {NgClass, NgIf, NgFor} from "@angular/common";
import { HostListener } from '@angular/core';

@Component({
  selector: 'multiple-select',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    NgFor
  ],
  templateUrl: './multiple-select.component.html',
  styleUrl: './multiple-select.component.css'
})
export class MultipleSelectComponent {
  isOpen = false;
  @Input() options: any[] | [];
  selectedItems: string[] = [];
  @Output() selectedItemsChange = new EventEmitter<string[]>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isOpen = false;
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  toggleSelection(option: string) {
    if (this.selectedItems.includes(option)) {
      this.selectedItems = this.selectedItems.filter(item => item !== option);
    } else {
      this.selectedItems.push(option);
    }
    this.selectedItemsChange.emit(this.selectedItems); 
    console.log('toggling select multiple')
    console.log('selected...')
    console.log(this.selectedItems)
  }

  removeItem(option: string, event: MouseEvent) {
    event.stopPropagation(); // Prevent dropdown toggle
    this.selectedItems = this.selectedItems.filter(item => item !== option);
    this.selectedItemsChange.emit(this.selectedItems); 
  }
}
