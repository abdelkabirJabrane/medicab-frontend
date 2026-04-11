import { Component, ElementRef, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../../core/services/ai.service';
import { DisplayMessage } from '../../../modules/ai-assistant/components/chat-box/chat-box';
import { PatientContext } from '../../../core/models/ai.model';

@Component({
  selector: 'app-floating-ai-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './floating-ai-widget.html',
  styleUrls: ['./floating-ai-widget.scss']
})
export class FloatingAiWidgetComponent implements AfterViewChecked, OnDestroy {
  isOpen = false;
  inputText = '';
  isRecording = false; 
  messages: DisplayMessage[] = [];
  
  private ws: WebSocket | null = null;
  private currentStreamId: number | null = null;
  private widgetContext: PatientContext = {
      nom_patient: 'Consultation Rapide',
      nom_medecin: 'System',
      specialite: 'Général',
      age: '', sexe: '', antecedents: '', allergies: '', medicaments_actuels: '', derniere_visite: ''
  };

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(private aiService: AiService) {
      this.messages.push({
          id: Date.now(),
          role: 'MEDAGENT',
          text: 'Bonjour ! 👋 Je suis l\'assistant IA de MediCab Pro. Avez-vous une question sur une pathologie, un médicament ou cherchez-vous une fonctionnalité ?',
          isStreaming: false,
          isTranscription: false,
          timestamp: new Date()
      });
  }

  toggleOpen() {
      this.isOpen = !this.isOpen;
      if (this.isOpen && !this.ws) {
          this.connectWebSocket();
      }
  }

  close() {
      this.isOpen = false;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
      if (this.ws) this.ws.close();
  }

  private scrollToBottom(): void {
    try {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
    } catch(err) {}
  }

  sendQuickQuestion(q: string) {
      this.inputText = q;
      this.onSubmit();
  }

  onSubmit() {
    if (!this.inputText.trim()) return;
    
    const text = this.inputText;
    this.inputText = '';
    
    this.messages.push({
        id: Date.now(),
        role: 'MEDECIN',
        text: text,
        isStreaming: false,
        isTranscription: false,
        timestamp: new Date()
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
            message: text,
            source: 'chat',
            context: this.widgetContext
        }));
    } else {
        this.aiService.sendChat({
           session_id: 'global-widget-session',
           message: text,
           source: 'chat',
           context: this.widgetContext
        }).subscribe({
           next: (res: any) => {
               this.messages.push({
                    id: Date.now(),
                    role: 'MEDAGENT',
                    text: res.response,
                    isStreaming: false,
                    isTranscription: false,
                    timestamp: new Date()
               });
           },
           error: (err: any) => {
               this.messages.push({
                    id: Date.now(),
                    role: 'MEDAGENT',
                    text: '❌ Connexion au backend FastAPI (port 8000) impossible. Veuillez démarrer l\'API.',
                    isStreaming: false,
                    isTranscription: false,
                    timestamp: new Date()
               });
           }
        });
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.onSubmit();
    }
  }

  private connectWebSocket() {
        try {
            const socket = this.aiService.connectWebSocket('global-widget-session');
            this.ws = socket;

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.error) {
                    const msg = this.messages.find(m => m.id === this.currentStreamId);
                    if (msg) {
                        msg.text += `\n❌ Erreur interne IA: ${data.error}`;
                        msg.isStreaming = false;
                    } else {
                        this.messages.push({
                            id: Date.now(),
                            role: 'MEDAGENT',
                            text: `❌ Erreur côté serveur: ${data.error}`,
                            isStreaming: false,
                            isTranscription: false,
                            timestamp: new Date()
                        });
                    }
                    this.currentStreamId = null;
                } else if (data.type === 'start') {
                    this.currentStreamId = Date.now();
                    this.messages.push({
                        id: this.currentStreamId,
                        role: 'MEDAGENT',
                        text: '',
                        isStreaming: true,
                        isTranscription: false,
                        timestamp: new Date()
                    });
                } else if (data.type === 'chunk') {
                    const msg = this.messages.find(m => m.id === this.currentStreamId);
                    if (msg && data.content) {
                        msg.text += data.content;
                    }
                } else if (data.type === 'end') {
                    const msg = this.messages.find(m => m.id === this.currentStreamId);
                    if (msg) msg.isStreaming = false;
                    this.currentStreamId = null;
                }
            };

            socket.onclose = () => {
                setTimeout(() => { if(this.isOpen) this.connectWebSocket(); }, 5000);
            };

        } catch (e) {
            console.error('Widget WS Error', e);
        }
    }
}
