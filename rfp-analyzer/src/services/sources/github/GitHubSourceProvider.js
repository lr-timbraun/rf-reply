import { BaseSourceProvider } from '../BaseSourceProvider';

/**
 * Source provider for GitHub repositories.
 * Allows the AI to reference code and documentation from a specific repo.
 */
export class GitHubSourceProvider extends BaseSourceProvider {
  static id = 'github';
  static name = 'GitHub Repository';

  /** @override */
  static getSettingsSchema() {
    return [
      { 
        id: 'owner', 
        label: 'Owner / Organization', 
        type: 'text', 
        placeholder: 'e.g., liferay',
        required: true 
      },
      { 
        id: 'repo', 
        label: 'Repository Name', 
        type: 'text', 
        placeholder: 'e.g., liferay-portal',
        required: true 
      },
      { 
        id: 'branch', 
        label: 'Branch', 
        type: 'text', 
        default: 'main',
        placeholder: 'e.g., main or master' 
      },
      { 
        id: 'token', 
        label: 'Personal Access Token (Optional)', 
        type: 'password', 
        placeholder: 'For private repositories...' 
      }
    ];
  }

  /** @override */
  static formatContext(config) {
    if (!config.owner || !config.repo) return '';
    
    const owner = config.owner.trim();
    const repo = config.repo.trim();
    const branch = (config.branch || 'main').trim();
    const url = `https://github.com/${owner}/${repo}/tree/${branch}`;
    
    return `Your primary knowledge base is the GitHub repository located at: ${url}.`;
  }
}
