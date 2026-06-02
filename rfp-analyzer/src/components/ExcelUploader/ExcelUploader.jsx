import React, { useState, useMemo } from 'react';
import TabsSelectionModal from '../TabsSelectionModal/TabsSelectionModal';
import DataTable from '../DataTable/DataTable';
import { excelService } from '../../services/excelService';
import { getProviderClass } from '../../services/providers';
import { loggerService } from '../../services/loggerService';
import { useNotify } from '../../hooks/useNotify';
import './ExcelUploader.css';

const ExcelUploader = ({ apiSettings, preProcessorSettings, postProcessorSettings }) => {
  const [workbook, setWorkbook] = useState(null);
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [tabData, setTabData] = useState({});
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { notify } = useNotify();

  // Primary AI Processor for generating responses
  const processor = useMemo(() => {
    if (apiSettings && apiSettings.providerId) {
      const ProviderClass = getProviderClass(apiSettings.providerId);
      return new ProviderClass(apiSettings);
    }
    return null;
  }, [apiSettings]);

  // Dedicated AI Processor for workbook analysis (can be different model/provider)
  const preProcessor = useMemo(() => {
    if (preProcessorSettings && preProcessorSettings.providerId) {
      const ProviderClass = getProviderClass(preProcessorSettings.providerId);
      return new ProviderClass(preProcessorSettings);
    }
    return null;
  }, [preProcessorSettings]);

  const loadExcelFile = (file) => {
    loggerService.debugLog('FILE_SELECTED', { name: file.name, size: file.size, type: file.type });
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = await excelService.loadWorkbook(evt.target.result);
        setWorkbook(wb);
        const sheets = wb.worksheets.map(ws => ws.name);
        setSheetNames(sheets);
        loggerService.debugLog('WORKBOOK_LOADED', { sheetCount: sheets.length, sheets });

        const extracted = excelService.extractTabsData(wb, sheets);
        setTabData(extracted);
        loggerService.debugLog('DATA_EXTRACTED', { tabs: Object.keys(extracted) });
      } catch (err) {
        loggerService.error("EXCEL_LOAD_FAILED", err);
        if (notify) notify("Failed to load Excel file.", "error");
        handleReset();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      loadExcelFile(file);
    }
  };

  // Drag and Drop Event Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'xlsx' || ext === 'xlsm') {
        loadExcelFile(file);
      } else {
        if (notify) notify("Invalid file type. Please upload a valid .xlsx or .xlsm file.", "error");
      }
    }
  };

  const handleProceed = async () => {
    if (!workbook) return;

    // Optional AI Pre-Analysis using the dedicated preProcessor
    if (preProcessorSettings && preProcessorSettings.enablePreAnalysis && preProcessor && preProcessor.analyzeWorkbook) {
      setIsAnalyzing(true);
      setAnalysisError(null);
      loggerService.debugLog('ANALYSIS_START', 'Initiating AI workbook pre-analysis');
      try {
        const result = await preProcessor.analyzeWorkbook(tabData);
        if (result && result.usage) {
          console.log(`[ANALYSIS-USAGE] Prompt: ${result.usage.promptTokenCount}, Response: ${result.usage.responseTokenCount}, Total: ${result.usage.totalTokenCount}`);
        }
        setRecommendations(result);
        loggerService.debugLog('ANALYSIS_SUCCESS', result);
        setShowModal(true); // Proceed to sheet selection modal on success
      } catch (anaErr) {
        loggerService.error("ANALYSIS_FAILED", anaErr);
        setAnalysisError(anaErr.message || "Unknown error during pre-processing.");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setShowModal(true); // Proceed manually if disabled
    }
  };

  const handleTabsSelect = (tabs) => {
    setSelectedTabs(tabs);
    setShowModal(false);
    setCurrentTabIndex(0);
  };

  const handleNextTab = () => {
    if (currentTabIndex < selectedTabs.length - 1) {
      setCurrentTabIndex(prev => prev + 1);
    } else {
      // Final tab: Save before resetting
      excelService.saveWorkbook(workbook, fileName);
      handleReset();
    }
  };

  const handleReset = () => {
    setWorkbook(null);
    setFileName('');
    setSheetNames([]);
    setSelectedTabs([]);
    setRecommendations(null);
    setCurrentTabIndex(0);
  };

  const handleCellUpdate = (tabName, rowIndex, colIndex, newValue) => {
    if (!workbook) return;
    excelService.updateCellValue(workbook, tabName, rowIndex, colIndex, newValue);
  };

  const activeTab = selectedTabs[currentTabIndex];

  return (
    <div className="uploader-container">
      {!workbook && !isAnalyzing && (
        <div 
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label htmlFor="excel-file" className="file-label">
            <div className="upload-icon">📄</div>
            <span>Drag & Drop or Click to upload RFP Excel file</span>
            <small>Supported: .xlsx, .xlsm</small>
          </label>
          <input
            id="excel-file"
            type="file"
            accept=".xlsx, .xlsm"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {workbook && !activeTab && !showModal && !isAnalyzing && (
        <div className="file-ready-card">
          <div className="file-ready-icon">📊</div>
          <h3>File Loaded Successfully</h3>
          <div className="file-details">
            <p>Name: <strong>{fileName}</strong></p>
            <p>Sheets: <strong>{sheetNames.length}</strong></p>
          </div>
          <p className="file-instruction">
            {preProcessorSettings?.enablePreAnalysis 
              ? "Click GO! to let the AI analyze the workbook structure and recommend optimal questionnaire mappings."
              : "Click GO! to select which sheets you want to configure and answer."}
          </p>
          <div className="file-ready-actions">
            <button className="ready-btn clear-btn" onClick={handleReset}>Clear File</button>
            <button className="ready-btn go-btn" onClick={handleProceed}>GO!</button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="analysis-progress">
              <div className="spinner"></div>
              <h2>Analyzing Workbook Structure...</h2>
              <p>The AI is identifying requirements and mapping columns.</p>
            </div>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="analysis-error-note">
              <h3>Pre-Analysis Failure</h3>
              <p>{analysisError}</p>
              <button onClick={() => setShowModal(true)} className="confirm-button">Proceed Manually</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <TabsSelectionModal
          tabs={sheetNames}
          initialSelections={recommendations?.recommendedTabs || []}
          onConfirm={handleTabsSelect}
          onCancel={handleReset}
        />
      )}

      {activeTab && workbook && (
        <DataTable
          tabName={activeTab}
          data={tabData[activeTab]}
          apiSettings={apiSettings}
          processor={processor}
          recommendation={(() => {
            if (!recommendations?.tabConfigs) return null;
            // Case-insensitive fuzzy match for tab names
            const key = Object.keys(recommendations.tabConfigs).find(k => 
              k.trim().toLowerCase() === activeTab.trim().toLowerCase()
            );
            return key ? recommendations.tabConfigs[key] : null;
          })()}
          onSave={() => excelService.saveWorkbook(workbook, fileName)}
          onNext={handleNextTab}
          onCancel={handleReset}
          isLastTab={currentTabIndex === selectedTabs.length - 1}
          onCellUpdate={handleCellUpdate}
          postProcessorSettings={postProcessorSettings}
        />
      )}
    </div>
  );
};

export default ExcelUploader;
