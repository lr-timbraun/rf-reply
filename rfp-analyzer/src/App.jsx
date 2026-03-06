import React, { useState } from 'react';
import ExcelUploader from './components/ExcelUploader/ExcelUploader';
import Settings from './components/Settings/Settings';
import UserManual from './components/UserManual/UserManual';
import { useSettings } from './hooks/useSettings';
import './App.css';

function App() {
  const [page, setPage] = useState('main');
  const { apiSettings, saveSettings } = useSettings();

  const navigateToSettings = () => setPage('settings');
  const navigateToMain = () => setPage('main');
  const navigateToHelp = () => setPage('help');

  const handleSaveSettings = (settings) => {
    if (saveSettings(settings)) {
      alert('Settings saved securely!');
    } else {
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
