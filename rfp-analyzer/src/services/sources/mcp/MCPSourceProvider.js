import { BaseSourceProvider } from '../BaseSourceProvider';

/**
 * Source provider for MCP (Model Context Protocol) Servers.
 * Allows the AI to know about and potentially interact with a remote context server.
 */
export class MCPSourceProvider extends BaseSourceProvider {
  static id = 'mcp';
  static name = 'MCP Server';

  /** @override */
  static getSettingsSchema() {
    return [
      { 
        id: 'url', 
        label: 'Server URL', 
        type: 'text', 
        placeholder: 'e.g., http://localhost:3001/mcp or https://example.com/sse',
        required: true 
      },
      { 
        id: 'profile', 
        label: 'Server Profile (Optional)', 
        type: 'text', 
        placeholder: 'e.g., default-profile' 
      },
      { 
        id: 'authType', 
        label: 'Authentication', 
        type: 'select', 
        default: 'none',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Basic Authorization', value: 'basic' }
        ]
      },
      { 
        id: 'username', 
        label: 'Username', 
        type: 'text', 
        placeholder: 'For Basic Auth...',
        // Only relevant if authType is basic - UI can't do conditional hide yet but we'll include it
      },
      { 
        id: 'password', 
        label: 'Password / Token', 
        type: 'password', 
        placeholder: 'For Basic Auth...' 
      }
    ];
  }

  /** @override */
  static formatContext(config) {
    if (!config.url) return '';
    
    const url = config.url.trim();
    const profile = config.profile ? ` using the "${config.profile.trim()}" profile` : '';
    
    return `You have access to an MCP (Model Context Protocol) server at: ${url}${profile}. You should use the tools and resources provided by this server to gather additional context or perform specialized tasks related to this RFP.`;
  }
}
