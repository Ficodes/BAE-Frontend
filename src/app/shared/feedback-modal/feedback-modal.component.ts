import { Component, HostListener, Input } from '@angular/core';
import {faMessagePen, faHandsHoldingHeart} from "@fortawesome/pro-solid-svg-icons";
import {EventMessageService} from "../../services/event-message.service";
import { FeedbackServiceService } from "src/app/services/feedback-service.service"
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'feedback-modal',
  templateUrl: './feedback-modal.component.html',
  styleUrl: './feedback-modal.component.css'
})
export class FeedbackModalComponent {
  constructor(
    private eventMessage: EventMessageService,
    private feedbackService: FeedbackServiceService
  ) {  }
  @Input() rateMessage: string
  @Input() writeMessage: string
  @Input() type: string
  protected readonly faMessagePen = faMessagePen;
  protected readonly faHandsHoldingHeart = faHandsHoldingHeart;
  rating: number = 0; // Current rating
  addComment:boolean=false;
  showThanksMessage:boolean=false;

  @HostListener('document:click')
  onClick() {
    this.eventMessage.emitCloseFeedback(true);
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
    this.eventMessage.emitCloseFeedback(true);
  }

}