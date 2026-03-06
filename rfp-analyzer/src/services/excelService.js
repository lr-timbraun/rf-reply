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
    return data;
  },

  /**
   * Updates a specific cell in a worksheet.
   */
  updateCell: (workbook, tabName, rowIndex, colIndex, value) => {
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
  }
};
