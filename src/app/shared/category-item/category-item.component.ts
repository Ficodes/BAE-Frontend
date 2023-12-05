import {Component, Input, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {faCircleCheck} from "@fortawesome/pro-solid-svg-icons";
import {faCircle} from "@fortawesome/pro-regular-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'bae-category-item',
  standalone: true,
  imports: [CommonModule, FaIconComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './category-item.component.html',
  styleUrl: './category-item.component.css'
})
export class CategoryItemComponent implements OnInit {

  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faCircle = faCircle;
  checked: boolean = false;
  option: String | undefined;
  @Input() data: {
    "id"?: String,
    "href"?: String,
    "description"?: String,
    "isRoot"?: Boolean,
    "lastUpdate"?: String,
    "lifecycleStatus"?: String,
    "name": String,
    "version"?: String,
    "validFor"?: Object
  } | undefined = {name: 'undefined'};

  ngOnInit() {
    this.option = this.data?.id;
  }
}
