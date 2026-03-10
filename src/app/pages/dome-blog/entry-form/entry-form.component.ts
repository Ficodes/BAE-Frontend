import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {MarkdownTextareaComponent} from "src/app/shared/forms/markdown-textarea/markdown-textarea.component";
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import {LocalStorageService} from "src/app/services/local-storage.service";
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [MarkdownTextareaComponent, ReactiveFormsModule],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.css'
})
export class EntryFormComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService
  ) {
  }

  entryForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    content: new FormControl('', [Validators.required]),
  });

  loading:boolean=false;
  partyId:any='';
  showError:boolean=false;
  errorMessage:any='';
  name:any='';
  blogId:any=undefined;

  async ngOnInit(): Promise<void> {
    this.blogId = this.route.snapshot.paramMap.get('id')!;
    if(this.blogId){
      let blogInfo = await this.domeBlogService.getBlogEntryById(this.blogId);
      this.entryForm.controls['title'].setValue(blogInfo.title);
      this.entryForm.controls['content'].setValue(blogInfo.content);
    }
    this.initPartyInfo();
  }

  goBack(){
    this.router.navigate(['/blog']);
  }

  async create(){
    let body={
      title: this.entryForm.value.title,
      partyId: this.partyId,
      author: this.name,
      content: this.entryForm.value.content,
    }
    //await lastValueFrom(this.domeBlogService.createBlogEntry(body))
    this.domeBlogService.createBlogEntry(body).subscribe({
      next: data => {
        this.loading=false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage='Error: '+error.error.error;
        } else {
          this.errorMessage='There was an error while creating the entry!';
        }
        this.loading=false;
        this.showError=true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    });
  }

  async update(){
    let body={
      title: this.entryForm.value.title,
      content: this.entryForm.value.content
    }
    //await lastValueFrom(this.domeBlogService.createBlogEntry(body))
    try {
      await this.domeBlogService.updateBlogEntry(body,this.blogId)
      this.loading=false;
      this.goBack();
    } catch (error) {
      this.errorMessage='There was an error while updating the entry!'
      this.showError=true;
      setTimeout(() => {
        this.showError = false;
      }, 3000);
    }
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        this.name = aux.user;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        this.name = loggedOrg.name;
      }
    }
  }


}
