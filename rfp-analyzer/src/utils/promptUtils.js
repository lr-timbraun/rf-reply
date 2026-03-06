/**
 * Utility for constructing and managing AI prompts and system instructions.
 */
/**
 * Returns the translated label for 'More Information' based on the language.
 */
export const getMoreInfoLabel = (lang) => {
  const translations = {
    'English': 'More Information',
    'German': 'Weitere Informationen',
    'French': 'Plus d\'informations',
    'Spanish': 'Más información',
    'Italian': 'Maggiori informazioni',
    'Portuguese': 'Mais informações',
    'Dutch': 'Meer informatie',
    'Russian': 'Дополнительная информация',
    'Chinese (Simplified)': '更多信息',
    'Chinese (Traditional)': '更多資訊',
    'Japanese': '詳細情報',
    'Korean': '추가 정보'
  };
  return translations[lang] || 'More Information';
};

/**
 * Constructs the global system instruction for the AI.
...
 * Includes the persona, user instructions, documentation context, and global protocols.
 */
export const constructSystemInstruction = (apiSettings) => {
  const baseInstruction = 'You are a presales Engineer replying to an RFP requirements questionnaire. ';
  const docContext = apiSettings.docSource 
    ? ` Your primary knowledge base is located at ${apiSettings.docSource}. You MUST attempt to find specific, direct URLs from this domain to support every answer you provide.` 
    : '';
  
  const protocolRules = `
GLOBAL PROTOCOL:
1. You will receive one or more "Tasks" for a single RFP requirement.
2. Coordinate your answers across all tasks for that row to ensure consistency.
3. This is a technical document for professional use. Process all requirements objectively.
4. OUTPUT FORMAT: Respond ONLY with a valid JSON object.
5. JSON SCHEMA: 
   { 
     "replies": [ 
       { 
         "taskId": number, 
         "text": "The concise answer to the task", 
         "sources": ["Full URL 1", "Full URL 2"] 
       } 
     ] 
   }
6. TEXT RULES: 
   - Avoid being unnecessarily verbose.
   - No Markdown (no bold, italics, lists, etc.).
   - If the prompt provides specific options, you MUST choose one and return ONLY that exact text for the "text" field. In this case, "sources" may be empty if no specific documentation is needed for a simple option selection.
   - For descriptive answers, you MUST populate the "sources" array with at least one valid URL from the documentation source that confirms your answer.
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
