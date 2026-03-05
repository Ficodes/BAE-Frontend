import {AfterViewInit, ChangeDetectorRef, Component, forwardRef, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {DatePipe, NgClass, NgIf, NgTemplateOutlet} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {environment} from "../../../../../environments/environment";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {PaginationService} from "../../../../services/pagination.service";
import {AccountServiceService} from "../../../../services/account-service.service";
import {AppModule} from "../../../../app.module";
import {initFlowbite} from "flowbite";
import {FormChangeState} from "../../../../models/interfaces";
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-related-party-id',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf,
    NgTemplateOutlet,
    NgClass,
    FormsModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RelatedPartyIdComponent),
      multi: true
    }
  ],
  templateUrl: './related-party-id.component.html',
  styleUrl: './related-party-id.component.css'
})
export class RelatedPartyIdComponent implements OnInit {
  constructor(
    private accService: AccountServiceService,
    private cdr: ChangeDetectorRef,
  ) {
  }
  @Input() partyId: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  //CATEGORIES
  loading:boolean=false;
  parties:any[]=[];
  selectedParty:any = null;
  searchTerm: string = '';
  incomingValue: any = null;

  get filteredParties() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.parties;

    return this.parties.filter(p =>
      p.tradingName?.toLowerCase().includes(term)
    );
  }

  async ngOnInit() {
    this.loading = true;
    try {
      // 1. Load default list (can be paginated/truncated by API defaults)
      this.parties = await this.accService.getOrgList();
      console.log("Parties loaded:", this.parties);

      // 2. Determine requested party id from incoming value or input
      const requestedPartyId = this.incomingValue?.id ?? this.partyId;

      if (requestedPartyId) {
        // 3. Try selecting from current page
        this.selectedParty = this.parties.find(p => p.id === requestedPartyId) ?? null;

        // 4. Fallback: if not in list, fetch by id and inject into the options
        if (!this.selectedParty) {
          try {
            const requestedParty = await this.accService.getOrgInfo(requestedPartyId);
            if (requestedParty?.id) {
              this.parties = [requestedParty, ...this.parties.filter(p => p.id !== requestedParty.id)];
              this.selectedParty = requestedParty;
            }
          } catch (error) {
            console.error('Unable to load requested party by id:', requestedPartyId, error);
          }
        }
      } else if (this.incomingValue?.id) {
        this.selectedParty = this.incomingValue;
      }

      // 5. Emit to parent form (full object)
      this.onChange(this.selectedParty ?? null);
      this.onTouched();

      this.cdr.detectChanges();
      console.log("Selected party after init:", this.selectedParty);
    } finally {
      this.loading = false;
    }
  }
  
  
  isSelected(partyId: string): boolean {
    return this.selectedParty?.id === partyId;
  }  

  toggleSelection(party: any): void {
    this.selectedParty = party;
    this.onChange(party);
    this.onTouched();
  }  

  getRowClass(partyId: string): string {
    return partyId === this.selectedParty?.id
      ? "bg-white dark:bg-secondary-100"
      : "bg-white dark:bg-secondary-300";
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    console.log("writeValue called with:", value);
    this.incomingValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
