import { Component, EventEmitter, Output, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-voice-dictation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-dictation.html',
  styleUrls: ['./voice-dictation.scss']
})
export class VoiceDictationComponent implements OnDestroy {
  @Output() audioRecorded = new EventEmitter<Blob>();
  @Output() recordingStatus = new EventEmitter<boolean>();
  
  isRecording = false;
  
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  @ViewChild('visualizer', { static: false }) visualizerEl!: ElementRef<HTMLCanvasElement>;
  private audioCtx?: AudioContext;
  private analyser?: AnalyserNode;
  private animationFrameId?: number;

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                        ? 'audio/webm;codecs=opus' 
                        : 'audio/webm';
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            this.audioRecorded.emit(audioBlob);
            this.stopVisualizer();
            stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        };

        this.setupVisualizer(stream);
        this.mediaRecorder.start(1000); // Collect chunks every second
        this.isRecording = true;
        this.recordingStatus.emit(true);
    } catch (err) {
        console.error('❌ Erreur microphone', err);
        alert("Impossible d'accéder au microphone.");
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.recordingStatus.emit(false);
    }
  }

  private setupVisualizer(stream: MediaStream) {
    if (!this.visualizerEl) return;
    const canvas = this.visualizerEl.nativeElement;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    this.audioCtx = new AudioContext();
    const source = this.audioCtx.createMediaStreamSource(stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      this.animationFrameId = requestAnimationFrame(draw);
      this.analyser!.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        canvasCtx.fillStyle = '#00B4D8';
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }

  private stopVisualizer() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.audioCtx?.state !== 'closed') this.audioCtx?.close();
    
    if (this.visualizerEl) {
        const c = this.visualizerEl.nativeElement.getContext('2d');
        if(c) c.clearRect(0, 0, this.visualizerEl.nativeElement.width, this.visualizerEl.nativeElement.height);
    }
  }

  ngOnDestroy() {
      this.stopRecording();
      this.stopVisualizer();
  }
}
