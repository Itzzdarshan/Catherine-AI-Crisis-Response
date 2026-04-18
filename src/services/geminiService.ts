import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeDistressMessage(message: string): Promise<{ isCrisis: boolean; reason: string; confidence: number; riskLevel: 'low' | 'medium' | 'high' }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `You are a critical crisis detection AI for "Project Catherine". 
        Analyze user input for immediate distress, danger, or requests for help.
        Be sensitive to subtle indicators like 'being followed', 'unsafe', or 'scared'.
        Assign a confidence score (0-1) and a risk level.`,
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
    });

    const text = response.text;
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
