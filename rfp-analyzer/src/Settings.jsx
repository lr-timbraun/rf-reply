import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = ({ initialSettings, onSave, onBack }) => {
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);
  const [model, setModel] = useState(initialSettings.model);
  const [temperature, setTemperature] = useState(initialSettings.temperature);
  const [maxTokens, setMaxTokens] = useState(initialSettings.maxTokens);
  const [responseLanguage, setResponseLanguage] = useState(initialSettings.responseLanguage || 'English');
  const [systemInstructions, setSystemInstructions] = useState(initialSettings.systemInstructions);

  const [availableModels, setAvailableModels] = useState([]);
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState(!!initialSettings.apiKey);
  const [testStatus, setTestStatus] = useState(null);

  const languages = [
    'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque', 'Belarusian', 'Bengali', 'Bosnian',
    'Bulgarian', 'Catalan', 'Cebuano', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch',
    'English', 'Esperanto', 'Estonian', 'Finnish', 'French', 'Frisian', 'Galician', 'Georgian', 'German', 'Greek',
    'Gujarati', 'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew', 'Hindi', 'Hmong', 'Hungarian', 'Icelandic', 'Igbo',
    'Indonesian', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kazakh', 'Khmer', 'Korean', 'Kurdish',
    'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam',
    'Maltese', 'Maori', 'Marathi', 'Mongolian', 'Myanmar (Burmese)', 'Nepali', 'Norwegian', 'Nyanja (Chichewa)', 'Pashto', 'Persian',
    'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Samoan', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Shona',
    'Sindhi', 'Sinhala (Sinhalese)', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sundanese', 'Swahili', 'Swedish', 'Tagalog (Filipino)',
    'Tajik', 'Tamil', 'Telugu', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu'
  ];

  useEffect(() => {
    if (!isConnectionSuccessful) {
      setAvailableModels([]);
      setModel('');
    }
  }, [isConnectionSuccessful]);

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    setIsConnectionSuccessful(false);
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      alert('Please enter an API key.');
      return;
    }

    setTestStatus('testing');
    setIsConnectionSuccessful(false);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const generativeModels = data.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      if (generativeModels.length > 0) {
        setAvailableModels(generativeModels);
        setModel(generativeModels[0]);
        setIsConnectionSuccessful(true);
        setTestStatus('success');
      } else {
        throw new Error('No models supporting content generation found for this API key.');
      }
    } catch (error) {
      console.error('API Test Error:', error);
      setTestStatus('error');
      setAvailableModels([]);
    }
  };

  const handleSave = () => {
    onSave({ apiKey, model, temperature, maxTokens, responseLanguage, systemInstructions });
  };

  const getTemperatureDescription = (temp) => {
    if (temp <= 0.2) return 'Precise & Professional';
    if (temp <= 0.5) return 'Balanced';
    if (temp <= 0.8) return 'Creative';
    return 'Very Creative';
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>Settings</h1>
        <button onClick={onBack} className="back-button">Back</button>
      </header>
      <main className="settings-content">
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="api-key">Gemini API Key</label>
            <div className="api-key-group">
              <input
                type="password"
                id="api-key"
                value={apiKey}
                onChange={handleApiKeyChange}
              />
              <button onClick={handleTestConnection} className="test-button" disabled={testStatus === 'testing'}>
                {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            {testStatus && (
              <div className={`test-status ${testStatus}`}>
                {testStatus === 'success' && 'Connection successful!'}
                {testStatus === 'error' && 'Connection failed. Please check your API key.'}
              </div>
            )}
          </div>

          <fieldset disabled={!isConnectionSuccessful} className="settings-fieldset">
            <div className="form-group">
              <label htmlFor="system-instructions">System Instructions</label>
              <textarea
                id="system-instructions"
                rows="4"
                value={systemInstructions}
                onChange={(e) => setSystemInstructions(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="model">Model</label>
              <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                {availableModels.length > 0 ? (
                  availableModels.map(m => <option key={m} value={m}>{m}</option>)
                ) : (
                  <option>Test connection to see models</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="temperature">
                Temperature: {temperature} <span className="temp-description">({getTemperatureDescription(temperature)})</span>
              </label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="max-tokens">Max Output Tokens</label>
              <input
                type="number"
                id="max-tokens"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              />
              {maxTokens > 0 && (
                <small className="token-estimate">
                  Estimated length: ~{Math.round(maxTokens * 0.75)} words, or about {Math.max(1, Math.round((maxTokens * 0.75) / 15))} sentences / {Math.max(1, Math.round((maxTokens * 0.75) / 100))} paragraphs.
                </small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="response-language">Response Language</label>
              <select
                id="response-language"
                value={responseLanguage}
                onChange={(e) => setResponseLanguage(e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </fieldset>

          <div className="form-actions">
            <button onClick={handleSave} className="save-button" disabled={!isConnectionSuccessful}>
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
