import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-explore-dome',
  templateUrl: './explore-dome.component.html',
  styleUrl: './explore-dome.component.css'
})
export class ExploreDomeComponent {
  domeAbout: string = environment.DOME_ABOUT_LINK

}
