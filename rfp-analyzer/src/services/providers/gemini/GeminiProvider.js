import { GoogleGenAI } from '@google/genai';
import { BaseProvider } from '../BaseProvider';
import { createAIService } from './geminiService';
import { 
  constructCompressedRowPrompt, 
  getMoreInfoLabel
} from '../../../utils/promptUtils';
import { loggerService } from '../../loggerService';

/**
 * Gemini-specific implementation of the AI Provider using the @google/genai SDK.
 * @extends BaseProvider
 */
export class GeminiProvider extends BaseProvider {
  static id = 'gemini';
  static name = 'Google Gemini';

  /**
   * Helper to normalize Gemini-specific token usage metadata to the unified BaseProvider.TokenUsage schema.
   */
  static _normalizeUsage(usage) {
    if (!usage) return { promptTokens: 0, responseTokens: 0, totalTokens: 0 };
    
    const prompt = usage.promptTokenCount ?? usage.prompt_token_count ?? usage.prompt_tokens ?? usage.input_tokens ?? 0;
    const response = usage.candidatesTokenCount ?? usage.candidates_token_count ?? usage.responseTokenCount ?? usage.response_token_count ?? usage.completion_tokens ?? usage.response_tokens ?? usage.output_tokens ?? 0;
    const total = usage.totalTokenCount ?? usage.total_token_count ?? usage.total_tokens ?? (prompt + response);

    return {
      promptTokens: prompt,
      responseTokens: response,
      totalTokens: total
    };
  }

