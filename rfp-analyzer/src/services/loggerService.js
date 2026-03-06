/**
 * Utility service to send logs to the server console.
 * These logs will only be visible if the server is started with the --debug flag.
 */
export const loggerService = {
  debugLog: async (label, message) => {
    try {
      // We always try to send, the server determines if it prints based on its --debug flag.
      // This is fast and fails silently if the endpoint is not available.
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, message })
      }).catch(() => {
        // Fail silently - we don't want logger errors to break the app
      });
    } catch (e) {
      // Fail silently
    }
  }
};
