
import { GoogleGenAI, Type } from "@google/genai";

export const analyzeHtmlForVariables = async (htmlContent: string) => {
  try {
    // Создаем экземпляр AI только в момент вызова функции
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following HTML content and identify parts that look like dynamic variables or placeholders that a user might want to change (e.g., titles, prices, dates, contact info, or strings inside {{brackets}}). Return a list of suggested mappings. HTML: ${htmlContent.substring(0, 5000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING, description: "The exact text found in HTML to replace" },
              label: { type: Type.STRING, description: "A descriptive label for this field" },
            },
            required: ["originalText", "label"],
          }
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return [];
  }
};
