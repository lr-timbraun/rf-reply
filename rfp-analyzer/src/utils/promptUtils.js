/**
 * Utility for constructing and managing AI prompts.
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
 * Replaces placeholders like {HeaderName} with actual values from the row.
 */
export const fillPromptTemplate = (template, headers, rowValues) => {
  let filledPrompt = template;
  headers.forEach((h, i) => {
    if (!h) return;
    const escapedHeader = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = new RegExp(`\\{${escapedHeader}\\}`, 'g');
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
 * Creates a lean summary of the row data (headers and values) without any AI instructions.
 * Useful for hunting links or secondary verification tasks to save tokens.
 */
export const constructRowDataSummary = (headers, rowValues) => {
  return headers
    .map((h, i) => {
      if (!h) return null;
      const val = rowValues[i] !== null && rowValues[i] !== undefined ? rowValues[i] : '';
      if (!val) return null;
      return `${h}: ${val}`;
    })
    .filter(Boolean)
    .join(', ');
};

