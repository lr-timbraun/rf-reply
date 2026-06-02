/**
 * Centralized utilities for handling and stringifying errors consistently.
 */
export const errorUtils = {
  /**
   * Converts any error-like object into a user-friendly string.
   * Prevents [object Object] from being displayed in the UI.
   * Follows the safety pattern: x !== null && typeof x === 'object'
   */
  parse: (error) => {
    if (error === null || error === undefined) return 'Unknown error';
    if (typeof error === 'string') return error;
    
    // Handle Error objects
    if (error instanceof Error) return error.message;
    
    // Handle complex API error objects
    if (typeof error === 'object') {
      if (error.error !== null && typeof error.error === 'object' && error.error.message) {
        return error.error.message;
      }
      if (typeof error.error === 'string') return error.error;
      if (error.message) return error.message;
    }
    
    // Fallback to JSON stringification for unknown structures
    try {
      return JSON.stringify(error);
    } catch (_) { // eslint-disable-line no-unused-vars
      return 'An unparseable error occurred';
    }
  }
};
