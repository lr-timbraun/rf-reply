import React, { useState, useMemo } from 'react';
import TabsSelectionModal from '../TabsSelectionModal/TabsSelectionModal';
import DataTable from '../DataTable/DataTable';
import { excelService } from '../../services/excelService';
import { getProviderClass } from '../../services/providers';
import { loggerService } from '../../loggerService';
import { useNotify } from '../../hooks/useNotify';

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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
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

          // Optional AI Pre-Analysis using the dedicated preProcessor
          if (preProcessorSettings && preProcessorSettings.enablePreAnalysis && preProcessor && preProcessor.analyzeWorkbook) {
            setIsAnalyzing(true);
            setAnalysisError(null);
            loggerService.debugLog('ANALYSIS_START', 'Initiating AI workbook pre-analysis');
            try {
              const recs = await preProcessor.analyzeWorkbook(extracted);
              setRecommendations(recs);
              loggerService.debugLog('ANALYSIS_SUCCESS', recs);
              setShowModal(true); // Proceed automatically on success
            } catch (anaErr) {
              console.error("Analysis failed:", anaErr);
              loggerService.debugLog('ANALYSIS_FAILED', anaErr.message);
              setAnalysisError(anaErr.message || "Unknown error during pre-processing.");
            } finally {
              setIsAnalyzing(false);
            }
          } else {
            setShowModal(true); // Proceed manually if disabled
          }
        } catch (err) {
          console.error("Excel load error:", err);
          loggerService.debugLog('EXCEL_LOAD_FAILED', err.message);
          if (notify) notify("Failed to load Excel file.", "error");
        }
      };
      reader.readAsArrayBuffer(file);
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
        <div className="upload-area">
          <label htmlFor="excel-file" className="file-label">
            <div className="upload-icon">📄</div>
            <span>Click to upload RFP Excel file</span>
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

      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="spinner"></div>
          <h2>Analyzing Workbook Structure...</h2>
          <p>The AI is identifying requirements and mapping columns.</p>
        </div>
      )}

      {analysisError && (
        <div className="analysis-error-note">
          <h3>Pre-Analysis Failure</h3>
          <p>{analysisError}</p>
          <button onClick={() => setShowModal(true)}>Proceed Manually</button>
        </div>
      )}

      {showModal && (
        <TabsSelectionModal
          sheetNames={sheetNames}
          onSelect={handleTabsSelect}
          onCancel={handleReset}
          recommendations={recommendations}
        />
      )}

      {activeTab && workbook && (
        <DataTable
          tabName={activeTab}
          initialData={tabData[activeTab]}
          processor={processor}
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
