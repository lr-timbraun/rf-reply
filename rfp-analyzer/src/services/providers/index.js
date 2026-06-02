import { GeminiProvider } from './gemini/GeminiProvider';

/**
 * Registry of available AI providers.
 * To add a new provider, implement the Provider class and register it here.
 */
export const AVAILABLE_PROVIDERS = [
  GeminiProvider
];

/**
 * Returns the provider class for the given providerId.
 */
export const getProviderClass = (providerId) => {
  return AVAILABLE_PROVIDERS.find(p => p.id === providerId) || GeminiProvider;
};
