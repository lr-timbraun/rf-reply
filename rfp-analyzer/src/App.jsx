import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import ExcelUploader from './ExcelUploader';
import Settings from './Settings';
import UserManual from './UserManual';
import './App.css';

const ENCRYPTION_KEY = 'Liferay-RFP-Analyzer-Secret-Key-2024';

function App() {
  const [page, setPage] = useState('main');
  
  // Load initial settings from localStorage or use defaults
  const [apiSettings, setApiSettings] = useState(() => {
    try {
      // 1. Check for encrypted settings first
      const savedEncrypted = localStorage.getItem('rfp-analyzer-settings-secure');
      if (savedEncrypted && savedEncrypted.length > 0) {
        const bytes = CryptoJS.AES.decrypt(savedEncrypted, ENCRYPTION_KEY);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedStr) {
          return JSON.parse(decryptedStr);
        }
      }
      
      // 2. Fallback to old unencrypted settings (migration)
      const oldSettings = localStorage.getItem('rfp-analyzer-settings');
      if (oldSettings) {
        const parsed = JSON.parse(oldSettings);
        // Clean up and migrate to secure storage
        localStorage.removeItem('rfp-analyzer-settings');
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(parsed), ENCRYPTION_KEY).toString();
        localStorage.setItem('rfp-analyzer-settings-secure', encrypted);
        return parsed;
      }
    } catch (error) {
      console.error('Security migration error:', error);
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

  const navigateToSettings = () => {
    setPage('settings');
  };

  const navigateToMain = () => {
    setPage('main');
  };

  const navigateToHelp = () => {
    setPage('help');
  };

  const handleSaveSettings = (settings) => {
    setApiSettings(settings);
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(settings), ENCRYPTION_KEY).toString();
      localStorage.setItem('rfp-analyzer-settings-secure', encrypted);
      alert('Settings saved securely!');
    } catch (e) {
      console.error('Secure save error:', e);
      alert('Failed to save securely.');
    }
  };

  return (
    <>
      <div style={{ display: page === 'main' ? 'block' : 'none' }}>
        <div className="App">
          <header className="App-header">
            <h1>RFP Analyzer</h1>
            <div className="header-actions">
              <button onClick={navigateToHelp} className="help-button">Help</button>
              <button onClick={navigateToSettings} className="settings-button">Settings</button>
            </div>
          </header>
          <main>
            <ExcelUploader apiSettings={apiSettings} />
          </main>
        </div>
      </div>

      {page === 'settings' && (
        <Settings
          initialSettings={apiSettings}
          onSave={handleSaveSettings}
          onBack={navigateToMain}
        />
      )}

      {page === 'help' && (
        <UserManual onBack={navigateToMain} />
      )}
    </>
  );
}

export default App;
