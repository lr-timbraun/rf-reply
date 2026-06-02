import { BaseSourceProvider } from '../BaseSourceProvider';

/**
 * Source provider for web-based documentation (URLs).
 * Supports multiple URL entries.
 */
export class WebSourceProvider extends BaseSourceProvider {
  static id = 'web';
  static name = 'Documentation Websites';

  /** @override */
  static getSettingsSchema() {
    return [
      { 
        id: 'url', 
        label: 'Documentation URL', 
        type: 'text', 
        placeholder: 'https://...',
        required: true 
      }
    ];
  }

  /** @override */
  static formatContext(config) {
    if (!config.url) return '';
    const url = config.url.trim();
    if (!url) return '';
    
    return `Your primary knowledge base is located at: ${url}. You MUST attempt to find specific, direct URLs from this domain to support every answer you provide.`;
  }
}
