/**
 * Utility service to send logs to the server console.
 * These logs will only be visible if the server is started with the --debug flag.
 */
export const loggerService = {
  debugLog: async (label, message) => {
    try {
      // Safety pattern: check for null before typeof object
      const safeMessage = (message !== null && typeof message === 'object') 
        ? message 
        : { content: message };

      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, message: safeMessage })
      }).catch(() => {
        // Fail silently - we don't want logger errors to break the app
      });
    } catch (error) { // eslint-disable-line no-unused-vars
      // Fail silently
    }
  }
};
