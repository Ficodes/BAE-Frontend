import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { MarkdownComponent } from "ngx-markdown";

@Component({
  selector: 'app-blog-entry-detail',
  standalone: true,
  imports: [CommonModule, MarkdownComponent],
  templateUrl: './blog-entry-detail.component.html',
  styleUrl: './blog-entry-detail.component.css'
})
export class BlogEntryDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private domeBlogService: DomeBlogServiceService
  ) {
  }
  entry:any={};
  blogId:any='';

  async ngOnInit(): Promise<void> {
    this.blogId = this.route.snapshot.paramMap.get('id')!;
    this.entry=await this.domeBlogService.getBlogEntryById(this.blogId);
  }

  goBack(){
    this.router.navigate(['/blog']);
  }
}
