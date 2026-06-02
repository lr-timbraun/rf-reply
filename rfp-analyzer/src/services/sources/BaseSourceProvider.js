/**
 * Abstract Base Class for Source Providers.
 * All source connectors (Web, File, etc.) must extend this class.
 */
export class BaseSourceProvider {
  /** @type {string} Unique ID for the source type (e.g., 'web') */
  static id = '';
  
  /** @type {string} Display name for the source type */
  static name = '';

  /**
   * Returns the configuration schema for this source type.
   * @returns {import('../providers/BaseProvider').SettingField[]}
   */
  static getSettingsSchema() {
    throw new Error('getSettingsSchema() must be implemented by the source provider.');
  }

  /**
   * Formats the configured sources into a string context for the AI.
   * @param {Object} config - The saved configuration for this source.
   * @returns {string}
   */
  static formatContext(config) { // eslint-disable-line no-unused-vars
    throw new Error('formatContext() must be implemented by the source provider.');
  }
}
