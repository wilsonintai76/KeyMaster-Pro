
import { GoogleGenAI } from "@google/genai";
import { KeySlot, LogEntry } from "../types";

export class AIServiceError extends Error {
  constructor(public message: string, public code?: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export const generateSystemInsight = async (apiKey: string, slots: KeySlot[], logs: LogEntry[]): Promise<string> => {
  try {
    if (!apiKey) {
      throw new AIServiceError("Gemini API Key is not configured.", "MISSING_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const recentLogs = logs.slice(0, 20).map(l => `[${l.timestamp}] ${l.user} ${l.action} (${l.keyLabel})`).join('\n');
    
    const slotSummary = slots.map(s => 
      `- ${s.label}: Status=${s.status}, Usage=${s.usageCount} cycles`
    ).join('\n');

    const prompt = `
      Act as a Senior Facility Manager for a University Mechanical Workshop. 
      Analyze the following IoT Key Management System data and provide a brief, professional Executive Summary.
      
      Format your response using Markdown:
      - Use **bold** for key metrics, numbers, and status states (e.g. **Critical**, **45 cycles**).
      - Use bullet points for specific observations and recommended actions.
      - Keep the tone professional and concise (max 150 words).

      Focus on:
      1. Mechanical health of keys based on actuation cycle counts.
      2. Security compliance concerning late returns or unauthorized patterns.
      3. Precise recommended actions for the workshop technician.

      Current Resource Status:
      ${slotSummary}

      Recent Audit Logs:
      ${recentLogs}
    `;

    // Query GenAI with model and prompt directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Access .text property directly
    if (!response || !response.text) {
      throw new AIServiceError("Cloud model returned an empty response.", "EMPTY_RESPONSE");
    }

    return response.text;
  } catch (error: any) {
    console.error("AI Insight Generation Failed:", error);
    
    if (error instanceof AIServiceError) {
      throw error;
    }
    
    const errorMessage = error?.message || "Unknown communication error";
    if (errorMessage.includes("429") || errorMessage.includes("limit")) {
      throw new AIServiceError("AI rate limit exceeded. Please wait a moment.", "RATE_LIMIT");
    }
    
    throw new AIServiceError("The AI service is currently unavailable. Check your network connection or API Key.", "NETWORK_ERROR");
  }
};
