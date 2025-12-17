import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import {components} from "src/app/models/product-catalog";
type Catalog = components["schemas"]["Catalog"];
import { environment } from 'src/environments/environment';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';
import {EventMessageService} from "../../services/event-message.service";
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  show_categories:boolean = true;
  show_create_categories:boolean = false;
  show_update_categories:boolean = false;
  show_verification:boolean = false;
  show_revenue:boolean = false;
  private destroy$ = new Subject<void>();

  category_to_update:any;
  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'AdminCategories' && ev.value == true) {        
        this.goToCategories();
      }
      if(ev.type === 'CreateCategory' && ev.value == true) {        
        this.goToCreateCategories();
      }
      if(ev.type === 'UpdateCategory') {       
        this.category_to_update=ev.value; 
        this.goToUpdateCategories();
      }
    })
  }

  ngOnInit() {
    console.log('init')
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCategories(){
    this.selectCategories();
    this.show_categories = true;
    this.show_create_categories = false;
    this.show_update_categories = false;
    this.show_verification = false;
    this.show_revenue = false;
    this.cdr.detectChanges();
  }

  goToCreateCategories(){
    this.show_categories = false;
    this.show_create_categories = true;
    this.show_update_categories = false;
    this.show_verification = false;
    this.show_revenue = false;
    this.cdr.detectChanges();
  }

  goToUpdateCategories(){
    this.show_categories = false;
    this.show_create_categories = false;
    this.show_update_categories = true;
    this.show_verification = false;
    this.show_revenue = false;
    this.cdr.detectChanges();
  }

  goToVerification() {
    this.selectVerification()
    this.show_categories = false;
    this.show_create_categories = false;
    this.show_update_categories = false;
    this.show_verification = true;
    this.show_revenue = false;
    this.cdr.detectChanges();
  }

  goToRevenue() {
    this.selectRevenue()
    this.show_categories = false;
    this.show_create_categories = false;
    this.show_update_categories = false;
    this.show_verification = false;
    this.show_revenue = true;
    this.cdr.detectChanges();
  }

  selectCategories(){
    let categories_button = document.getElementById('categories-button')
    let verify_button = document.getElementById('verify-button')
    let revenue_button = document.getElementById('revenue-button')

    this.selectMenu(categories_button,'text-white bg-primary-100');
    this.unselectMenu(verify_button,'text-white bg-primary-100');
    this.unselectMenu(revenue_button,'text-white bg-primary-100');
  }

  selectVerification(){
    let categories_button = document.getElementById('categories-button')
    let verify_button = document.getElementById('verify-button')
    let revenue_button = document.getElementById('revenue-button')

    this.selectMenu(verify_button,'text-white bg-primary-100');
    this.unselectMenu(categories_button,'text-white bg-primary-100');
    this.unselectMenu(revenue_button,'text-white bg-primary-100');
  }

  selectRevenue(){
    let categories_button = document.getElementById('categories-button')
    let verify_button = document.getElementById('verify-button')
    let revenue_button = document.getElementById('revenue-button')

    this.unselectMenu(verify_button,'text-white bg-primary-100');
    this.unselectMenu(categories_button,'text-white bg-primary-100');
    this.selectMenu(revenue_button,'text-white bg-primary-100')
  }

  removeClass(elem: HTMLElement, cls:string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls:string) {
      elem.className += (" " + cls);
  }

  unselectMenu(elem:HTMLElement | null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        this.removeClass(elem,cls)
      } else {
        console.log('already unselected')
      }
    }
  }

  selectMenu(elem:HTMLElement| null,cls:string){
    if(elem != null){
      if(elem.className.match(cls)){
        console.log('already selected')
      } else {
        this.addClass(elem,cls)
      }
    }
  }
}
