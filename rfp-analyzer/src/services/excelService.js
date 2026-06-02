import ExcelJS from 'exceljs';

/**
 * Service for handling Excel file operations.
 */
export const excelService = {
  /**
   * Loads a workbook from a file buffer.
   */
  loadWorkbook: async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return workbook;
  },

  /**
   * Internal helper to extract a primitive value from an ExcelJS cell.
   * Handles formulas, rich text, and other complex objects.
   */
  _extractValue: (cellValue) => {
    if (cellValue === null || cellValue === undefined) return '';
    
    // Handle complex objects with the safety pattern
    if (typeof cellValue === 'object') {
      // Handle Formula objects: { formula: '...', result: '...' }
      if ('result' in cellValue) {
        return cellValue.result ?? '';
      }
      
      // Handle Rich Text objects: { richText: [...] }
      if (cellValue.richText && Array.isArray(cellValue.richText)) {
        return cellValue.richText.map(rt => rt.text || '').join('');
      }

      // Handle other objects (except Dates)
      if (!(cellValue instanceof Date)) {
        try {
          return JSON.stringify(cellValue);
        } catch (error) { // eslint-disable-line no-unused-vars
          return String(cellValue);
        }
      }
    }

    return cellValue;
  },

  /**
   * Extracts data from specified worksheets.
   */
  extractTabsData: (workbook, tabNames) => {
    const data = {};
    tabNames.forEach(tabName => {
      const worksheet = workbook.getWorksheet(tabName);
      const currentTabData = [];
      const maxCol = worksheet.columnCount;
      
      for (let i = 1; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const rowValues = [];
        if (row) {
          for (let j = 1; j <= maxCol; j++) {
            rowValues[j] = excelService._extractValue(row.getCell(j).value);
          }
        }
        currentTabData.push({
          values: rowValues,
          absIndex: i
        });
      }
      data[tabName] = currentTabData;
    });
    return data;
  },

  /**
   * Updates a specific cell in a worksheet.
   */
  updateCellValue: (workbook, tabName, rowIndex, colIndex, value) => {
    const worksheet = workbook.getWorksheet(tabName);
    if (!worksheet) return;
    const row = worksheet.getRow(rowIndex);
    row.getCell(colIndex).value = value;
    row.commit();
  },

  /**
   * Generates a downloadable blob from the workbook.
   */
  generateDownloadBlob: async (workbook) => {
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  },

  /**
   * High-level method to trigger a browser download of the current workbook state.
   */
  saveWorkbook: async (workbook, fileName = 'RFP_Analysis.xlsx') => {
    try {
      const blob = await excelService.generateDownloadBlob(workbook);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.endsWith('.xlsx') || fileName.endsWith('.xlsm') ? fileName : `${fileName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Download failed:', e);
      return false;
    }
  },

  /**
   * Heuristic to find the likely header row index.
   * Scans first 20 rows for the first dense row.
   */
  detectHeaderIndex: (rows) => {
    if (!rows || rows.length === 0) return 0;
    const scanLimit = Math.min(rows.length, 20);
    let maxFilled = 0;
    
    // Pass 1: Find max filled count
    for (let i = 0; i < scanLimit; i++) {
      const rowValues = rows[i].values;
      const filled = rowValues ? rowValues.filter(v => v !== null && v !== undefined && v !== '').length : 0;
      if (filled > maxFilled) maxFilled = filled;
    }
    
    // Pass 2: Find first row that meets 80% of max density
    for (let i = 0; i < scanLimit; i++) {
      const rowValues = rows[i].values;
      const filled = rowValues ? rowValues.filter(v => v !== null && v !== undefined && v !== '').length : 0;
      if (filled >= maxFilled * 0.8 && filled > 1) {
        return i;
      }
    }
    return 0;
  },

  /**
   * Processes raw rows into structured header and data objects.
   */
  getStructuredData: (rows, headerRowIndex) => {
    if (!rows || rows.length === 0) return { header: [], dataRows: [], colOffset: 1 };
    
    const safeHeaderIndex = Math.min(headerRowIndex, rows.length - 1);
    const headerRow = rows[safeHeaderIndex];
    
    let maxCols = 0;
    rows.forEach(row => { 
      if (row.values && row.values.length > maxCols) maxCols = row.values.length; 
    });

    const rawHeader = [];
    for (let j = 1; j < maxCols; j++) {
      rawHeader.push(headerRow.values[j] || '');
    }

    let currentHeader = [...rawHeader];
    let offset = 1;
    if (currentHeader.length > 0 && !currentHeader[0]) {
      currentHeader.shift();
      offset = 2;
    }

    const dataRows = rows.slice(safeHeaderIndex + 1).map(row => {
      const denseRow = [];
      const rowValues = row.values || [];
      for (let j = offset; j < maxCols; j++) {
        denseRow.push(rowValues[j] !== null && rowValues[j] !== undefined ? rowValues[j] : '');
      }
      return { values: denseRow, absIndex: row.absIndex };
    });

    return { header: currentHeader, dataRows, colOffset: offset };
  }
};
