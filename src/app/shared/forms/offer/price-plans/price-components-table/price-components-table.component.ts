import { Component, EventEmitter, Input, Output } from '@angular/core';
import {NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";

@Component({
  selector: 'app-price-components-table',
  standalone: true,
  templateUrl: './price-components-table.component.html',
  imports: [
    NgIf,
    TranslateModule
  ],
  styleUrl: './price-components-table.component.css'
})
export class PriceComponentsTableComponent {
  @Input() priceComponents: any[] = []; // Lista de price components
  @Output() edit = new EventEmitter<any>(); // Emitir evento al editar
  @Output() delete = new EventEmitter<string>(); // Emitir evento al eliminar

  showDeleteModal = false;
  componentToDelete: any | null = null;

  editPriceComponent(component: any) {
    this.edit.emit(component); // Emitir evento con el componente a editar
  }

  confirmDelete(component: any) {
    this.componentToDelete = component;
    this.showDeleteModal = true;
  }

  deletePriceComponent() {
    if (this.componentToDelete) {
      console.log('delete')
      this.delete.emit(this.componentToDelete.id);
      this.showDeleteModal = false;
      this.componentToDelete = null;
    }
  }

  getPriceTypeLabel(priceType: string): string {
    const labels: { [key: string]: string } = {
      'one time': 'One time',
      'recurring': 'Recurring',
      'recurring-prepaid': 'Recurring Prepaid',
      'usage': 'Usage'
    };
    return labels[priceType] || 'Unknown';
  }
}
