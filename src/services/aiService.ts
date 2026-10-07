export interface AiAssistantRequest {
  prompt: string;
  context?: string;
  studioName?: string;
  taskType?: 'daily_briefing' | 'patient_message' | 'slot_optimization' | 'clinical_advice' | 'general';
}

export interface AiAssistantResponse {
  success: boolean;
  text: string;
  source: string;
}

export async function askStudioAi(req: AiAssistantRequest): Promise<AiAssistantResponse> {
  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      text: data.text || 'Nessuna risposta generata.',
      source: data.source || 'gemini',
    };
  } catch (err: any) {
    console.error('Failed to query Studio AI:', err);
    // Graceful offline/fallback response
    return {
      success: false,
      text: 'Non è stato possibile contattare il server AI. Verifica la connessione o riprova tra qualche istante.',
      source: 'error_fallback',
    };
  }
}
