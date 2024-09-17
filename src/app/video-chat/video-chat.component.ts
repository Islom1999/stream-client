import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as io from 'socket.io-client';

@Component({
  selector: 'app-video-chat',
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.scss']
})
export class VideoChatComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private socket: any;
  private localStream: MediaStream | undefined;
  private peerConnection: RTCPeerConnection | undefined;
  private didIOffer = false;

  public userName = `Rob-${Math.floor(Math.random() * 100000)}`;
  private peerConfiguration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ]
      }
    ]
  };

  ngOnInit() {
    this.socket = io.connect('https://localhost:8181/', {
      auth: {
        userName: this.userName,
        password: 'x'
      }
    });

    this.socket.on('availableOffers', (offers: any[]) => {
      this.createOfferEls(offers);
    });

    this.socket.on('newOfferAwaiting', (offers: any[]) => {
      this.createOfferEls(offers);
    });

    this.socket.on('answerResponse', (offerObj: any) => {
      this.addAnswer(offerObj);
    });

    this.socket.on('receivedIceCandidateFromServer', (iceCandidate: any) => {
      this.addNewIceCandidate(iceCandidate);
    });

    document.getElementById('call')?.addEventListener('click', this.call.bind(this));
  }

  private async call() {
    await this.fetchUserMedia();
    await this.createPeerConnection();

    try {
      console.log("Creating offer...");
      const offer = await this.peerConnection?.createOffer();
      if (offer) {
        console.log(offer);
        await this.peerConnection?.setLocalDescription(offer);
        this.didIOffer = true;
        this.socket.emit('newOffer', offer);
      }
    } catch (err) {
      console.log(err);
    }
  }

  private async answerOffer(offerObj: any) {
    await this.fetchUserMedia();
    await this.createPeerConnection(offerObj);

    const answer = await this.peerConnection?.createAnswer({});
    if (answer) {
      await this.peerConnection?.setLocalDescription(answer);
      offerObj.answer = answer;
      const offerIceCandidates = await this.socket.emitWithAck('newAnswer', offerObj);
      offerIceCandidates.forEach((c: any) => {
        this.peerConnection?.addIceCandidate(c);
      });
    }
  }

  private async addAnswer(offerObj: any) {
    await this.peerConnection?.setRemoteDescription(offerObj.answer);
  }

  private fetchUserMedia(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (this.localVideo.nativeElement) {
          this.localVideo.nativeElement.srcObject = stream;
        }
        this.localStream = stream;
        resolve();
      } catch (err) {
        console.log(err);
        reject();
      }
    });
  }

  private createPeerConnection(offerObj?: any): Promise<void> {
    return new Promise(async (resolve) => {
      this.peerConnection = new RTCPeerConnection(this.peerConfiguration);
      const remoteStream = new MediaStream();
      if (this.remoteVideo.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = remoteStream;
      }

      this.localStream?.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream as MediaStream);
      });

      this.peerConnection?.addEventListener('signalingstatechange', (event) => {
        console.log(event);
        console.log(this.peerConnection?.signalingState);
      });

      this.peerConnection?.addEventListener('icecandidate', (e: any) => {
        if (e.candidate) {
          this.socket.emit('sendIceCandidateToSignalingServer', {
            iceCandidate: e.candidate,
            iceUserName: this.userName,
            didIOffer: this.didIOffer,
          });
        }
      });

      // this.peerConnection?.addEventListener('track', (e: any) => {
      //   e.streams[0].getTracks().forEach((track: any) => {
      //     remoteStream.addTrack(track, remoteStream);
      //   });
      // });

      this.peerConnection?.addEventListener('track', (e: any) => {
          e.streams[0].getTracks().forEach((track: any) => {
              remoteStream.addTrack(track); // To'g'ri: Faqat bir argument uzatiladi
          });
      });
    
    

      if (offerObj) {
        await this.peerConnection?.setRemoteDescription(offerObj.offer);
      }
      resolve();
    });
  }

  private addNewIceCandidate(iceCandidate: any) {
    this.peerConnection?.addIceCandidate(iceCandidate);
  }

  private createOfferEls(offers: any[]) {
    const answerEl = document.querySelector('#answer');
    offers.forEach(o => {
      const newOfferEl = document.createElement('div');
      newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`;
      newOfferEl.addEventListener('click', () => this.answerOffer(o));
      if (answerEl) {
        answerEl.appendChild(newOfferEl);
      }
    });
  }
}
