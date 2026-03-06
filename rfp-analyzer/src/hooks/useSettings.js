import { useState } from 'react';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'Liferay-RFP-Analyzer-Secret-Key-2024';
const SECURE_STORAGE_KEY = 'rfp-analyzer-settings-secure';
const OLD_STORAGE_KEY = 'rfp-analyzer-settings';

export const useSettings = () => {
  const [apiSettings, setApiSettings] = useState(() => {
    try {
      const savedEncrypted = localStorage.getItem(SECURE_STORAGE_KEY);
      if (savedEncrypted) {
        const bytes = CryptoJS.AES.decrypt(savedEncrypted, ENCRYPTION_KEY);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedStr) return JSON.parse(decryptedStr);
      }
      
      const oldSettings = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldSettings) {
        const parsed = JSON.parse(oldSettings);
        localStorage.removeItem(OLD_STORAGE_KEY);
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(parsed), ENCRYPTION_KEY).toString();
        localStorage.setItem(SECURE_STORAGE_KEY, encrypted);
        return parsed;
      }
    } catch (error) {
      console.error('Settings initialization error:', error);
    }

    return {
      apiKey: '',
      model: '',
      temperature: 0.2,
      maxTokens: 512,
      responseLanguage: 'English',
      systemInstructions: '',
      docSource: 'https://learn.liferay.com',
    };
  });

  const saveSettings = (newSettings) => {
    setApiSettings(newSettings);
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(newSettings), ENCRYPTION_KEY).toString();
      localStorage.setItem(SECURE_STORAGE_KEY, encrypted);
      return true;
    } catch (e) {
      console.error('Secure save error:', e);
      return false;
    }
  };

  return { apiSettings, saveSettings };
};
