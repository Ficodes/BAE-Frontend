import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {EventMessageService} from "../../services/event-message.service";
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {Category} from "../../models/interfaces";
import {LocalStorageService} from "../../services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';

@Component({
  selector: 'bae-off-featured',
  templateUrl: './featured.component.html',
  styleUrl: './featured.component.css'
})
export class FeaturedComponent implements OnInit {
  categories:any[]=[];

  constructor(
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private router: Router,
    private api: ApiServiceService
    ) {
    }

  ngOnInit(): void {
    this.api.getDefaultCategories().then(data => {
      for(let i=0; i < data.length; i++){
        if(data[i].isRoot==true){
          this.categories.push(data[i])
        }
      }
    })
  }

  searchByCategory(cat:Category){
    //MOCKED CATEGORY
    //TO-DO CHANGE THIS TO MATCH ALL THE CATEGORIES ON THE LIST
    /*const cat = {
      "id": "urn:ngsi-ld:category:b6d7450f-3da7-4a90-9655-32e6d342ee4a",
      "href": "urn:ngsi-ld:category:b6d7450f-3da7-4a90-9655-32e6d342ee4a",
      "description": "",
      "isRoot": true,
      "lastUpdate": "2024-11-04T08:26:58.683281084Z",
      "lifecycleStatus": "Launched",
      "name": "Software as a Service (SaaS)",
      "validFor": {
          "startDateTime": "2024-11-04T08:26:53.558Z"
      },
      "children": []
    } as Category;*/
    this.localStorage.addCategoryFilter(cat);
    this.eventMessage.emitAddedFilter(cat);
    this.router.navigate(['/search']);
    
  }
}