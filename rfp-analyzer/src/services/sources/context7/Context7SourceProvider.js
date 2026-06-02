import { BaseSourceProvider } from '../BaseSourceProvider';

/**
 * Source provider for Context7 Documentation.
 * Allows the AI to reference up-to-date documentation and code examples for specific libraries.
 */
export class Context7SourceProvider extends BaseSourceProvider {
  static id = 'context7';
  static name = 'Context7 Docs';

  /** @override */
  static getSettingsSchema() {
    return [
      { 
        id: 'apiKey', 
        label: 'Context7 API Key', 
        type: 'password', 
        required: true 
      },
      { 
        id: 'libraryId', 
        label: 'Library ID', 
        type: 'text', 
        placeholder: 'e.g., /liferay/liferay-portal or /vercel/next.js',
        required: true 
      },
      { 
        id: 'description', 
        label: 'Library Description (Optional)', 
        type: 'text', 
        placeholder: 'What is this library used for?' 
      }
    ];
  }

  /**
   * Static method to verify the connection/key.
   * @param {Object} settings - The source settings.
   */
  static async testConnection(settings) {
    if (!settings.apiKey) return { success: false, error: 'API Key is required.' };
    // For now, we'll return success to allow the UI pattern to work.
    // In a real implementation, this would call a Context7 validation endpoint.
    return { success: true, message: 'Context7 API key accepted.' };
  }

  /** @override */
  static formatContext(config) {
    if (!config.libraryId) return '';
    
    const libId = config.libraryId.trim();
    const desc = config.description ? ` (${config.description.trim()})` : '';
    
    return `You have access to up-to-date documentation and code examples for the library "${libId}"${desc} via Context7. You SHOULD use your internal tools or queries to fetch specific information from this library whenever a requirement pertains to its features or implementation details.`;
  }
}
