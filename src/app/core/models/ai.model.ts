export interface PatientContext {
  nom_medecin: string;
  specialite: string;
  nom_patient: string;
  patient_id?: number;
  session_id?: string;
  age: string;
  sexe: string;
  antecedents: string;
  allergies: string;
  medicaments_actuels: string;
  derniere_visite: string;
}

export interface ChatMessage {
  session_id: string;
  message: string;
  source: 'chat' | 'whisper' | 'commande';
  context?: PatientContext;
}

export interface DrugAlert {
  level: 'ROUGE' | 'ORANGE';
  type: 'ALLERGIE' | 'INTERACTION' | 'POSOLOGIE';
  description: string;
  action_required: string;
  alternative?: string;
}

export interface AgentResponse {
  session_id: string;
  response: string;
  mode: 'DICTEE' | 'CHAT' | 'COMMANDE';
  alerts: DrugAlert[];
}

export interface TranscriptionResponse {
  session_id: string;
  transcription: string;
  agent_response: string;
  alerts: DrugAlert[];
}
