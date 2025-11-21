import {AfterViewInit, ChangeDetectorRef, Component, forwardRef, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {DatePipe, NgClass, NgIf, NgTemplateOutlet} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {environment} from "../../../../../environments/environment";
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {PaginationService} from "../../../../services/pagination.service";
import {ApiServiceService} from "../../../../services/product-service.service";
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
  @Input() partyId: any;

  //CATEGORIES
  loading:boolean=false;
  parties:any[]=[
    {
      partyId:"urn:ngsi-ld:individual:999815b1-33dc-4b67-ac9c-90303aca5395",
      username: "admin",
      displayName: "admin",
      email: "admin@test.com"
    },
    {
      partyId:"urn:ngsi-ld:individual:999815b1-33dc-4b67-ac9c-90303aca1111",
      username: "test",
      displayName: "test",
      email: "test@test.com"
    },
    {
      partyId:"urn:ngsi-ld:individual:999815b1-33dc-4b67-ac9c-90303aca2222",
      username: "another test",
      displayName: "another test",
      email: "atest@test.com"
    },
    {
      partyId:"urn:ngsi-ld:individual:999815b1-33dc-4b67-ac9c-90303aca3333",
      username: "lara",
      displayName: "lara",
      email: "lara@test.com"
    },
    {
      partyId:"urn:ngsi-ld:individual:999815b1-33dc-4b67-ac9c-90303aca4444",
      username: "marcos",
      displayName: "marcos",
      email: "marcos@test.com"
    },
    {
      partyId:"urn:ngsi-ld:individual:999815b1-33dc-4b67-ac9c-90303aca5555",
      username: "fran",
      displayName: "fran",
      email: "fran@test.com"
    },
  ];
  selectedParty:any={}
  searchTerm: string = '';

  get filteredParties() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.parties;

    return this.parties.filter(p =>
      p.displayName?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.username?.toLowerCase().includes(term)
    );
  }

  ngOnInit(){
    this.selectedParty=this.parties[0]
  }

  isSelected(partyId: string): boolean {
    return this.selectedParty?.id === partyId;
  }

  toggleSelection(party: any): void {
    
    console.log('🔄 Toggling selection:', party);
    // Si el producto ya está seleccionado, lo deseleccionamos. Si no, lo seleccionamos.
    this.selectedParty = this.selectedParty?.id === party.id ? null : party;
  }

  getRowClass(prodId: string): string {
    return prodId === this.selectedParty?.id
      ? "bg-white dark:bg-secondary-100"
      : "bg-white dark:bg-secondary-300";
  }
}
