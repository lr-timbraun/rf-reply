import { useState, useCallback, useMemo } from 'react';
import CryptoJS from 'crypto-js';
import { getSourceProviderClass } from '../services/sources';

const SECURE_STORAGE_KEY = 'rfp-analyzer-settings';

const DEFAULT_AI_ID = 'default-config';

const DEFAULT_SETTINGS = {
  activeConfigId: null,
  activePreProcessorConfigId: null,
  activePostProcessorConfigId: null,
  activeSourceConfigIds: [],
  enablePreAnalysis: true,
  enablePostAnalysis: false,
  includeSourcesInAnswers: true,
  configs: {},
  sourceConfigs: {},
  responseLanguage: 'English'
};

/**
 * Hook to manage multiple AI configurations with user-provided Master Passphrase security.
 */
export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [masterKey, setMasterKey] = useState(null);
  const [error, setError] = useState(null);

  // Check if we have a vault on disk
  const hasVault = !!localStorage.getItem(SECURE_STORAGE_KEY);

  /**
   * Unlocks the settings vault using a passphrase.
   * If no vault exists, this initializes a new one.
   */
  const unlock = useCallback((passphrase) => {
    if (!passphrase) {
      setError('Passphrase is required.');
      return false;
    }

    try {
      const saved = localStorage.getItem(SECURE_STORAGE_KEY);
      
      if (saved) {
        // Try to decrypt existing vault
        const bytes = CryptoJS.AES.decrypt(saved, passphrase);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!decrypted) {
          setError('Invalid master passphrase.');
          return false;
        }

        setSettings(JSON.parse(decrypted));
        setMasterKey(passphrase);
        setError(null);
        return true;
      } else {
        // First time initialization
        setSettings(DEFAULT_SETTINGS);
        setMasterKey(passphrase);
        
        // Save the default state immediately with the new key
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(DEFAULT_SETTINGS), passphrase).toString();
        localStorage.setItem(SECURE_STORAGE_KEY, encrypted);
        
        setError(null);
        return true;
      }
    } catch (e) {
      console.error('Vault unlock error:', e);
      setError('An error occurred while opening the vault.');
      return false;
    }
  }, []);

  const saveSettings = useCallback((newSettings) => {
    if (!masterKey) return false;
    
    setSettings(newSettings);
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(newSettings), masterKey).toString();
      localStorage.setItem(SECURE_STORAGE_KEY, encrypted);
      return true;
    } catch (error) {
      console.error('Secure save error:', error);
      return false;
    }
  }, [masterKey]);

  const lock = useCallback(() => {
    setSettings(null);
    setMasterKey(null);
    setError(null);
  }, []);

  /**
   * Helper to merge an AI config with prioritized active sources and global settings.
   */
  const _mergeWithGlobals = useCallback((configId, currentSettings) => {
    if (!currentSettings || !configId || !currentSettings.configs[configId]) return null;

    const config = currentSettings.configs[configId];
    
    const contexts = currentSettings.activeSourceConfigIds
      .map(id => currentSettings.sourceConfigs[id])
      .filter(Boolean)
      .map(sourceConfig => {
        const SourceProvider = getSourceProviderClass(sourceConfig.providerId);
        return SourceProvider.formatContext(sourceConfig);
      })
      .filter(ctx => ctx.trim());

    const combinedContext = contexts.length > 0 
      ? `You have access to the following prioritized knowledge bases:\n${contexts.map((ctx, i) => `${i+1}. ${ctx}`).join('\n')}`
      : '';

    return {
      ...config,
      responseLanguage: currentSettings.responseLanguage,
      docSource: combinedContext,
      enablePreAnalysis: currentSettings.enablePreAnalysis,
      enablePostAnalysis: currentSettings.enablePostAnalysis,
      includeSourcesInAnswers: currentSettings.includeSourcesInAnswers ?? true
    };
  }, []);

  const apiSettings = useMemo(() => 
    _mergeWithGlobals(settings?.activeConfigId, settings), 
    [settings, _mergeWithGlobals]
  );

  const preProcessorSettings = useMemo(() => 
    _mergeWithGlobals(settings?.activePreProcessorConfigId, settings), 
    [settings, _mergeWithGlobals]
  );

  const postProcessorSettings = useMemo(() => 
    _mergeWithGlobals(settings?.activePostProcessorConfigId, settings), 
    [settings, _mergeWithGlobals]
  );

  return { 
    settings, 
    apiSettings,
    preProcessorSettings,
    postProcessorSettings,
    saveSettings,
    isLocked: !masterKey,
    hasVault,
    unlock,
    lock,
    error
  };
};
