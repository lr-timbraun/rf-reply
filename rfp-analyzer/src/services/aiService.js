import { GoogleGenerativeAI } from '@google/generative-ai';
import { constructSystemInstruction } from '../utils/promptUtils';
import { loggerService } from './loggerService';

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

      // 1. Check for valid response structure
      if (!response.response || !response.response.candidates || response.response.candidates.length === 0) {
        const promptFeedback = response.response.promptFeedback;
        loggerService.debugLog('AI_BLOCKED', { reason: 'No candidates returned', feedback: promptFeedback });
        throw new Error("AI returned an empty response (likely blocked by safety filters).");
      }

      const candidate = response.response.candidates[0];
      const finishReason = candidate.finishReason;
      
      // Log detailed diagnostics for every request
      loggerService.debugLog('AI_DIAGNOSTICS', {
        finishReason: finishReason,
        safetyRatings: candidate.safetyRatings
      });

      // 2. Extract text with fallback
      let rawText = '';
      try {
        rawText = candidate.content.parts[0].text.trim();
      } catch (err) {
        // If content is missing, it's definitely a block
        loggerService.debugLog('AI_CONTENT_MISSING', { finishReason });
        throw new Error(`AI provided no content. Finish Reason: ${finishReason}`);
      }
      
      // Log raw response for debugging
      loggerService.debugLog('AI_RAW_RESPONSE', rawText);

      if (finishReason === 'MAX_TOKENS') {
        loggerService.debugLog('WARNING', 'AI response was truncated due to MAX_TOKENS limit.');
      }

      // 3. Resilient JSON Extraction
      let cleanJson = rawText;
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      try {
        return {
          data: JSON.parse(cleanJson),
          rawText: rawText
        };
      } catch (e) {
        loggerService.debugLog('JSON_PARSE_ERROR', { 
          error: e.message, 
          finishReason: finishReason,
          textSnippet: cleanJson.substring(0, 100) + '...'
        });
        throw new Error(`AI failed to return valid JSON (Reason: ${finishReason}).`);
      }
    };

    return { generateRowResponse };
  } catch (error) {
    console.error("AI Service Initialization Error:", error);
    return null;
  }
};
