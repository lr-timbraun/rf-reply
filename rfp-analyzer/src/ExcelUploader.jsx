import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import TabsSelectionModal from './TabsSelectionModal';
import DataTable from './DataTable';

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
        const buffer = evt.target.result;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        setWorkbook(wb);
        setSheetNames(wb.worksheets.map(ws => ws.name));
        setShowModal(true);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleTabSelection = (tabs) => {
    const data = {};
    tabs.forEach(tabName => {
      const worksheet = workbook.getWorksheet(tabName);
      const currentTabData = [];
      const maxCol = worksheet.columnCount;
      
      // Capture all rows up to the last row with data
      for (let i = 1; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const rowValues = [];
        // ExcelJS is 1-indexed for cells. We populate rowValues[1...maxCol]
        // to match ExcelJS's internal sparse array structure.
        if (row) {
          for (let j = 1; j <= maxCol; j++) {
            rowValues[j] = row.getCell(j).value;
          }
        }
        currentTabData.push({
          values: rowValues,
          absIndex: i
        });
      }
      data[tabName] = currentTabData;
    });
    setSelectedTabs(tabs);
    setTabData(data);
    setCurrentTabIndex(0);
    setShowModal(false);
  };

  const handleCancel = () => {
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
    const worksheet = workbook.getWorksheet(currentTabName);
    const worksheetRow = worksheet.getRow(absIndex);
    // worksheetColIndex is now the absolute 1-based index of the column
    worksheetRow.getCell(worksheetColIndex).value = newValue;
    worksheetRow.commit();
  };

  const handleDownload = async () => {
    if (!workbook) return;
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      
      const dotIndex = fileName.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
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
          onCancel={handleCancel}
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