  /**
   * Constructs the global system instruction for the AI.
   * This is specific to Gemini's expected instruction format.
   */
  static _constructSystemInstruction(settings) {
    const baseInstruction = 'You are a presales Engineer replying to an RFP requirements questionnaire. ';
    const docSource = settings.docSource || ''; // Factual locations of knowledge bases

    const responseLanguage = settings.responseLanguage || 'English';
    const languageFallback = responseLanguage !== 'English'
      ? `\n   - If a documentation source is not available in ${responseLanguage}, use the English version of the source instead.`
      : '';

    const includeLinks = settings.includeSourcesInAnswers === true;
    
    // Conditional rule for sourcing URLs
    const sourceInstruction = includeLinks
      ? 'For descriptive answers, you MUST populate the "sources" array with at least one valid URL from the documentation source that confirms your answer. NEVER include URLs directly in the "text" field.'
      : 'Do NOT provide documentation URLs or links in the response. The "sources" array should be empty.';

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
   - NEVER include URLs or documentation links in the "text" field.
   - If the prompt provides specific options, you MUST choose one and return ONLY that exact text for the "text" field.
   - ${sourceInstruction}
   - Respond in ${responseLanguage}.${languageFallback}
`;

    return `${baseInstruction}${settings.systemInstructions || ''}${docSource}${protocolRules}`;
  }

  /** @override */
  static getSettingsSchema() {
    return [
      { id: 'apiKey', label: 'Gemini API Key', type: 'password', required: true, category: 'AI Settings' },
      { 
        id: 'model', 
        label: 'Model Name', 
        type: 'async-creatable', 
        default: 'gemini-flash-latest',
        required: true,
        category: 'AI Settings',
        fetchOptions: async (settings) => {
          if (!settings.apiKey) return [];
          try {
            // Using direct REST URL as confirmed correct by user
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${settings.apiKey}`);
            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
              const msg = typeof data.error === 'string' ? data.error : (data.error?.message || `API Error: ${response.status}`);
              throw new Error(msg);
            }

            if (!data || !Array.isArray(data.models)) return [];
            
            return data.models
              .filter(m => {
                const actions = m.supportedActions || m.supportedGenerationMethods || [];
                return actions.includes('generateContent');
              })
              .map(m => m.name.replace('models/', ''));
          } catch (e) {
            loggerService.error('FETCH_MODELS_FAILED', e);
            throw e;
          }
        }
      },
      { 
        id: 'temperature', 
        label: 'Temperature', 
        type: 'range', 
        min: 0, 
        max: 1, 
        step: 0.1, 
        default: 0.2,
        category: 'AI Settings',
        getDisplayValue: (val) => {
          if (val <= 0.2) return 'Precise & Professional';
          if (val <= 0.5) return 'Balanced';
          if (val <= 0.8) return 'Creative';
          return 'Very Creative';
        }
      },
      { id: 'maxTokens', label: 'Max Output Tokens', type: 'number', default: 2000, category: 'AI Settings' },
      { id: 'systemInstructions', label: 'Additional System Instructions', type: 'textarea', showPreviewIcon: true, category: 'AI Settings' }
    ];
  }

  /** @override */
  static getPreview(settings) {
    return this._constructSystemInstruction(settings);
  }

  /** @override */
  static async testConnection(settings) {
    if (!settings.apiKey) return { success: false, error: 'API Key is required.' };
    if (!settings.model) return { success: false, error: 'Model name is required.' };

    try {
      const client = new GoogleGenAI({ 
        apiKey: settings.apiKey,
        apiVersion: 'v1beta'
      });

      // Validate the specific model by fetching its metadata
      const modelName = settings.model.startsWith('models/') ? settings.model : `models/${settings.model}`;
      const modelInfo = await client.models.get({ model: modelName });

      return { 
        success: true, 
        message: `Connection successful! Model "${modelInfo.displayName || settings.model}" is ready.` 
      };
    } catch (e) {
      loggerService.error('SDK_CONNECTION_TEST_ERROR', e);
      let msg = e.message || 'Connection failed.';
      if (msg.includes('404')) msg = `Model "${settings.model}" not found.`;
      if (msg.includes('403')) msg = `Access denied to model "${settings.model}" or API Key is invalid.`;
      return { success: false, error: msg };
    }
  }

  /** @override */
  async analyzeWorkbook(tabData) {
    if (!this.aiService) throw new Error('AI Service not initialized');

    // 1. Prepare a lightweight summary of the workbook
    let summary = "Workbook Structure Analysis (Coordinates provided as [R]ow and [C]olumn):\n";
    for (const [tabName, rows] of Object.entries(tabData)) {
      summary += `\n--- Tab: "${tabName}" ---\n`;
      // Take first 20 rows for structural analysis
      const previewRows = rows.slice(0, 20);
      previewRows.forEach((row, idx) => {
        const values = row.values
          .map((v, i) => (v !== null && v !== undefined && v !== '') ? `[C${i}] ${v}` : null)
          .filter(Boolean)
          .join(' | ');
        if (values) summary += `[R${idx}] ${values}\n`;
      });
    }

    const discoveryPrompt = `
You are analyzing the structure of an RFP Excel workbook to automate the response process.
Based on the provided data summaries for each tab (where [R] indicates row index and [C] indicates column index), perform the following:

1. RECOMMENDED TABS: Identify which tabs contain the actual requirements questionnaire (rows of questions to be answered).
2. HEADER DETECTION: For each recommended tab, identify the integer row index [R] that contains the table headers.
3. RESPONSE COLUMNS: Identify which column indices [C] in those tabs are intended for AI-generated answers.
4. PROMPT TEMPLATES: For each response column [C], provide a suggested prompt template. 
   - Use placeholders like "{Header Name}" to refer to requirement data in other columns.
   - Example: "Based on the requirement '{Requirement}', provide a Yes/No answer."
   - Be aware of context: if a column expects specific options (like Yes, No, Partial), mention them in the template.

Return ONLY a valid JSON object matching this schema (column keys MUST be the string representation of the [C] index):
{
  "recommendedTabs": ["Tab Name 1", "Tab Name 2"],
  "tabConfigs": {
    "Tab Name 1": {
      "headerRowIndex": 5,
      "columnPrompts": {
        "3": "Your suggested prompt for column 3...",
        "4": "Your suggested prompt for column 4..."
      }
    }
  }
}

DATA SUMMARY:
${summary}
`;

    try {
      loggerService.debugLog('WORKBOOK_ANALYSIS_START', { tabs: Object.keys(tabData) });
      loggerService.debugLog('WORKBOOK_ANALYSIS_SUMMARY', summary);
      
      const { data, interactionId, rawText, usage } = await this.aiService.generateRowResponse(
        discoveryPrompt,
        null // Start fresh for analysis
      );

      this.lastInteractionId = interactionId;
      loggerService.debugLog('WORKBOOK_ANALYSIS_RAW_RESPONSE', rawText);
      loggerService.debugLog('WORKBOOK_ANALYSIS_SUCCESS', data);

      return {
        recommendedTabs: Array.isArray(data.recommendedTabs) ? data.recommendedTabs : [],
        tabConfigs: data.tabConfigs || {},
        usage: GeminiProvider._normalizeUsage(usage)
      };
    } catch (e) {
      loggerService.error('WORKBOOK_ANALYSIS_FAILED', e);
      return null;
    }
  }

  /** @override */
  constructor(apiSettings) {
    super(apiSettings);
    this.aiService = createAIService(apiSettings, GeminiProvider._constructSystemInstruction(apiSettings));
    this.lastInteractionId = null;
  }

  /** @override */
  resetHistory() {
    this.lastInteractionId = null;
    loggerService.debugLog('HISTORY_RESET', 'Provider interaction context cleared');
  }

  /** @override */
  async registerManualEdit({ header, originalText, newText }) {
    if (!this.aiService) return;

    const correctionPrompt = `User Manual Correction for "${header}":
The previous AI-generated answer was: "${originalText}"
The user corrected it to: "${newText}"
Please incorporate this correction for future similar requirements in this document.`;

    try {
      // Create a "silent" interaction to feed the correction into the stateful chain
      const { interactionId } = await this.aiService.generateRowResponse(
        correctionPrompt, 
        this.lastInteractionId
      );
      this.lastInteractionId = interactionId;
      loggerService.debugLog('MANUAL_EDIT_REGISTERED', { header, newText, interactionId });
    } catch (e) {
      loggerService.error('MANUAL_EDIT_REGISTER_FAILED', e);
    }
  }

  /** @override */
  async processRow({ row, activeCols, headers, abortSignal }) {
    if (!this.aiService) throw new Error('AI Service not initialized');

    // 1. Initial Processing Pass
    const mainPrompt = constructCompressedRowPrompt(activeCols, headers, row.values);
    loggerService.debugLog('ROW_UNIFIED_PROMPT', mainPrompt);

    let currentData;
    let newInteractionId;
    let usage;

    try {
      const response = await this.aiService.generateRowResponse(mainPrompt, this.lastInteractionId, abortSignal);
      currentData = response.data;
      newInteractionId = response.interactionId;
      usage = response.usage;
    } catch (err) {
      if (err.message === 'Aborted') throw err;
      
      // Failover Retry (Stateless)
      loggerService.debugLog('RETRY_STATELESS', err.message);
      const retryRes = await this.aiService.generateRowResponse(mainPrompt, null, abortSignal);
      currentData = retryRes.data;
      newInteractionId = retryRes.interactionId;
      usage = retryRes.usage;
    }

    // 2. Format Results
    const label = getMoreInfoLabel(this.apiSettings.responseLanguage);
    const results = (currentData?.replies || []).map((reply, index) => {
      const col = activeCols[index] || { colIndex: index }; 
      const sources = Array.isArray(reply.sources) ? reply.sources : (reply.sources ? [reply.sources] : []);
      const formattedSources = sources.map(s => ({ uri: s, title: s }));

      const cleanText = (reply.text || 'Error: No reply').trim();
      const includeLinks = this.apiSettings.includeSourcesInAnswers === true;

      let finalExcelText = cleanText;
      
      // Only append the citation block if explicitly enabled
      if (includeLinks && cleanText.length > 25 && formattedSources.length > 0) {
        finalExcelText = `${cleanText}\n\n${label}:\n${formattedSources.map(s => s.uri).join('\n')}`;
      }

      return {
        colIndex: col.colIndex,
        text: cleanText,
        excelText: finalExcelText,
        sources: formattedSources,
        needsReview: false
      };
    });

    // 3. Update Context Pointer
    this.lastInteractionId = newInteractionId;

    return { results, usage: GeminiProvider._normalizeUsage(usage) };
  }

  /** @override */
  async verifyAnswers({ rows, activeCols, headers, abortSignal: _abortSignal }) { // eslint-disable-line no-unused-vars
    if (!this.aiService) throw new Error('AI Service not initialized');

    // 1. Summarize the finished document for verification
    let batchSummary = "Finished RFP Document for Verification:\n";
    rows.forEach((row, rIdx) => {
      batchSummary += `\n--- Row ${rIdx} ---\n`;
      activeCols.forEach((col) => {
        const header = headers[col.colIndex] || `Col ${col.colIndex}`;
        const answer = row.values[col.colIndex];
        // We look for requirement context in nearby columns
        const reqContext = row.values.slice(Math.max(0, col.colIndex - 3), col.colIndex + 3).join(' | ');
        batchSummary += `Requirement Context: ${reqContext}\n`;
        batchSummary += `Header: ${header}\n`;
        batchSummary += `AI Answer: ${answer}\n`;
      });
    });

    const verificationPrompt = `
You are a Quality Assurance Engineer performing a Post-Analysis Verification on an RFP response.
You will be provided with a summary of the finished document, including requirement context and the AI-generated answers.

MISSION:
1. CHECK CORRECTNESS: Ensure the AI answers accurately address the requirements.
2. CHECK CONSISTENCY: Ensure there are no contradictions between answers in different rows or columns.
3. IDENTIFY ERRORS: Flag any answers that seem hallucinated, inconsistent, or professionally inadequate.

Return ONLY a valid JSON object matching this schema:
{
  "verifications": [
    {
      "rowIndex": number,
      "colIndex": number,
      "verificationNote": "Brief explanation of the issue or confirmation",
      "status": "ok" | "warning" | "error"
    }
  ]
}

Only include rows/columns where you have specific feedback or concerns. If all looks perfect, return an empty "verifications" array.

DOCUMENT SUMMARY:
${batchSummary}
`;

    try {
      loggerService.debugLog('POST_ANALYSIS_START', { rowCount: rows.length });
      
      const { data, rawText, usage } = await this.aiService.generateRowResponse(
        verificationPrompt,
        null // Fresh session for verification
      );

      loggerService.debugLog('POST_ANALYSIS_RAW_RESPONSE', rawText);
      loggerService.debugLog('POST_ANALYSIS_SUCCESS', data);

      return {
        verifications: Array.isArray(data.verifications) ? data.verifications : [],
        usage: GeminiProvider._normalizeUsage(usage)
      };
    } catch (e) {
      loggerService.error('POST_ANALYSIS_VERIFICATION_FAILED', e);
      throw e;
    }
  }
}
