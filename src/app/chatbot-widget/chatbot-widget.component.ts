import { ChangeDetectorRef, Component, ElementRef, ViewEncapsulation } from '@angular/core';
import {NgClass} from "@angular/common";
import { LocalStorageService } from '../services/local-storage.service';
import { LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [NgClass],
  templateUrl: './chatbot-widget.component.html',
  styleUrl: './chatbot-widget.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ChatbotWidgetComponent {

  args: any;
  state: Boolean;
  messages: Array<any>;
  chatbox: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
    private localStorage: LocalStorageService
  ){}

  ngOnInit() {
    this.chatbox = this.el.nativeElement.querySelector('.chatbox__support')

    this.state = false;
    this.messages = [];
  }

  onKeyUp(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.onSendButton()
    }
  }

  toggleState() {
    this.state = !this.state;
    this.cdr.detectChanges();
    this.chatbox = this.el.nativeElement.querySelector('.chatbox__support')
    this.updateChatText();
    // show or hides the box
    /*if(this.state) {
      this.chatbox.classList.add('chatbox--active')
    } else {
      this.chatbox.classList.remove('chatbox--active')
    }*/
    
  }

  onSendButton() {
    const textField = this.chatbox.querySelector('input');
    let text1 = textField.value

    if (text1 === "") {
      return;
    }

    // Build the message depending on the user role
    let name = "guest"
    let role = environment.BUYER_ROLE; // FIXME: Default role must be guest when supported

    const userInfo = this.localStorage.getObject('login_items') as LoginInfo;

    // The user is logged in
    if (userInfo.id) {
      let roles = []
      role = environment.BUYER_ROLE;
      name = userInfo.username

      if (userInfo.logged_as !== userInfo.id) {
        let loggedOrg = userInfo.organizations.find((element: { id: any; }) => element.id == userInfo.logged_as)
        roles = loggedOrg.roles.map((elem: any) => {
          return elem.name
        })
      } else {
        roles = userInfo.roles.map((elem: any) => {
          return elem.name
        })
      }

      if (roles.includes(environment.SELLER_ROLE)) {
        role = "Provider"
      }
    }

    let msg1 = { name: name, message: text1, role: role }
    this.messages.push(msg1);

    this.updateChatText()
    textField.value = ''

    fetch(environment.CHAT_API, {
      method: 'POST',
      body: JSON.stringify({ message: text1, role: role }),
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    .then(r => r.json())
    .then(r => {
      let msg2 = { name: "DomeGPT", message: r.answer };
      this.messages.push(msg2);
      this.updateChatText()
    }).catch((error) => {
      console.error('Error:', error);
      this.updateChatText()
    });
  }

  updateChatText() {
    var html = '';
    this.messages.slice().reverse().forEach(function(item, index) {
      if (item.name === "DomeGPT") {
        html += '<div class="messages__item messages__item--visitor">' + item.message + '</div>'
      } else {
        html += '<div class="messages__item messages__item--operator">' + item.message + '</div>'
      }
    });

    const chatmessage = this.chatbox.querySelector('.chatbox__messages');
    chatmessage.innerHTML = html;

    this.cdr.detectChanges();
  }
}
