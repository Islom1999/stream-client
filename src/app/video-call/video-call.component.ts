import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebrtcService } from '../webrtc.service';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit, OnDestroy {
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;

  constructor(private webRTCService: WebrtcService) {}

  async ngOnInit(): Promise<void> {
    await this.startMediaStream();
  }

  async ngOnDestroy(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
    }
  }

  async startMediaStream(): Promise<void> {
    try {
      this.localStream = await this.webRTCService.getMediaStream();

      const localVideoElement = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideoElement) {
        localVideoElement.srcObject = this.localStream;
        localVideoElement.play();
      }
    } catch (error) {
      console.error('Failed to get local media stream:', error);
    }
  }

  async callUser(userId: string): Promise<void> {
    try {
      if (this.localStream) {
        await this.webRTCService.callUser(userId);
      } else {
        console.error('Local stream is not available');
      }
    } catch (error) {
      console.error('Failed to call user:', error);
    }
  }

  async answerCall(signal: any): Promise<void> {
    try {
      if (this.localStream) {
        await this.webRTCService.answerCall(signal, this.localStream);
      } else {
        console.error('Local stream is not available');
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  }
}
