import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CardComponent} from "../../shared/card/card.component";
import {components} from "../../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import { ApiServiceService } from 'src/app/services/product-service.service';
import {faLeaf, faHammer, faCircleNodes, faMagnifyingGlass} from "@fortawesome/pro-solid-svg-icons";
import {faLockOpen, faShieldCheck} from "@fortawesome/pro-regular-svg-icons";

@Component({
  selector: 'app-platform-benefits',
  templateUrl: './platform-benefits.component.html',
  styleUrl: './platform-benefits.component.css'
})
export class PlatformBenefitsComponent {
  protected readonly faLeaf = faLeaf;
  protected readonly faHammer = faHammer;
  protected readonly faCircleNodes = faCircleNodes;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faLockOpen = faLockOpen;
  protected readonly faShieldCheck = faShieldCheck;
}
