import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChatMessage, AgentResponse, TranscriptionResponse, PatientContext } from '../models/ai.model';

@Injectable({
    providedIn: 'root'
})
export class AiService {
    private httpUrl = 'http://127.0.0.1:8000/api/ai';
    private wsUrl = 'ws://127.0.0.1:8000/ws/chat';

    private sessionIdSubject = new BehaviorSubject<string>(this.generateUUID());
    public sessionId$ = this.sessionIdSubject.asObservable();

    constructor(private http: HttpClient) {}

    public get sessionId(): string {
        return this.sessionIdSubject.value;
    }

    public resetSession(): void {
        this.sessionIdSubject.next(this.generateUUID());
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    sendChat(payload: ChatMessage): Observable<AgentResponse> {
        return this.http.post<AgentResponse>(`${this.httpUrl}/chat`, payload)
            .pipe(catchError(this.handleError));
    }

    transcribeAudio(audio: Blob, sessionId: string, context: PatientContext): Observable<TranscriptionResponse> {
        const formData = new FormData();
        formData.append('audio', audio, 'dictation.webm');
        formData.append('session_id', sessionId);
        formData.append('context', JSON.stringify(context));

        return this.http.post<TranscriptionResponse>(`${this.httpUrl}/transcribe`, formData)
            .pipe(catchError(this.handleError));
    }

    executeCommand(commande: string, sessionId: string): Observable<any> {
        return this.http.post<any>(`${this.httpUrl}/command`, { commande, session_id: sessionId })
            .pipe(catchError(this.handleError));
    }

    connectWebSocket(sessionId: string): WebSocket {
        return new WebSocket(`${this.wsUrl}/${sessionId}`);
    }

    private handleError(error: any) {
        console.error('❌ AiService error:', error);
        return throwError(() => new Error(error?.message || 'Erreur lors de l\'appel à l\'API IA'));
    }
}
