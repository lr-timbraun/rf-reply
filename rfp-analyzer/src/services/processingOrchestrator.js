import { constructCompressedRowPrompt, thinHistoryResponse, getMoreInfoLabel } from '../utils/promptUtils';
import { loggerService } from './loggerService';

/**
 * Orchestrates the processing of a single RFP row.
 * Centralizes prompt construction, AI interaction, and result formatting.
 */
export const processingOrchestrator = {
  /**
   * Processes all active columns for a single row.
   * 
   * @param {Object} params - The required data and services.
   * @returns {Promise<Object>} - The results and updated history.
   */
  processRow: async ({
    row,
    activeCols,
    headers,
    currentHistory,
    aiService,
    responseLanguage,
    abortSignal
  }) => {
    if (!aiService) throw new Error('AI Service not initialized');

    // 1. Prepare the unified prompt
    const prompt = constructCompressedRowPrompt(activeCols, headers, row.values);
    
    // Log the prompt for debugging
    loggerService.debugLog('ROW_UNIFIED_PROMPT', prompt);

    // 2. Call AI Service
    const { data: aiData } = await aiService.generateRowResponse(
      prompt, 
      currentHistory, 
      abortSignal
    );

    // 3. Map and Format Results
    const results = activeCols.map((col, index) => {
      const reply = aiData.replies?.find(r => r.taskId === index || r.id === index) || 
                    { text: 'Error: No reply', sources: [] };
      
      let sources = Array.isArray(reply.sources) 
        ? reply.sources.map(s => ({ uri: s, title: s })) 
        : [];

      // Format the text specifically for the Excel workbook
      let excelText = reply.text;
      if (reply.text.length > 25 && sources.length > 0) {
        const label = getMoreInfoLabel(responseLanguage);
        excelText = `${reply.text}\n\n${label}:\n${sources.map(s => s.uri).join('\n')}`;
      }

      return {
        colIndex: col.colIndex,
        text: reply.text,
        excelText,
        sources
      };
    });

    // 4. Update Conversation History
    const thinnedReply = thinHistoryResponse(results, headers);
    const newHistoryEntries = [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: [{ text: thinnedReply }] }
    ];

    return {
      results,
      newHistoryEntries
    };
  }
};
