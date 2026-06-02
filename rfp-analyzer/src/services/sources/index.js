import { WebSourceProvider } from './web/WebSourceProvider';
import { GitHubSourceProvider } from './github/GitHubSourceProvider';
import { MCPSourceProvider } from './mcp/MCPSourceProvider';
import { Context7SourceProvider } from './context7/Context7SourceProvider';

/**
 * Registry of available source providers.
 */
export const AVAILABLE_SOURCE_PROVIDERS = [
  WebSourceProvider,
  GitHubSourceProvider,
  MCPSourceProvider,
  Context7SourceProvider
];

/**
 * Returns the source provider class for the given sourceId.
 */
export const getSourceProviderClass = (sourceId) => {
  return AVAILABLE_SOURCE_PROVIDERS.find(p => p.id === sourceId) || WebSourceProvider;
};
