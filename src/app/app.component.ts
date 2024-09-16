import { Component } from '@angular/core';
import { WebrtcService } from './webrtc.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private webrtcService: WebrtcService) {}

  // async ngOnInit() {
  //   await this.webrtcService.initializeMedia();
  // }

  // callUser(userId: string) {
  //   this.webrtcService.callUser(userId);
  // }
}
