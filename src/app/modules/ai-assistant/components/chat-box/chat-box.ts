import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DisplayMessage {
   id: number;
   role: 'MEDECIN' | 'MEDAGENT';
   text: string;
   isStreaming: boolean;
   isTranscription: boolean;
   timestamp: Date;
}

@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-box.html',
  styleUrls: ['./chat-box.scss']
})
export class ChatBoxComponent implements AfterViewChecked {
  @Input() messages: DisplayMessage[] = [];
  @Input() isRecording = false;
  @Input() connectionError = false;
  
  @Output() sendMessage = new EventEmitter<string>();
  
  inputText = '';
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
    } catch(err) {}
  }

  onSubmit() {
    if (this.inputText.trim()) {
        this.sendMessage.emit(this.inputText);
        this.inputText = '';
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.onSubmit();
    }
  }
}
