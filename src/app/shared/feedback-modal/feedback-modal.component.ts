import { Component, HostListener, Input, OnInit } from '@angular/core';
import {faMessagePen, faHandsHoldingHeart} from "@fortawesome/pro-solid-svg-icons";
import {EventMessageService} from "../../services/event-message.service";
import { FeedbackServiceService } from "src/app/services/feedback-service.service"
import {LocalStorageService} from "../../services/local-storage.service";
import { lastValueFrom } from 'rxjs';
import { FeedbackInfo } from 'src/app/models/interfaces';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'feedback-modal',
  templateUrl: './feedback-modal.component.html',
  styleUrl: './feedback-modal.component.css'
})
export class FeedbackModalComponent implements OnInit {
  constructor(
    private eventMessage: EventMessageService,
    private feedbackService: FeedbackServiceService,
    private localStorage: LocalStorageService,
  ) {  }
  @Input() rateMessage: string
  @Input() writeMessage: string
  @Input() type: string
  protected readonly faMessagePen = faMessagePen;
  protected readonly faHandsHoldingHeart = faHandsHoldingHeart;
  rating: number = 0; // Current rating
  addComment:boolean=false;
  showThanksMessage:boolean=false;
  checkCampaing:boolean=false;
  wantsFeedback: boolean = false;

  @HostListener('document:click')
  onClick() {
    this.eventMessage.emitCloseFeedback(true);
  }

  ngOnInit(): void {
    if(this.type=='campaign'){
      this.checkCampaing=true;      
    }else{
      this.checkCampaing=false;
    }
  }

  updateFeedback(){
    this.checkCampaing=false;
    if (!this.wantsFeedback) {
      this.eventMessage.emitCloseFeedback(true);
    }

    let feedbackInfo = this.localStorage.getObject('feedback') as FeedbackInfo;

    let wantsFeedback = {
      "approval": this.wantsFeedback,
      "expire": feedbackInfo?.expire,
    }
    this.localStorage.setObject('feedback',wantsFeedback)
  }

  setRating(star: number) {
    this.rating = star;
  }

  async next(){
    if(this.addComment==false){
      this.addComment=true;
    } else {
      let body:any = {
        "rating": this.rating,
        "type": this.type
      }
      if (document.getElementById("message") != null){
        body["description"] = (document.getElementById("message") as HTMLTextAreaElement)?.value
      }

      await lastValueFrom(this.feedbackService.sendFeedback(body))
      this.showThanksMessage=true;
      await lastValueFrom(this.feedbackService.sendFeedback(body))
      this.showThanksMessage=true;
    }
    
  }

  hide(){
    let feedbackInfo = this.localStorage.getObject('feedback') as FeedbackInfo;
    let expiration = feedbackInfo?.expire ?? environment?.feedbackCampaignExpiration ?? 0;
    let wantsFeedback : FeedbackInfo = {
      "expire": expiration,
      "approval": false
    }
    this.localStorage.setObject('feedback',wantsFeedback)
    this.eventMessage.emitCloseFeedback(true);
  }

}