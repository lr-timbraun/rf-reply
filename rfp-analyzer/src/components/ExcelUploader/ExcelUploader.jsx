import React, { useState } from 'react';
import TabsSelectionModal from '../TabsSelectionModal/TabsSelectionModal';
import DataTable from '../DataTable/DataTable';
import { excelService } from '../../services/excelService';

const ExcelUploader = ({ apiSettings }) => {
  const [workbook, setWorkbook] = useState(null);
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [tabData, setTabData] = useState({});
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const wb = await excelService.loadWorkbook(evt.target.result);
          setWorkbook(wb);
          setSheetNames(wb.worksheets.map(ws => ws.name));
          setShowModal(true);
        } catch (err) {
          console.error("Excel load error:", err);
          alert("Failed to load Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleTabSelection = (tabs) => {
    const data = excelService.extractTabsData(workbook, tabs);
    setTabData(data);
    setSelectedTabs(tabs);
    setCurrentTabIndex(0);
    setShowModal(false);
  };

  const handleReset = () => {
    setWorkbook(null);
    setFileName('');
    setSheetNames([]);
    setSelectedTabs([]);
    setTabData({});
    setCurrentTabIndex(0);
  };

  const handleNextTab = () => {
    if (currentTabIndex < selectedTabs.length - 1) {
      setCurrentTabIndex(currentTabIndex + 1);
    } else {
      handleDownload();
    }
  };

  const handleCellUpdate = (absIndex, worksheetColIndex, newValue) => {
    if (!workbook) return;
    excelService.updateCell(workbook, currentTabName, absIndex, worksheetColIndex, newValue);
  };

  const handleDownload = async () => {
    if (!workbook) return;
    try {
      const blob = await excelService.generateDownloadBlob(workbook);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      anchor.download = `${baseName}_analyzed.xlsx`;
      
      anchor.click();
      window.URL.revokeObjectURL(url);
      alert('Download complete! Returning to upload screen.');
      handleReset();
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating Excel file.');
    }
  };

  const currentTabName = selectedTabs[currentTabIndex];
  const currentData = tabData[currentTabName];

  return (
    <div>
      {!currentData && (
        <>
          <p>Upload an Excel file to get started.</p>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </>
      )}
      {showModal && (
        <TabsSelectionModal
          tabs={sheetNames}
          onConfirm={handleTabSelection}
          onCancel={() => setShowModal(false)}
        />
      )}
      {currentData && (
        <DataTable
          tabName={currentTabName}
          data={currentData}
          apiSettings={apiSettings}
          onNext={handleNextTab}
          onCancel={handleReset}
          isLastTab={currentTabIndex === selectedTabs.length - 1}
          onCellUpdate={handleCellUpdate}
        />
      )}
    </div>
  );
};

export default ExcelUploader;
