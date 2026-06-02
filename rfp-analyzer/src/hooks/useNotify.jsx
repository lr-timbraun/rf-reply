import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext(null);

/**
 * Provider component that manages the global notification state.
 */
export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    if (type === 'error') console.error(`[APP-ERROR] ${message}`);
    else console.log(`[APP-INFO] ${message}`);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(clearNotification, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  return (
    <NotificationContext.Provider value={{ notify, clearNotification }}>
      {children}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
          <button className="close-toast" onClick={clearNotification}>&times;</button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

/**
 * Custom hook to access the notification system.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotify must be used within a NotificationProvider');
  }
  return context;
};
