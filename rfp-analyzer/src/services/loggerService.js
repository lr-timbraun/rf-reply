import { errorUtils } from '../utils/errorUtils';

/**
 * Utility service to send logs to the server console.
 * These logs will only be visible if the server is started with the --debug flag.
 */
export const loggerService = {
  /**
   * Sends a general debug log to the server.
   */
  debugLog: async (label, message) => {
    try {
      const safeMessage = (message !== null && typeof message === 'object') 
        ? message 
        : { content: message };

      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, message: safeMessage })
      }).catch(() => {});
    } catch (err) { // eslint-disable-line no-unused-vars
      // Fail silently
    }
  },

  /**
   * Specifically logs an error to the server.
   * Automatically parses complex error objects.
   */
  error: async (label, err) => {
    const errorMsg = errorUtils.parse(err);
    const stack = err instanceof Error ? err.stack : undefined;
    
    console.error(`[${label}]`, err); // Still log to local console for developer

    return loggerService.debugLog(label, {
      error: errorMsg,
      stack: stack,
      raw: (err !== null && typeof err === 'object') ? err : String(err)
    });
  }
};
