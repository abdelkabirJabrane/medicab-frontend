import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '../../../core/services/ai.service';
import { PatientContext, DrugAlert } from '../../../core/models/ai.model';

import { ChatBoxComponent } from '../components/chat-box/chat-box';
import { VoiceDictationComponent } from '../components/voice-dictation/voice-dictation';
import { SessionDataPanelComponent } from '../components/session-data-panel/session-data-panel';
import { CommandPanelComponent } from '../components/command-panel/command-panel';
import { ResultModalComponent } from '../components/result-modal/result-modal';
import { PatientContextFormComponent } from '../components/patient-context-form/patient-context-form';

@Component({
    selector: 'app-med-agent',
    standalone: true,
    imports: [
      CommonModule, 
      ChatBoxComponent, 
      VoiceDictationComponent, 
      SessionDataPanelComponent, 
      CommandPanelComponent, 
      ResultModalComponent, 
      PatientContextFormComponent
    ],
    templateUrl: './med-agent.html',
    styleUrls: ['./med-agent.scss']
})
export class MedAgentComponent implements OnInit, OnDestroy {
    context: PatientContext | null = null;
    messages: any[] = [];
    isRecording = false;
    connectionError = false;
    loadingAction = false;
    
    sessionData: any = null;
    activeAlerts: DrugAlert[] = [];
    
    modalVisible = false;
    modalContent = '';
    modalTitle = '';

    private ws: WebSocket | null = null;
    private currentStreamId: number | null = null;

    constructor(
        public aiService: AiService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {}

    ngOnDestroy() {
        if (this.ws) {
            this.ws.close();
        }
    }

    onContextReady(ctx: PatientContext) {
        this.context = ctx;
        this.aiService.resetSession();
        this.connectWebSocket();
    }

    private connectWebSocket() {
        this.connectionError = false;
        try {
            const socket = this.aiService.connectWebSocket(this.aiService.sessionId);
            this.ws = socket;

            socket.onmessage = (event: MessageEvent) => {
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
                    if (msg) {
                        msg.isStreaming = false;
                        this.tryUpdateSessionData(msg.text); 
                    }
                    this.currentStreamId = null;
                }
            };

            socket.onclose = () => {
                this.connectionError = true;
                setTimeout(() => { if(this.context) this.connectWebSocket(); }, 5000);
            };
            
            socket.onerror = () => {
                this.connectionError = true;
            };

        } catch (e) {
            this.connectionError = true;
        }
    }

    private tryUpdateSessionData(text: string) {
        try {
            const jsonMatch = text.match(/```json([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                const parsed = JSON.parse(jsonMatch[1]);
                this.sessionData = parsed;
                if (parsed.alerts) this.activeAlerts = parsed.alerts;
            } else if (text.startsWith('{')) {
                const parsed = JSON.parse(text);
                this.sessionData = parsed;
                if (parsed.alerts) this.activeAlerts = parsed.alerts;
            }
        } catch (e) {}
    }

    onSendMessage(text: string) {
        if (!this.context) return;
        
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
                context: this.context
            }));
        } else {
            this.aiService.sendChat({
               session_id: this.aiService.sessionId,
               message: text,
               source: 'chat',
               context: this.context
            }).subscribe({
               next: (res: any) => this.handleAgentResponse(res),
               error: (err: any) => {
                   this.messages.push({
                        id: Date.now(),
                        role: 'MEDAGENT',
                        text: '❌ La connexion au serveur FastAPI (http://localhost:8000) a échoué. Veuillez vérifier que l\'API est démarrée.',
                        isStreaming: false,
                        isTranscription: false,
                        timestamp: new Date()
                   });
               }
            });
        }
    }

    onAudioRecorded(blob: Blob) {
        if (!this.context) return;
        
        this.messages.push({
            id: Date.now(),
            role: 'MEDECIN',
            text: '🎤 Dictée vocale en cours d\'analyse...',
            isStreaming: false,
            isTranscription: true,
            timestamp: new Date()
        });

        this.aiService.transcribeAudio(blob, this.aiService.sessionId, this.context).subscribe({
            next: (res: any) => {
                const lastIdx = this.messages.map(m => m.isTranscription).lastIndexOf(true);
                if (lastIdx !== -1) {
                    this.messages[lastIdx] = { 
                        ...this.messages[lastIdx], 
                        text: `🎤 ${res.transcription || '... (Aucun texte détecté)'}` 
                    };
                }
                
                this.messages.push({
                   id: Date.now(),
                   role: 'MEDAGENT',
                   text: res.agent_response,
                   isStreaming: false,
                   isTranscription: false,
                   timestamp: new Date()
                });

                if (res.alerts) this.activeAlerts = res.alerts;
                this.tryUpdateSessionData(res.agent_response);
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                const lastIdx = this.messages.map(m => m.isTranscription).lastIndexOf(true);
                if (lastIdx !== -1) {
                    this.messages[lastIdx] = { 
                        ...this.messages[lastIdx], 
                        text: '❌ Erreur de transcription temporelle.' 
                    };
                }
                this.cdr.detectChanges();
            }
        });
    }

    onRecordingStatusChange(status: boolean) {
        this.isRecording = status;
        this.cdr.detectChanges();
    }

    onCommand(cmd: string) {
        if (cmd === 'RESET') {
            this.context = null;
            this.messages = [];
            this.sessionData = null;
            this.activeAlerts = [];
            if(this.ws) this.ws.close();
            return;
        }

        this.loadingAction = true;
        this.aiService.executeCommand(cmd, this.aiService.sessionId).subscribe({
            next: (res: any) => {
                this.loadingAction = false;
                this.modalContent = JSON.stringify(res, null, 2);
                this.modalTitle = cmd === 'GENERER_CR' ? 'Compte-Rendu' : 'Ordonnance';
                this.modalVisible = true;
            },
            error: () => this.loadingAction = false
        });
    }

    handleAgentResponse(res: any) {
        this.messages.push({
            id: Date.now(),
            role: 'MEDAGENT',
            text: res.response,
            isStreaming: false,
            isTranscription: false,
            timestamp: new Date()
        });
        if (res.alerts) this.activeAlerts = res.alerts;
        this.tryUpdateSessionData(res.response);
    }
}
