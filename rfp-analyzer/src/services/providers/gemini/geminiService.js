import { loggerService } from '../../loggerService';

/**
 * Service for interacting with the Google Gemini AI API.
 * Objects are built here using the SDK's schema and passed to the server for execution.
 */
export const createAIService = (apiSettings, systemInstruction) => {
  if (!apiSettings.apiKey || !apiSettings.model) return null;

  /**
   * Sends a unified row prompt to the AI using the stateful Interactions API pattern.
   * @param {string} compressedPrompt - The row-specific tasks.
   * @param {string|null} lastInteractionId - The ID of the previous interaction for context.
   * @returns {Promise<{data: Object, rawText: string, interactionId: string}>}
   */
  const generateRowResponse = async (compressedPrompt, lastInteractionId) => {
    // 1. Build the Interaction object according to the official SDK schema (snake_case)
    const interactionParams = {
      model: apiSettings.model,
      system_instruction: systemInstruction,
      input: compressedPrompt,
      response_format: {
        type: "text",
        mime_type: "application/json"
      },
      previous_interaction_id: lastInteractionId || undefined,
      generation_config: {
        temperature: apiSettings.temperature,
        max_output_tokens: apiSettings.maxTokens,
      }
    };

    try {
      // 2. Pass the built object to the server for execution
      const response = await fetch('/api/ai/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiSettings.apiKey,
          apiVersion: 'v1beta',
          config: interactionParams
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }

      const result = await response.json();
      const rawText = (result.output_text || '').trim();
      
      loggerService.debugLog('INTERACTION_PROXY_SUCCESS', { id: result.id });

      // Resilient JSON Extraction
      let cleanJson = rawText;
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      try {
        return {
          data: JSON.parse(cleanJson),
          rawText: rawText,
          interactionId: result.id
        };
      } catch (e) {
        loggerService.debugLog('JSON_PARSE_ERROR', { 
          error: e.message, 
          textSnippet: cleanJson.substring(0, 100) + '...'
        });
        throw new Error(`AI failed to return valid JSON.`, { cause: e });
      }
    } catch (err) {
      loggerService.debugLog('AI_PROXY_ERROR', err.message);
      throw err;
    }
  };

  return { generateRowResponse };
};
