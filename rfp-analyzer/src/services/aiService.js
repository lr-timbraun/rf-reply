import { GoogleGenerativeAI } from '@google/generative-ai';
import { constructSystemInstruction } from '../utils/promptUtils';

/**
 * Service for interacting with the Google Gemini AI API.
 */
export const createAIService = (apiSettings) => {
  if (!apiSettings.apiKey || !apiSettings.model) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiSettings.apiKey);
    const model = genAI.getGenerativeModel({
      model: apiSettings.model,
      systemInstruction: constructSystemInstruction(apiSettings),
    });

    /**
     * Sends a unified row prompt to the AI and parses the JSON response.
     */
    const generateRowResponse = async (compressedPrompt, history, signal) => {
      const generationConfig = {
        temperature: apiSettings.temperature,
        maxOutputTokens: apiSettings.maxTokens,
        responseMimeType: "application/json",
      };

      const chat = model.startChat({
        history: history,
        generationConfig,
      });

      const resultPromise = chat.sendMessage(compressedPrompt);
      
      const response = await Promise.race([
        resultPromise,
        new Promise((_, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => reject(new Error('Aborted')));
          }
        })
      ]);

      const rawText = response.response.text().trim();
      try {
        return {
          data: JSON.parse(rawText),
          rawText: rawText
        };
      } catch (e) {
        console.error("AI JSON Parse Error:", rawText);
        throw new Error("AI failed to return valid JSON.");
      }
    };

    return { generateRowResponse };
  } catch (error) {
    console.error("AI Service Initialization Error:", error);
    return null;
  }
};
