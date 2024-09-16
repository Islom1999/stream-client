import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class WebrtcService {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;

  constructor() {
    this.socket = io('http://localhost:3000');

    this.socket.on('call-made', (data: any) => this.handleCallMade(data));
    this.socket.on('call-answered', (data: any) => this.handleCallAnswered(data));
    this.socket.on('ice-candidate', (data: any) => this.handleIceCandidate(data));
  }

  async getMediaStream(): Promise<MediaStream> {
    try {
      // O'zgarishlarni kiritamiz va to'g'ri tur qaytaramiz
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return this.localStream; // Qaytarish kerak
    } catch (error) {
      console.error('Failed to get local media stream:', error);
      throw error; // Agar xatolik bo'lsa, uni uzatamiz
    }
  }
  async answerCall(signal: any, localStream: MediaStream): Promise<void> {
    // Initialize and handle WebRTC peer connection for answering a call
    // Placeholder: Replace with actual WebRTC code
  }

  async initializeMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
      console.error('Failed to get local media stream', error);
    }
  }

  async callUser(userId: string) {
    if (!this.localStream) {
      await this.initializeMedia();
    }

    if (this.localStream) { // Check if localStream is not null
      const peerConnection = this.createPeerConnection(userId);
      this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream!));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      this.socket.emit('call-user', { to: userId, signal: peerConnection.localDescription });
    }
  }

  private createPeerConnection(userId: string): RTCPeerConnection {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', { to: userId, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = event => {
      const remoteVideo = document.createElement('video');
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.autoplay = true;
      document.body.appendChild(remoteVideo);
    };

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  private handleCallMade(data: any) {
    const peerConnection = this.createPeerConnection(data.from);
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    peerConnection.createAnswer().then(answer => peerConnection.setLocalDescription(answer)).then(() => {
      this.socket.emit('make-answer', { to: data.from, signal: peerConnection.localDescription });
    });
  }

  private handleCallAnswered(data: any) {
    const peerConnection = this.peerConnections.get(data.from);
    if (peerConnection) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    }
  }

  private handleIceCandidate(data: any) {
    const peerConnection = this.peerConnections.get(data.from);
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }
}
