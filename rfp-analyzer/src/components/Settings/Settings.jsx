import React, { useState, useMemo, useCallback } from 'react';
import { AVAILABLE_PROVIDERS, getProviderClass } from '../../services/providers';
import { AVAILABLE_SOURCE_PROVIDERS, getSourceProviderClass } from '../../services/sources';
import { loggerService } from '../../services/loggerService';
import { useNotify } from '../../hooks/useNotify';
import { errorUtils } from '../../utils/errorUtils';
import { LANGUAGES } from '../../utils/languages';
import './Settings.css';

const InfoIcon = ({ onClick }) => (
  <button 
    className="info-icon" 
    onClick={onClick} 
    title="Show Preview"
    aria-label="Show Preview"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
    </svg>
  </button>
);

const Settings = ({ initialSettings, onSave, onBack }) => {
  const [activePage, setActivePage] = useState('General');
  const [subView, setSubView] = useState('list'); // 'list' or 'edit'
  const [settings, setSettings] = useState(initialSettings);
  const { notify } = useNotify();

  // Management State
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [editingSourceId, setEditingSourceId] = useState(null);

  const editingConfig = useMemo(() => 
    settings.configs[editingConfigId] || Object.values(settings.configs)[0] || null,
    [settings.configs, editingConfigId]
  );

  const editingSource = useMemo(() => 
    settings.sourceConfigs[editingSourceId] || Object.values(settings.sourceConfigs)[0] || null,
    [settings.sourceConfigs, editingSourceId]
  );

  const [asyncOptions, setAsyncOptions] = useState({});
  const [loadingAsync, setLoadingAsync] = useState({});
  const [loadSuccess, setLoadSuccess] = useState({});
  const [loadError, setLoadError] = useState({});
  const [testStatus, setTestStatus] = useState(null);
  const [showFullInstructions, setShowFullInstructions] = useState(false);

  // Resolution
  const AIProviderClass = useMemo(() => 
    editingConfig ? getProviderClass(editingConfig.providerId) : null, 
    [editingConfig]
  );
  
  const SourceProviderClass = useMemo(() => 
    editingSource ? getSourceProviderClass(editingSource.providerId) : null, 
    [editingSource]
  );
  
  const aiSchema = useMemo(() => {
    try {
      return AIProviderClass ? AIProviderClass.getSettingsSchema().filter(f => f.category === 'AI Settings') : [];
    } catch (err) {
      loggerService.error('GET_AI_SCHEMA_FAILED', err);
      return [];
    }
  }, [AIProviderClass]);

  const sourceSchema = useMemo(() => {
    try {
      return SourceProviderClass ? SourceProviderClass.getSettingsSchema() : [];
    } catch (err) {
      loggerService.error('GET_SOURCE_SCHEMA_FAILED', err);
      return [];
    }
  }, [SourceProviderClass]);

  const previewContent = useMemo(() => {
    if (AIProviderClass && AIProviderClass.getPreview && editingConfig) {
      // Logic from useSettings to build docSource context for preview
      const contexts = settings.activeSourceConfigIds
        .map(id => settings.sourceConfigs[id])
        .filter(Boolean)
        .map(sourceConfig => {
          const SourceProvider = getSourceProviderClass(sourceConfig.providerId);
          return SourceProvider.formatContext(sourceConfig);
        })
        .filter(ctx => ctx.trim());

      const docSource = contexts.length > 0 
        ? `You have access to the following prioritized knowledge bases:\n${contexts.map((ctx, i) => `${i+1}. ${ctx}`).join('\n')}`
        : '';

      return AIProviderClass.getPreview({ ...editingConfig, docSource, responseLanguage: settings.responseLanguage });
    }
    return null;
  }, [AIProviderClass, editingConfig, settings.sourceConfigs, settings.activeSourceConfigIds, settings.responseLanguage]);

  // Handlers
  const handleGlobalChange = useCallback((id, value) => {
    setSettings(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleConfigChange = useCallback((id, value) => {
    if (!editingConfigId) return;
    setSettings(prev => ({
      ...prev,
      configs: {
        ...prev.configs,
        [editingConfigId]: { ...prev.configs[editingConfigId], [id]: value }
      }
    }));
    setTestStatus(null);
  }, [editingConfigId]);

  const handleSourceChange = useCallback((id, value) => {
    if (!editingSourceId) return;
    setSettings(prev => ({
      ...prev,
      sourceConfigs: {
        ...prev.sourceConfigs,
        [editingSourceId]: { ...prev.sourceConfigs[editingSourceId], [id]: value }
      }
    }));
    setTestStatus(null);
  }, [editingSourceId]);

  const handleCreateAIConfig = () => {
    const id = `config-${Date.now()}`;
    const newConfig = { id, name: 'New AI Configuration', providerId: 'gemini', apiKey: '', model: 'gemini-flash-latest', temperature: 0.2, maxTokens: 2048, systemInstructions: '' };
    setSettings(prev => ({ ...prev, configs: { ...prev.configs, [id]: newConfig } }));
    setEditingConfigId(id);
    setSubView('edit');
  };

  const handleCreateSourceConfig = () => {
    const id = `source-${Date.now()}`;
    const newSource = { id, name: 'New Source Definition', providerId: 'web', url: '' };
    setSettings(prev => ({ ...prev, sourceConfigs: { ...prev.sourceConfigs, [id]: newSource } }));
    setEditingSourceId(id);
    setSubView('edit');
  };

  const handleTestConnection = async () => {
    const targetClass = activePage === 'AI Configurations' ? AIProviderClass : SourceProviderClass;
    const targetData = activePage === 'AI Configurations' ? editingConfig : editingSource;

    if (!targetClass || !targetClass.testConnection || !targetData) return;
    setTestStatus({ type: 'testing', message: 'Testing connection...' });
    try {
      const result = await targetClass.testConnection(targetData);
      const msg = typeof result.message === 'string' ? result.message : 'Operation complete.';
      const err = errorUtils.parse(result.error);
      if (result.success) setTestStatus({ type: 'success', message: msg });
      else setTestStatus({ type: 'error', message: err });
    } catch (error) {
      loggerService.error("TEST_CONNECTION_ERROR", error);
      setTestStatus({ type: 'error', message: `Unexpected error: ${errorUtils.parse(error)}` });
    }
  };

  const fetchAsyncOptions = useCallback(async (fieldId, fetchFn) => {
    if (!editingConfig) return;
    setLoadingAsync(prev => ({ ...prev, [fieldId]: true }));
    setLoadSuccess(prev => ({ ...prev, [fieldId]: false }));
    setLoadError(prev => ({ ...prev, [fieldId]: false }));
    try {
      const options = await fetchFn(editingConfig);
      if (!Array.isArray(options)) throw new Error('Provider returned invalid options format.');
      setAsyncOptions(prev => ({ ...prev, [fieldId]: options }));
      handleConfigChange(fieldId, '');
      setLoadSuccess(prev => ({ ...prev, [fieldId]: true }));
      setTimeout(() => setLoadSuccess(prev => ({ ...prev, [fieldId]: false })), 3000);
    } catch (error) {
      loggerService.error(`FETCH_OPTIONS_ERROR_${fieldId}`, error);
      const msg = errorUtils.parse(error);
      setLoadError(prev => ({ ...prev, [fieldId]: true }));
      notify(`Failed to load options: ${msg}`, 'error');
    } finally {
      setLoadingAsync(prev => ({ ...prev, [fieldId]: false }));
    }
  }, [editingConfig, notify, handleConfigChange]);

  const handleSave = () => onSave(settings);

  // Prioritization Handlers
  const toggleSourceActive = (id, enabled) => {
    setSettings(prev => {
      let nextIds = [...prev.activeSourceConfigIds];
      if (enabled) {
        if (!nextIds.includes(id)) nextIds.push(id);
      } else {
        nextIds = nextIds.filter(activeId => activeId !== id);
      }
      return { ...prev, activeSourceConfigIds: nextIds };
    });
  };

  const moveSource = (index, direction) => {
    setSettings(prev => {
      const nextIds = [...prev.activeSourceConfigIds];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextIds.length) return prev;
      
      const temp = nextIds[index];
      nextIds[index] = nextIds[targetIndex];
      nextIds[targetIndex] = temp;
      
      return { ...prev, activeSourceConfigIds: nextIds };
    });
  };

  const renderField = (field, data, onChange) => {
    if (!data) return null;
    const value = data[field.id] ?? field.default ?? '';
    switch (field.type) {
      case 'password':
      case 'text':
      case 'number':
        return <input type={field.type} id={field.id} value={value} placeholder={field.placeholder || ''} onChange={(e) => onChange(field.id, field.type === 'number' ? parseInt(e.target.value, 10) : e.target.value)} />;
      case 'textarea':
        return <textarea id={field.id} rows="6" value={value} placeholder={field.placeholder || ''} onChange={(e) => onChange(field.id, e.target.value)} />;
      case 'range':
        return (
          <div className="range-field-wrapper">
            <div className="range-group">
              <input type="range" id={field.id} min={field.min} max={field.max} step={field.step} value={value} onChange={(e) => onChange(field.id, parseFloat(e.target.value))} />
              <span className="range-value">{value}</span>
            </div>
            {field.getDisplayValue && <small className="field-note">{field.getDisplayValue(value)}</small>}
          </div>
        );
      case 'select':
        return (
          <select id={field.id} value={value} onChange={(e) => onChange(field.id, e.target.value)}>
            {(field.options || []).map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
          </select>
        );
      case 'async-select':
      case 'async-creatable': {
        const isSLoading = loadingAsync[field.id];
        const isSSuccess = loadSuccess[field.id];
        const isSError = loadError[field.id];
        const options = asyncOptions[field.id] || (value ? [value] : []);
        return (
          <div className="async-field-wrapper">
            <div className="async-select-group">
              {field.type === 'async-select' ? (
                <select id={field.id} value={value} onChange={(e) => onChange(field.id, e.target.value)}>
                  {options.length > 0 ? options.map(opt => <option key={opt} value={opt}>{opt}</option>) : <option value="">No options loaded</option>}
                </select>
              ) : (
                <>
                  <input type="text" id={field.id} list={`${field.id}-suggestions`} value={value} autoComplete="off" onChange={(e) => onChange(field.id, e.target.value)} />
                  <datalist id={`${field.id}-suggestions`}>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</datalist>
                </>
              )}
              <button className={`fetch-button ${isSSuccess ? 'success' : ''} ${isSError ? 'error' : ''}`} onClick={() => fetchAsyncOptions(field.id, field.fetchOptions)} disabled={isSLoading}>
                {isSLoading ? 'Loading...' : (isSSuccess ? '✓ Options Loaded' : (isSError ? '⚠ Discovery Failed' : 'Load Options'))}
              </button>
            </div>
            {isSError && field.type === 'async-creatable' && <small className="field-note error">Discovery failed. You can still enter a value manually.</small>}
          </div>
        );
      }
      case 'checkbox':
        return (
          <div className="checkbox-group">
            <input type="checkbox" id={field.id} checked={!!value} onChange={(e) => onChange(field.id, e.target.checked)} />
            <label htmlFor={field.id}>{field.label}</label>
          </div>
        );
      default: return <span>Unknown field type: {field.type}</span>;
    }
  };

  const hasAIConfigs = Object.keys(settings.configs).length > 0;
  const hasSourceConfigs = Object.keys(settings.sourceConfigs).length > 0;

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>Settings</h1>
        <div className="header-actions">
          <button onClick={handleSave} className="save-button">Save Settings</button>
          <button onClick={onBack} className="back-button">Back</button>
        </div>
      </header>
      
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <nav className="settings-menu">
            <button className={`menu-item ${activePage === 'General' ? 'active' : ''}`} onClick={() => { setActivePage('General'); setSubView('list'); }}>General</button>
            <button className={`menu-item ${activePage === 'AI Configurations' ? 'active' : ''}`} onClick={() => { setActivePage('AI Configurations'); setSubView('list'); }}>AI Configurations</button>
            <button className={`menu-item ${activePage === 'Sources' ? 'active' : ''}`} onClick={() => { setActivePage('Sources'); setSubView('list'); }}>Sources</button>
          </nav>
          <div className="sidebar-footer">
            <span className="version-tag">Version 2.0-dev</span>
          </div>
        </aside>

        <main className="settings-main-content">
          <div className="settings-page">
            <h2 className="page-title">{activePage}</h2>
            
            <div className="settings-form">
              {activePage === 'General' && (
                <>
                  <div className="form-group">
                    <label htmlFor="active-config-selector">Active Analyzer Configuration</label>
                    {hasAIConfigs ? (
                      <select id="active-config-selector" value={settings.activeConfigId || ''} onChange={(e) => handleGlobalChange('activeConfigId', e.target.value)}>
                        {!settings.activeConfigId && <option value="">-- Select Configuration --</option>}
                        {Object.values(settings.configs).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <small className="field-note">No AI configurations defined. Create one in the AI Configurations tab.</small>
                    )}
                  </div>

                  <hr className="settings-divider" />

                  <div className="form-group">
                    <div className="checkbox-group">
                      <input type="checkbox" id="enable-pre-analysis" checked={settings.enablePreAnalysis} onChange={(e) => handleGlobalChange('enablePreAnalysis', e.target.checked)} />
                      <label htmlFor="enable-pre-analysis">Enable AI Pre-Analysis</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="active-preprocessor-selector">Pre-Processor AI Configuration</label>
                    <select id="active-preprocessor-selector" value={settings.activePreProcessorConfigId || ''} disabled={!settings.enablePreAnalysis || !hasAIConfigs} onChange={(e) => handleGlobalChange('activePreProcessorConfigId', e.target.value)}>
                      {!settings.activePreProcessorConfigId && <option value="">-- Select Configuration --</option>}
                      {Object.values(settings.configs).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!settings.enablePreAnalysis && (
                      <small className="field-note">Activate pre-analysis to select a configuration.</small>
                    )}
                    {settings.enablePreAnalysis && !hasAIConfigs && (
                      <small className="field-note">No configurations available. Create one in the AI Configurations tab.</small>
                    )}
                  </div>

                  <hr className="settings-divider" />

                  <div className="form-group">
                    <div className="checkbox-group">
                      <input type="checkbox" id="enable-post-analysis" checked={settings.enablePostAnalysis} onChange={(e) => handleGlobalChange('enablePostAnalysis', e.target.checked)} />
                      <label htmlFor="enable-post-analysis">Enable AI Post-Analysis Verification</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="active-postprocessor-selector">Post-Analysis AI Configuration</label>
                    <select id="active-postprocessor-selector" value={settings.activePostProcessorConfigId || ''} disabled={!settings.enablePostAnalysis || !hasAIConfigs} onChange={(e) => handleGlobalChange('activePostProcessorConfigId', e.target.value)}>
                      {!settings.activePostProcessorConfigId && <option value="">-- Select Configuration --</option>}
                      {Object.values(settings.configs).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!settings.enablePostAnalysis && (
                      <small className="field-note">Activate post-analysis to select a configuration.</small>
                    )}
                    {settings.enablePostAnalysis && !hasAIConfigs && (
                      <small className="field-note">No configurations available. Create one in the AI Configurations tab.</small>
                    )}
                  </div>

                  <hr className="settings-divider" />
                  
                  <div className="form-group">
                    <label>Active Sources (Sorted by Priority)</label>
                    <div className="source-priority-manager">
                      <div className="source-list active-sources">
                        {settings.activeSourceConfigIds.map((id, index) => {
                          const config = settings.sourceConfigs[id];
                          if (!config) return null;
                          return (
                            <div key={id} className="priority-item">
                              <input 
                                type="checkbox" 
                                checked={true} 
                                onChange={() => toggleSourceActive(id, false)}
                              />
                              <span className="priority-label">{config.name}</span>
                              <div className="priority-actions">
                                <button disabled={index === 0} onClick={() => moveSource(index, -1)}>↑</button>
                                <button disabled={index === settings.activeSourceConfigIds.length - 1} onClick={() => moveSource(index, 1)}>↓</button>
                              </div>
                            </div>
                          );
                        })}
                        {settings.activeSourceConfigIds.length === 0 && (
                          <p className="empty-note">No active sources. AI will use its internal knowledge only.</p>
                        )}
                      </div>

                      {Object.values(settings.sourceConfigs).filter(c => !settings.activeSourceConfigIds.includes(c.id)).length > 0 && (
                        <div className="source-list inactive-sources">
                          <label className="sub-label">Available Sources</label>
                          {Object.values(settings.sourceConfigs)
                            .filter(c => !settings.activeSourceConfigIds.includes(c.id))
                            .map(config => (
                              <div key={config.id} className="priority-item disabled">
                                <input 
                                  type="checkbox" 
                                  checked={false} 
                                  onChange={() => toggleSourceActive(config.id, true)}
                                />
                                <span className="priority-label">{config.name}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="checkbox-group" style={{ marginTop: '15px' }}>
                      <input type="checkbox" id="include-sources" checked={settings.includeSourcesInAnswers} onChange={(e) => handleGlobalChange('includeSourcesInAnswers', e.target.checked)} />
                      <label htmlFor="include-sources">Include Source Links in Answers</label>
                    </div>
                  </div>

                  <hr className="settings-divider" />
                  
                  <div className="form-group">
                    <label htmlFor="response-language">Response Language</label>
                    <select id="response-language" value={settings.responseLanguage} onChange={(e) => handleGlobalChange('responseLanguage', e.target.value)}>
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                </>
              )}

              {activePage === 'AI Configurations' && subView === 'list' && (
                <div className="config-list-view">
                  <div className="config-manager-header">
                    <p>Manage your AI presets for different models and tasks.</p>
                    <button className="add-config-button" onClick={handleCreateAIConfig}>+ Create New</button>
                  </div>
                  <table className="config-table">
                    <thead><tr><th>Name</th><th>Provider</th><th>Actions</th></tr></thead>
                    <tbody>
                      {Object.values(settings.configs).map(config => (
                        <tr key={config.id}>
                          <td className="config-name-cell">{config.name}</td>
                          <td>{getProviderClass(config.providerId).name}</td>
                          <td className="config-actions-cell">
                            <button className="edit-btn" onClick={() => { setEditingConfigId(config.id); setSubView('edit'); }}>Edit</button>
                            <button className="delete-btn" onClick={() => {
                              const { [config.id]: _, ...rem } = settings.configs;
                              setSettings(prev => ({ ...prev, configs: rem, activeConfigId: config.id === prev.activeConfigId ? (Object.keys(rem)[0] || null) : prev.activeConfigId }));
                            }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                      {!hasAIConfigs && <tr><td colSpan="3" className="empty-page-note">No AI configurations defined.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {activePage === 'AI Configurations' && subView === 'edit' && editingConfig && (
                <>
                  <button className="back-link-btn" onClick={() => setSubView('list')}>← Back to List</button>
                  <div className="form-group"><label>Configuration Name</label><input type="text" value={editingConfig.name} onChange={(e) => handleConfigChange('name', e.target.value)} /></div>
                  <div className="form-group"><label>AI Provider</label><select value={editingConfig.providerId} onChange={(e) => handleConfigChange('providerId', e.target.value)}>{AVAILABLE_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  {aiSchema.map(field => (
                    <div className="form-group" key={field.id}>
                      <div className="label-with-info"><label>{field.label}</label>{field.showPreviewIcon && previewContent && <InfoIcon onClick={() => setShowFullInstructions(true)} />}</div>
                      {renderField(field, editingConfig, handleConfigChange)}
                    </div>
                  ))}
                  <div className="form-group test-connection-group">
                    <button onClick={handleTestConnection} className="test-button" disabled={testStatus?.type === 'testing'}>{testStatus?.type === 'testing' ? 'Testing...' : 'Test Connection'}</button>
                    {testStatus && <div className={`test-status ${testStatus.type}`}>{testStatus.message}</div>}
                  </div>
                </>
              )}

              {activePage === 'Sources' && subView === 'list' && (
                <div className="config-list-view">
                  <div className="config-manager-header">
                    <p>Manage your documentation source definitions.</p>
                    <button className="add-config-button" onClick={handleCreateSourceConfig}>+ Create New</button>
                  </div>
                  <table className="config-table">
                    <thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
                    <tbody>
                      {Object.values(settings.sourceConfigs).map(source => (
                        <tr key={source.id}>
                          <td className="config-name-cell">{source.name}</td>
                          <td>{getSourceProviderClass(source.providerId).name}</td>
                          <td className="config-actions-cell">
                            <button className="edit-btn" onClick={() => { setEditingSourceId(source.id); setSubView('edit'); }}>Edit</button>
                            <button className="delete-btn" onClick={() => {
                              const { [source.id]: _, ...rem } = settings.sourceConfigs;
                              setSettings(prev => ({ 
                                ...prev, 
                                sourceConfigs: rem, 
                                activeSourceConfigIds: prev.activeSourceConfigIds.filter(id => id !== source.id) 
                              }));
                            }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                      {!hasSourceConfigs && <tr><td colSpan="3" className="empty-page-note">No source definitions defined.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {activePage === 'Sources' && subView === 'edit' && editingSource && (
                <>
                  <button className="back-link-btn" onClick={() => setSubView('list')}>← Back to List</button>
                  <div className="form-group"><label>Source Name</label><input type="text" value={editingSource.name} onChange={(e) => handleSourceChange('name', e.target.value)} /></div>
                  <div className="form-group"><label>Source Type</label><select value={editingSource.providerId} onChange={(e) => handleSourceChange('providerId', e.target.value)}>{AVAILABLE_SOURCE_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  {sourceSchema.map(field => (
                    <div className="form-group" key={field.id}><label>{field.label}</label>{renderField(field, editingSource, handleSourceChange)}</div>
                  ))}
                  
                  {SourceProviderClass && SourceProviderClass.testConnection && (
                    <div className="form-group test-connection-group">
                      <button 
                        onClick={handleTestConnection} 
                        className="test-button" 
                        disabled={testStatus?.type === 'testing'}
                      >
                        {testStatus?.type === 'testing' ? 'Testing...' : 'Test Connection'}
                      </button>
                      {testStatus && (
                        <div className={`test-status ${testStatus.type}`}>
                          {testStatus.message}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {showFullInstructions && (
        <div className="modal-overlay" onClick={() => setShowFullInstructions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Provider Preview</h2><button className="close-button" onClick={() => setShowFullInstructions(false)}>&times;</button></div>
            <div className="modal-body"><p>Preview of the generated context:</p><pre className="full-instructions-preview">{previewContent}</pre></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
