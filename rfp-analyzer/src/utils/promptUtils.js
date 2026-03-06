/**
 * Utility for constructing and managing AI prompts and system instructions.
 */

/**
 * Constructs the global system instruction for the AI.
 * Includes the persona, user instructions, documentation context, and global protocols.
 */
export const constructSystemInstruction = (apiSettings) => {
  const baseInstruction = 'You are a presales Engineer replying to an RFP requirements questionnaire. ';
  const docContext = apiSettings.docSource 
    ? ` Use only the latest official documentation available at ${apiSettings.docSource} for replying to these prompts.` 
    : '';
  
  const protocolRules = `
GLOBAL PROTOCOL:
1. You will receive one or more "Tasks" for a single RFP requirement.
2. Coordinate your answers across all tasks for that row to ensure consistency.
3. OUTPUT FORMAT: Respond ONLY with a valid JSON object.
4. JSON SCHEMA: { "replies": [ { "taskId": number, "text": string, "sources": string[] } ] }
5. TEXT RULES: 
   - No Markdown (no bold, italics, lists, etc.).
   - If the prompt provides specific options, you MUST choose one and return ONLY that exact text.
   - Respond in ${apiSettings.responseLanguage || 'English'}.
`;

  return `${baseInstruction}${apiSettings.systemInstructions || ''}${docContext}${protocolRules}`;
};

/**
 * Replaces placeholders like {HeaderName} with actual values from the row.
 */
export const fillPromptTemplate = (template, headers, rowValues) => {
  let filledPrompt = template;
  headers.forEach((h, i) => {
    if (!h) return;
    // Escape special characters for regex
    const escapedHeader = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = new RegExp(`\\{${escapedHeader}\\}`, 'g');
    // Row values are 0-indexed relative to the header array
    const value = rowValues[i] !== null && rowValues[i] !== undefined ? rowValues[i] : '';
    filledPrompt = filledPrompt.replace(placeholder, value);
  });
  return filledPrompt;
};

/**
 * Combines multiple column tasks into a single compressed row prompt.
 */
export const constructCompressedRowPrompt = (activeCols, headers, rowValues) => {
  let prompt = "Tasks for this requirement:\n";
  
  activeCols.forEach((col, index) => {
    const filledTask = fillPromptTemplate(col.promptTemplate, headers, rowValues);
    prompt += `ID ${index}: ${filledTask}\n`;
  });
  
  return prompt;
};

/**
 * Thins the model response for history storage to save tokens.
 */
export const thinHistoryResponse = (results, headers) => {
  return results
    .map(r => `Answer for ${headers[r.colIndex] || r.colIndex}: ${r.text}`)
    .join('\n');
};
