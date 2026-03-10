import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { EventMessageService } from 'src/app/services/event-message.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'email',
  templateUrl: './email.component.html',
  styleUrl: './email.component.css'
})
export class EmailComponent {

  showError: boolean = false;
  errorMessage: string = '';

  emailForm = new FormGroup({
    smtpServer: new FormControl('', [Validators.required]),
    smtpPort: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required]),
    emailUser: new FormControl('', [Validators.required]),
    emailPassword: new FormControl('', [Validators.required])
  });

  constructor(
    private eventMessage: EventMessageService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.getConfig();
  }

  goBack() {
    this.eventMessage.emitAdminCategories(true);
  }

  fillData(data: any) {
    this.emailForm.setValue({
      smtpServer: data.smtpServer,
      smtpPort: data.smtpPort,
      email: data.email,
      emailUser: data.emailUser,
      emailPassword: ''
    });
  }

  getConfig() {
    const url = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
    return this.http.get<any>(url).subscribe({
      next: data => {
        this.fillData(data);
      },
      error: error => {
        console.error('There was an error while getting config!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while getting the config';
        }
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }

  addConfig() {
    // Get the product specification
    const url = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
    const body = {
      "smtpServer": this.emailForm.value.smtpServer,
      "smtpPort": this.emailForm.value.smtpPort,
      "email": this.emailForm.value.email,
      "emailUser": this.emailForm.value.emailUser,
      "emailPassword": this.emailForm.value.emailPassword
    }

    return this.http.post<any>(url, body).subscribe({
      next: data => {
        this.fillData(data);
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while updating the config';
        }
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }
}
