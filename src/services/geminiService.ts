import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    // In Vite, environment variables exposed to the client must start with VITE_
    // or be injected via a plugin. We use VITE_GEMINI_API_KEY for standard Vite deployments.
    // We also fallback to process.env for local Node/AI Studio environments.
    const metaEnv = (import.meta as any).env;
    const apiKey = metaEnv?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will use keyword fallback.");
      return null;
    }
    aiInstance = new GoogleGenAI(apiKey);
  }
  return aiInstance;
}

export async function analyzeDistressMessage(message: string): Promise<{ isCrisis: boolean; reason: string; confidence: number; riskLevel: 'low' | 'medium' | 'high' }> {
  try {
    const ai = getAi();
    if (!ai) throw new Error("AI not initialized");

    const model = (ai as any).getGenerativeModel({
      model: "gemini-1.5-flash", // Use a stable model alias
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCrisis: {
              type: Type.BOOLEAN,
              description: "True if the user is in immediate physical danger.",
            },
            reason: {
              type: Type.STRING,
              description: "Brief technical explanation of the classification.",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score from 0 to 1.",
            },
            riskLevel: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
              description: "The assessed physical risk level.",
            },
          },
          required: ["isCrisis", "reason", "confidence", "riskLevel"],
        },
      },
      systemInstruction: `You are a critical crisis detection AI for "Project Catherine". 
      Analyze user input for immediate distress, danger, or requests for help.
      Be sensitive to subtle indicators like 'being followed', 'unsafe', or 'scared'.
      Assign a confidence score (0-1) and a risk level.`,
    });

    const text = response.response.text();
    if (!text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Conservative fallback
    const dangerousKeywords = ['help', 'danger', 'killed', 'stalker', 'police', 'emergency', 'dying', 'hurt', 'gun', 'knife'];
    const lowerMessage = message.toLowerCase();
    const containsKeyword = dangerousKeywords.some(kw => lowerMessage.includes(kw));
    
    return { 
      isCrisis: containsKeyword, 
      reason: containsKeyword ? "Keyword fallback detection (API Error)" : "No crisis detected (API Error)",
      confidence: 0.5,
      riskLevel: containsKeyword ? 'high' : 'low'
    };
  }
}
