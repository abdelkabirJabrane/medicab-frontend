import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AiService } from '../../../core/services/ai.service';
import { PatientContext, DrugAlert } from '../../../core/models/ai.model';

import { ChatBoxComponent } from '../components/chat-box/chat-box';
import { VoiceDictationComponent } from '../components/voice-dictation/voice-dictation';
import { SessionDataPanelComponent } from '../components/session-data-panel/session-data-panel';
import { CommandPanelComponent } from '../components/command-panel/command-panel';
import { ResultModalComponent } from '../components/result-modal/result-modal';
import { PatientContextFormComponent } from '../components/patient-context-form/patient-context-form';
import { ToastModule } from 'primeng/toast';
import { OrdonnanceService, OrdonnanceRequest } from '../../../core/services/ordonnance';
import { MedicalRecordService } from '../../../core/services/medical-record';
import { AuthService } from '../../../core/services/auth';
import { MessageService } from 'primeng/api';

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
      PatientContextFormComponent,
      ToastModule
    ],
    templateUrl: './med-agent.html',
    styleUrls: ['./med-agent.scss'],
    providers: [MessageService]
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
    lastGeneratedDoc: any = null;
    currentConsultationId: number | null = null;

    constructor(
        public aiService: AiService,
        private ordonnanceService: OrdonnanceService,
        private medicalRecordService: MedicalRecordService,
        private authService: AuthService,
        private messageService: MessageService,
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
        this.currentConsultationId = null; // Reset for new patient
        this.aiService.resetSession();
        this.connectWebSocket();
        this.cdr.detectChanges();
    }

    private ensureConsultation(patientId: number): Observable<any> {
        if (this.currentConsultationId) {
            return new Observable(obs => {
                obs.next({ id: this.currentConsultationId });
                obs.complete();
            });
        }

        const medecin = this.authService.getCurrentUser();
        
        return new Observable(obs => {
            // Étape 1: Récupérer le dossier médical du patient
            this.medicalRecordService.getDossierByPatient(patientId).subscribe({
                next: (dossier) => {
                    const dossierId = dossier?.id;
                    if (!dossierId) {
                        obs.error('Dossier médical introuvable pour ce patient.');
                        return;
                    }

                    const dto = {
                        dossierId,
                        patientId,
                        medecinId: medecin?.id || 1,
                        dateConsultation: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
                        motif: 'Consultation via MedAgent AI',
                        notePrivee: 'Généré automatiquement par l’IA.'
                    };

                    console.log('📝 Tentative création consultation:', dto);

                    // Étape 2: Créer la consultation liée au dossier
                    this.medicalRecordService.createConsultation(dto).subscribe({
                        next: (res) => {
                            const id = res.id || res.data?.id;
                            console.log('✅ Consultation créée ID:', id, res);
                            obs.next({ ...res, id });
                            obs.complete();
                        },
                        error: (err) => {
                            console.error('❌ Erreur création consultation:', err);
                            obs.error(err);
                        }
                    });
                },
                error: (err) => {
                    console.error('❌ Erreur récupération dossier:', err);
                    obs.error('Impossible de récupérer le dossier médical.');
                }
            });
        });
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
        
        const pendingId = Date.now();
        this.messages.push({
            id: pendingId,
            role: 'MEDECIN',
            text: '🎤 Transcription en cours...',
            isStreaming: true,
            isTranscription: true,
            timestamp: new Date()
        });
        this.cdr.detectChanges();

        this.aiService.transcribeAudio(blob, this.aiService.sessionId, this.context).subscribe({
            next: (res: any) => {
                const idx = this.messages.findIndex(m => m.id === pendingId);
                if (idx !== -1) {
                    this.messages[idx] = {
                        ...this.messages[idx],
                        text: `🎤 ${res.transcription || '(Aucun texte détecté)'}`,
                        isStreaming: false
                    };
                }
                if (res.agent_response) {
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
                }
                this.cdr.detectChanges();
            },
            error: () => {
                // ── Fallback : Web Speech API du navigateur ─────────
                const idx = this.messages.findIndex(m => m.id === pendingId);
                if (idx !== -1) {
                    this.messages[idx] = {
                        ...this.messages[idx],
                        text: '🎤 Service vocal hors ligne — utilisez la saisie texte ci-dessous.',
                        isStreaming: false
                    };
                }

                // Tenter Web Speech API comme fallback
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'fr-FR';
                    recognition.interimResults = false;
                    recognition.maxAlternatives = 1;

                    recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        const fallbackId = Date.now();
                        this.messages.push({
                            id: fallbackId,
                            role: 'MEDECIN',
                            text: `🎤 ${transcript}`,
                            isStreaming: false,
                            isTranscription: true,
                            timestamp: new Date()
                        });
                        // Envoyer comme message texte à l'IA
                        this.onSendMessage(transcript);
                        this.cdr.detectChanges();
                    };

                    recognition.onerror = () => {
                        this.cdr.detectChanges();
                    };

                    recognition.start();
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
                this.handleGeneratedCommand(cmd, res);
            },
            error: () => {
                this.loadingAction = false;
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de l\'exécution de la commande AI' });
            }
        });
    }

    private handleGeneratedCommand(cmd: string, res: any) {
        this.lastGeneratedDoc = res;
        this.modalTitle = cmd === 'GENERER_CR' ? 'Compte-Rendu de Consultation' : 'Ordonnance Médicale';
        
        // Recherche récursive des données (gestion des wrappers res.data)
        const root = res.data || res;
        const data = root.ordonnance || root.compte_rendu || root.cr || root;

        console.log('🔍 AI Data extracted:', data);

        if (cmd === 'GENERER_ORDONNANCE') {
            this.saveOrdonnanceAuto(data);
        } else if (cmd === 'GENERER_CR') {
            this.saveConsultationAuto(data);
        }

        this.modalContent = JSON.stringify(res, null, 2);
        this.modalVisible = true;
        this.cdr.detectChanges();
    }

    private saveOrdonnanceAuto(aiOrd: any) {
        if (!this.context || !this.context.patient_id) {
            this.messageService.add({ severity: 'warn', summary: 'Patient non identifié', detail: 'Veuillez resélectionner le patient.' });
            return;
        }

        // Étape 1 : S'assurer qu'une consultation existe (Obligatoire pour le backend)
        this.ensureConsultation(this.context.patient_id).subscribe({
            next: (consult) => {
                this.currentConsultationId = consult.id;
                this.executeSaveOrdonnance(aiOrd, consult.id);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer la consultation obligatoire.' });
            }
        });
    }

    private executeSaveOrdonnance(aiOrd: any, consultId: number) {
        const medecin = this.authService.getCurrentUser();
        const medecinId = medecin?.id || 1;
        const tenantId = medecin?.tenantId || 1;

        const today = new Date().toISOString().split('T')[0];
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const validite = nextMonthDate.toISOString().split('T')[0];

        const dto: OrdonnanceRequest = {
            tenantId: tenantId,
            consultationId: consultId, 
            patientId: this.context!.patient_id!,
            medecinId: medecinId, 
            dateEmission: today,
            dateValidite: validite,
            statut: 'ACTIVE',
            instructions: aiOrd.instructions || (Array.isArray(aiOrd.conseils) ? aiOrd.conseils.join('. ') : (aiOrd.conseils || '')),
            renouvellement: false,
            lignes: (aiOrd.medicaments || aiOrd.ordonnance?.medicaments || aiOrd.prescription || aiOrd.items || []).map((m: any) => ({
                medicament: m.nom || m.medicament || m.name || 'Médicament',
                dosage: m.dosage || m.forme || m.strength || '',
                forme: m.forme || '',
                posologie: m.posologie || m.dosage_instruction || m.instruction || '',
                dureeTraitement: typeof m.duree === 'number' ? m.duree : (parseInt(m.duree || m.duration) || 7),
                unite: m.unite || m.unit || 'jours',
                instructions: m.instructions || '',
                substituable: false
            }))
        };

        if (dto.lignes.length === 0) return;

        this.ordonnanceService.create(dto).subscribe({
            next: (saved) => {
                this.lastGeneratedDoc = { ...aiOrd, id: saved.id, saved: true };
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Ordonnance #${saved.id} enregistrée.` });
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur SQL', detail: 'L\'ordonnance n\'a pas pu être insérée (Erreur 400).' });
            }
        });
    }

    private saveConsultationAuto(aiCR: any) {
        const patientId = this.context?.patient_id || 1;

        const dto = {
            id: this.currentConsultationId, // Mettre à jour si elle existe déjà
            patientId: patientId,
            dateConsultation: new Date().toISOString(),
            motif: aiCR.motif || 'Consultation IA',
            description: aiCR.observations || aiCR.examen_clinique || aiCR.examen || '',
            diagnostic: aiCR.diagnostic || aiCR.analyse || '',
            traitement: aiCR.plan_traitement || aiCR.conduite_a_tenir || aiCR.plan || '',
            notePrivee: 'Généré par MedAgent AI'
        };

        const action = this.currentConsultationId 
            ? this.medicalRecordService.updateConsultation(this.currentConsultationId, dto)
            : this.medicalRecordService.createConsultation(dto);

        action.subscribe({
            next: (saved) => {
                this.currentConsultationId = saved.id;
                this.messageService.add({ severity: 'success', summary: 'CR enregistré', detail: 'Le compte-rendu a été sauvegardé.' });
            }
        });
    }

    onPrintDocument() {
        if (!this.lastGeneratedDoc) return;

        // Extraire les données réelles pour l'impression (idempotent avec handleGeneratedCommand)
        const root = this.lastGeneratedDoc.data || this.lastGeneratedDoc;
        const data = root.ordonnance || root.compte_rendu || root.cr || root;

        if (this.modalTitle.includes('Ordonnance')) {
            this.imprimerStyleOrdonnance(data);
        } else {
            this.imprimerStyleCR(data);
        }
    }

    get currentDoctor(): any {
        const user = this.authService.getCurrentUser();
        return {
            fullName: `Dr. ${user?.firstName || ''} ${user?.lastName || ''}`,
            specialty: 'Médecin Généraliste',
            email: user?.email || 'contact@MedGest.com',
            phone: '05 22 00 00 00',
            address: '123 Avenue Mohamed V, Casablanca'
        };
    }

    private imprimerStyleOrdonnance(aiOrd: any) {
        const doc = this.currentDoctor;
        const patientNom = this.context?.nom_patient || aiOrd.patient || 'Patient';
        
        // Robust extraction of medications (look in various common keys)
        const medsData = aiOrd.medicaments || aiOrd.ordonnance?.medicaments || aiOrd.prescription || aiOrd.items || [];
        
        const medsHtml = medsData.map((l: any, i: number) => `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14pt;">${i + 1}. ${l.nom || l.medicament || l.name} ${l.dosage ? '(' + l.dosage + ')' : (l.forme ? '(' + l.forme + ')' : '')}</div>
                <div style="padding-left: 20px; font-style: italic;">${l.posologie || l.dosage_instruction || ''}</div>
                <div style="padding-left: 20px; font-size: 10pt; color: #666;">Pendant ${l.duree || l.duration || 7} ${l.unite || l.unit || 'jours'}</div>
            </div>
        `).join('');

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 40px; }
                        .doc-name { font-size: 24pt; font-weight: bold; color: #1E40AF; margin: 0; }
                        .patient-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 40px; border: 1px solid #e2e8f0; }
                        .rx { font-size: 40pt; font-weight: 900; color: #1E40AF; margin-bottom: 20px; font-family: serif; }
                        .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; border-top: 2px solid #2563EB; padding-top: 20px; font-size: 9pt; color: #666; display: flex; justify-content: space-between; }
                        .sig { margin-top: 60px; text-align: right; border-top: 1px solid #ccc; width: 200px; padding-top: 5px; float: right; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 class="doc-name">${doc.fullName}</h1>
                            <div style="color: #666; text-transform: uppercase;">${doc.specialty}</div>
                        </div>
                    </div>
                    <div class="patient-box">
                        <div style="margin-bottom: 8px;"><strong>Patient:</strong> ${patientNom}</div>
                        <div style="display: flex; justify-content: space-between;">
                            <div><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</div>
                            <div><strong>Réf:</strong> #ORD-AI-${aiOrd.id || 'NEW'}</div>
                        </div>
                    </div>
                    <div class="rx">Rx</div>
                    <div class="meds">${medsHtml}</div>
                    <div class="sig">Signature & Cachet</div>
                    <div class="footer">
                        <div>${doc.address}</div>
                        <div>Tel: ${doc.phone} | Email: ${doc.email}</div>
                    </div>
                </body>
            </html>
        `;
        this.triggerPrint(html);
    }

    private imprimerStyleCR(aiCR: any) {
        const cr = aiCR.compte_rendu || aiCR;
        const doc = this.currentDoctor;
        const patientNom = this.context?.nom_patient || 'Patient';

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                        .header { text-align: center; border-bottom: 2px solid #10B981; padding-bottom: 20px; margin-bottom: 40px; }
                        .title { font-size: 18pt; font-weight: bold; color: #065F46; text-transform: uppercase; }
                        .section { margin-bottom: 25px; }
                        .section-title { font-weight: bold; color: #059669; border-bottom: 1px solid #D1FAE5; margin-bottom: 10px; }
                        .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; border-top: 1px solid #10B981; padding-top: 10px; font-size: 8pt; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div style="font-size: 20pt; font-weight: bold;">${doc.fullName}</div>
                        <div class="title">Rapport de Consultation</div>
                        <div>Date: ${new Date().toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div style="margin-bottom: 30px;">
                        <strong>Patient:</strong> ${patientNom}<br>
                        <strong>Motif:</strong> ${cr.motif || '—'}
                    </div>
                    <div class="section">
                        <div class="section-title">EXAMEN CLINIQUE / OBSERVATIONS</div>
                        <div>${cr.observations || cr.examen_clinique || '—'}</div>
                    </div>
                    <div class="section">
                        <div class="section-title">DIAGNOSTIC</div>
                        <div style="font-weight: bold;">${cr.diagnostic || '—'}</div>
                    </div>
                    <div class="section">
                        <div class="section-title">CONDUITE À TENIR / PLAN</div>
                        <div>${cr.plan_traitement || cr.conduite_a_tenir || '—'}</div>
                    </div>
                    <div class="footer">Document généré par MedGest AI - ${new Date().toLocaleString()}</div>
                </body>
            </html>
        `;
        this.triggerPrint(html);
    }

    private triggerPrint(html: string) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow!.document;
        doc.write(html);
        doc.close();
        iframe.onload = () => {
            iframe.contentWindow!.focus();
            iframe.contentWindow!.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
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
