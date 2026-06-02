import React, { useState } from 'react';
import ExcelUploader from './components/ExcelUploader/ExcelUploader';
import Settings from './components/Settings/Settings';
import UserManual from './components/UserManual/UserManual';
import { useSettings } from './hooks/useSettings';
import { NotificationProvider, useNotify } from './hooks/useNotify';
import './App.css';

/**
 * Overlay component to manage the Master Passphrase.
 */
const VaultLock = ({ isFirstTime, onUnlock, error }) => {
  const [passphrase, setPassphrase] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUnlock(passphrase);
  };

  return (
    <div className="vault-overlay">
      <div className="vault-modal">
        <div className="vault-header">
          <div className="vault-icon">🔒</div>
          <h1>{isFirstTime ? 'Set Master Passphrase' : 'Vault Locked'}</h1>
          <p>
            {isFirstTime 
              ? 'Your settings and API keys will be encrypted with this passphrase. Do not lose it!' 
              : 'Enter your passphrase to unlock your AI configurations and API keys.'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="vault-form">
          <input
            type="password"
            placeholder="Enter Master Passphrase..."
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
          />
          {error && <div className="vault-error">{error}</div>}
          <button type="submit" className="vault-button">
            {isFirstTime ? 'Initialize Vault' : 'Unlock Vault'}
          </button>
        </form>
      </div>
    </div>
  );
};

function AppContent() {
  const [page, setPage] = useState('main');
  const { 
    settings, 
    apiSettings, 
    preProcessorSettings, 
    postProcessorSettings,
    saveSettings, 
    isLocked, 
    hasVault, 
    unlock, 
    lock, 
    error 
  } = useSettings();
  const { notify } = useNotify();

  const navigateToSettings = () => setPage('settings');
  const navigateToMain = () => setPage('main');
  const navigateToHelp = () => setPage('help');

  const handleSaveSettings = (newSettings) => {
    if (saveSettings(newSettings)) {
      notify('Settings saved securely!', 'success');
    } else {
      notify('Failed to save settings.', 'error');
    }
  };

  if (isLocked) {
    return <VaultLock isFirstTime={!hasVault} onUnlock={unlock} error={error} />;
  }

  return (
    <>
      <div style={{ display: page === 'main' ? 'block' : 'none' }}>
        <div className="App">
          <header className="App-header">
            <h1>RFP Analyzer</h1>
            <div className="header-actions">
              <button onClick={navigateToHelp} className="help-button">Help</button>
              <button onClick={navigateToSettings} className="settings-button">Settings</button>
              <button onClick={lock} className="lock-button" title="Lock Vault">🔒</button>
            </div>
          </header>
          <main>
            <ExcelUploader 
              apiSettings={apiSettings} 
              preProcessorSettings={preProcessorSettings} 
              postProcessorSettings={postProcessorSettings}
            />
          </main>
        </div>
      </div>

      {page === 'settings' && (
        <Settings
          initialSettings={settings}
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

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
