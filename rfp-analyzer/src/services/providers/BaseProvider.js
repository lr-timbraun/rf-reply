/**
 * @typedef {Object} SettingField
 * @property {string} id - Unique identifier for the field.
 * @property {string} label - Display label for the UI.
 * @property {string} [category] - Optional category for grouping fields into pages (e.g., 'General', 'AI Settings').
 * @property {('text'|'password'|'number'|'range'|'select'|'async-select'|'async-creatable'|'textarea'|'checkbox')} type - Input type.
 * @property {any} [default] - Default value.
 * @property {boolean} [required] - Whether the field is mandatory.
 * @property {string} [placeholder] - Placeholder text.
 * @property {number} [min] - Min value for 'number' or 'range'.
 * @property {number} [max] - Max value for 'number' or 'range'.
 * @property {number} [step] - Step value for 'range'.
 * @property {boolean} [showPreviewIcon] - Whether to show the preview info icon next to this field.
 * @property {function(any): string} [getDisplayValue] - Optional function to return a descriptive label for the current value.
 * @property {Array<string|{label: string, value: any}>} [options] - Static options for 'select'.
 * @property {function(Object): Promise<string[]>} [fetchOptions] - Async function to fetch options for 'async-select' or 'async-creatable'.
 */

/**
 * Abstract Base Class for AI Providers.
 * All AI connectors (Gemini, OpenAI, etc.) must extend this class.
 */
export class BaseProvider {
  /** @type {string} Unique ID for the provider (e.g., 'gemini') */
  static id = '';
  
  /** @type {string} Display name for the provider */
  static name = '';

  /**
   * Returns the configuration schema for this provider.
   * @returns {SettingField[]}
   */
  static getSettingsSchema() {
    throw new Error('getSettingsSchema() must be implemented by the provider.');
  }

  /**
   * Returns a string preview of the generated prompt context.
   * @param {Object} settings - The current settings.
   * @returns {string}
   */
  static getPreview(settings) { // eslint-disable-line no-unused-vars
    return '';
  }

  /**
   * Static method to verify the connection/key.
   * @param {Object} settings - The provider settings.
   * @returns {Promise<{success: boolean, message: string, error?: any}>}
   */
  static async testConnection(settings) { // eslint-disable-line no-unused-vars
    throw new Error('testConnection() must be implemented by the provider.');
  }

  /**
   * Optional: Analyzes workbook structure to recommend tabs and columns.
   * @param {Object} tabData - Map of tab names to row data.
   * @returns {Promise<{recommendedTabs: string[], tabConfigs: Object}|null>}
   */
  async analyzeWorkbook(tabData) { // eslint-disable-line no-unused-vars
    return null;
  }

  /**
   * @param {Object} apiSettings - The user's AI settings.
   */
  constructor(apiSettings) {
    this.apiSettings = apiSettings;
  }

  /**
   * Resets any session-specific state (like interaction history).
   */
  resetHistory() {}

  /**
   * Registers a manual correction from the user to improve future answers.
   * @param {Object} params
   * @param {string} params.header - The column header.
   * @param {string} params.originalText - The AI's original answer.
   * @param {string} params.newText - The user's correction.
   */
  async registerManualEdit({ header, originalText, newText }) { // eslint-disable-line no-unused-vars
    // Default: do nothing
  }

  /**
   * Processes a single RFP row and returns generated answers.
   * @param {Object} params
   * @param {Object} params.row - The Excel row object.
   * @param {Array} params.activeCols - Selected response columns.
   * @param {Array} params.headers - Workbook headers.
   * @param {AbortSignal} [params.abortSignal]
   * @returns {Promise<Array<{colIndex: number, text: string, excelText: string, sources: Array, needsReview: boolean}>>}
   */
  async processRow({ row, activeCols, headers, abortSignal }) { // eslint-disable-line no-unused-vars
    throw new Error('processRow() must be implemented by the provider.');
  }

  /**
   * Performs a batch post-analysis verification of all generated answers.
   * @param {Object} params
   * @param {Array} params.rows - All data rows with their generated responses.
   * @param {Array} params.activeCols - Selected response columns.
   * @param {Array} params.headers - Workbook headers.
   * @param {AbortSignal} [params.abortSignal]
   * @returns {Promise<Array<{rowIndex: number, colIndex: number, verificationNote: string, status: 'ok'|'warning'|'error'}>>}
   */
  async verifyAnswers({ rows, activeCols, headers, abortSignal }) { // eslint-disable-line no-unused-vars
    throw new Error('verifyAnswers() must be implemented by the provider.');
  }
}
