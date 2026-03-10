import {Component, forwardRef, Input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {SharedModule} from "../../shared.module";

@Component({
  selector: 'app-status-selector',
  standalone: true,
  imports: [
    SharedModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StatusSelectorComponent),
      multi: true
    }
  ],
  templateUrl: './status-selector.component.html',
  styleUrl: './status-selector.component.css'
})
export class StatusSelectorComponent implements ControlValueAccessor {
  @Input() statuses: string[] = ['Active', 'Launched', 'Retired', 'Obsolete'];  // Estados disponibles
  selectedStatus: string = '';

  onChange = (status: string) => {};
  onTouched = () => {};

  writeValue(status: string): void {
    this.selectedStatus = status || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
    this.onChange(status); // Notifica al formulario padre
    this.onTouched();
  }

  getStatusClasses(status: string): string {
    const statusColors: Record<string, string> = {
      "Active": 'text-[#269c43]',
      "Launched": 'text-[#269c43]',
      "Retired": 'text-[#b40404]',
      "Obsolete": 'text-gray-800'
    };

    const baseClasses = "cursor-pointer flex items-center justify-center p-4 rounded-lg space-x-4 transition-all";

    return this.selectedStatus === status
      ? `${baseClasses} bg-[#d2e0f0] dark:bg-primary-100 font-semibold ${statusColors[status] || 'text-gray-500'}`
      : `${baseClasses} text-gray-500 dark:text-gray-200 hover:bg-[#d2e0f0] dark:hover:bg-gray-700`;
  }

  getFillColor(status: string): string {
    const statusColors: Record<string, string> = {
      "Active": "#0f9d58",   // Verde
      "Launched": "#269c43", // Verde oscuro
      "Retired": "#b40404",  // Rojo oscuro
      "Obsolete": "#000000"  // Negro
    };
    return this.selectedStatus === status ? statusColors[status] : "#808080";
  }

}
