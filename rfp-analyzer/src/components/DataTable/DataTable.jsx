import React, { useEffect, useMemo, useRef } from 'react';
import { createAIService } from '../../services/aiService';
import { processingOrchestrator } from '../../services/processingOrchestrator';
import { useRFPTable } from '../../hooks/useRFPTable';
import { getMoreInfoLabel } from '../../utils/promptUtils';
import ResponseCell from './ResponseCell';
import './DataTable.css';

const DataTable = ({ tabName, data, apiSettings, onNext, onCancel, isLastTab, onCellUpdate }) => {
  const [headerRowIndex, setHeaderRowIndex] = React.useState(0);
  const inputRefs = useRef([]);

  // Strategy 2 Heuristic: Find first dense row in first 20
  useEffect(() => {
    if (!data || data.length === 0) return;
    const scanLimit = Math.min(data.length, 20);
    let maxFilled = 0;
    for (let i = 0; i < scanLimit; i++) {
      const rowValues = data[i].values;
      const filled = rowValues ? rowValues.filter(v => v !== null && v !== undefined && v !== '').length : 0;
      if (filled > maxFilled) maxFilled = filled;
    }
    for (let i = 0; i < scanLimit; i++) {
      const rowValues = data[i].values;
      const filled = rowValues ? rowValues.filter(v => v !== null && v !== undefined && v !== '').length : 0;
      if (filled >= maxFilled * 0.8 && filled > 1) {
        setHeaderRowIndex(i);
        break;
      }
    }
  }, [data]);

  const { header, dataRows, colOffset } = useMemo(() => {
    if (!data || data.length === 0) return { header: [], dataRows: [], colOffset: 1 };
    const safeHeaderIndex = Math.min(headerRowIndex, data.length - 1);
    const headerRow = data[safeHeaderIndex];
    let maxCols = 0;
    data.forEach(row => { if (row.values && row.values.length > maxCols) maxCols = row.values.length; });
    const rawHeader = [];
    for (let j = 1; j < maxCols; j++) rawHeader.push(headerRow.values[j] || '');
    let currentHeader = [...rawHeader];
    let offset = 1;
    if (currentHeader.length > 0 && !currentHeader[0]) { currentHeader.shift(); offset = 2; }
    const currentDataRows = data.slice(safeHeaderIndex + 1).map(row => {
      const denseRow = [];
      const rowValues = row.values || [];
      for (let j = offset; j < maxCols; j++) denseRow.push(rowValues[j] !== null && rowValues[j] !== undefined ? rowValues[j] : '');
      return { values: denseRow, absIndex: row.absIndex };
    });
    return { header: currentHeader, dataRows: currentDataRows, colOffset: offset };
  }, [data, headerRowIndex]);

  const table = useRFPTable(header.length);
  const aiService = useMemo(() => createAIService(apiSettings), [apiSettings]);
  const moreInfoLabel = useMemo(() => getMoreInfoLabel(apiSettings.responseLanguage), [apiSettings.responseLanguage]);

  const handleCellSave = (absIndex, colIndex, newValue) => {
    const cellKey = `${absIndex}-${colIndex}`;
    table.setCellStates(prev => ({
      ...prev,
      [cellKey]: { ...prev[cellKey], text: newValue, excelText: newValue }
    }));
    if (onCellUpdate) onCellUpdate(absIndex, colIndex + colOffset, newValue);
  };

  const handleHeaderClick = (headerText) => {
    if (table.activeInputIndex === null) return;
    const placeholder = `{${headerText}}`;
    const index = table.activeInputIndex;
    const currentVal = table.inputValues[index] || '';
    const cursorPos = table.cursorPositions[index] || 0;
    
    // Insert placeholder at cursor position
    const newVal = `${currentVal.substring(0, cursorPos)}${placeholder}${currentVal.substring(cursorPos)}`;
    
    const newInputValues = [...table.inputValues];
    newInputValues[index] = newVal;
    table.setInputValues(newInputValues);

    const newCursorPos = cursorPos + placeholder.length;
    
    // We need to update the cursor position in state as well
    const newCursorPositions = [...table.cursorPositions];
    newCursorPositions[index] = newCursorPos;
    table.setCursorPositions(newCursorPositions);

    setTimeout(() => {
      const textarea = inputRefs.current[index];
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const applyResultsToTable = (absIndex, results) => {
    results.forEach(res => {
      table.setCellStates(prev => ({ ...prev, [`${absIndex}-${res.colIndex}`]: res }));
      if (onCellUpdate) onCellUpdate(absIndex, res.colIndex + colOffset, res.excelText);
    });
  };

  const handleGoClick = async () => {
    if (!aiService) { alert('API configuration incomplete.'); return; }
    table.setIsProcessing(true);
    const controller = new AbortController();
    table.setAbortController(controller);
    let currentHistory = [...table.chatHistory];

    try {
      for (const row of dataRows) {
        if (controller.signal.aborted) break;
        if (table.skippedRows.has(row.absIndex)) continue;

        const activeCols = table.getActiveCols();
        if (activeCols.length === 0) continue;

        activeCols.forEach(c => table.setCellStates(prev => ({ ...prev, [`${row.absIndex}-${c.colIndex}`]: 'loading' })));

        try {
          const { results, newHistoryEntries } = await processingOrchestrator.processRow({
            row,
            activeCols,
            headers: header,
            currentHistory,
            aiService,
            responseLanguage: apiSettings.responseLanguage,
            abortSignal: controller.signal
          });

          applyResultsToTable(row.absIndex, results);
          currentHistory = [...currentHistory, ...newHistoryEntries].slice(-20);
          table.setChatHistory(currentHistory);
        } catch (rowError) {
          console.error(`Error processing row ${row.absIndex}:`, rowError);
          activeCols.forEach(c => {
            table.setCellStates(prev => ({ 
              ...prev, 
              [`${row.absIndex}-${c.colIndex}`]: { text: 'Error', excelText: 'Error', sources: [] } 
            }));
          });
        }
      }
    } catch (error) {
      console.error("Processing error:", error);
    } finally {
      table.setIsProcessing(false);
      table.setAbortController(null);
    }
  };

  const handleRefreshClick = async (rowIndex, colIndex) => {
    if (!aiService) return;
    const row = dataRows[rowIndex];
    const cellKey = `${row.absIndex}-${colIndex}`;
    table.setCellStates(prev => ({ ...prev, [cellKey]: 'loading' }));

    try {
      const activeCols = [{ colIndex, promptTemplate: table.inputValues[colIndex] }];
      const { results, newHistoryEntries } = await processingOrchestrator.processRow({
        row,
        activeCols,
        headers: header,
        currentHistory: table.chatHistory,
        aiService,
        responseLanguage: apiSettings.responseLanguage
      });

      applyResultsToTable(row.absIndex, results);
      const nextHistory = [...table.chatHistory, ...newHistoryEntries].slice(-20);
      table.setChatHistory(nextHistory);
    } catch (e) {
      console.error("Refresh error:", e);
      table.setCellStates(prev => ({ ...prev, [cellKey]: 'Error' }));
    }
  };

  if (header.length === 0) return <p>No data to display for {tabName}.</p>;

  const metadataRows = data.slice(0, headerRowIndex).map(row => {
    const denseRow = [];
    const maxCols = header.length + colOffset;
    for (let j = colOffset; j < maxCols; j++) denseRow.push(row.values?.[j] || '');
    return { values: denseRow, absIndex: row.absIndex };
  });

  return (
    <div className="table-container">
      <div className="table-header-row">
        <div className="table-title-group">
          <h2>{tabName}</h2>
          <button className="reset-button" onClick={() => table.setChatHistory([])} title="Clear conversation history for this tab">Reset History</button>
        </div>
        
        <div className="table-header-actions">
          <button onClick={onCancel} className="cancel-button">Cancel</button>
          
          <div className="action-button-group">
            {table.isProcessing ? (
              <button className="stop-button" onClick={() => table.abortController?.abort()}>Stop Processing</button>
            ) : (
              <button onClick={handleGoClick} className="go-button">Go!</button>
            )}
            
            <button onClick={onNext} className="next-button">
              {isLastTab ? 'Finish' : 'Next Tab'}
            </button>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th className="skip-column-header"></th>
            {header.map((cell, index) => (
              <th key={index} onClick={() => handleHeaderClick(cell)} className="clickable-header">{cell || `[Col ${index + 1}]`}</th>
            ))}
          </tr>
          <tr>
            <th className="skip-column-header"></th>
            {header.map((_, index) => (
              <th key={index}>
                <textarea
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="header-input"
                  rows="3"
                  placeholder="Enter prompt..."
                  value={table.inputValues[index]}
                  onChange={(e) => {
                    const next = [...table.inputValues];
                    next[index] = e.target.value;
                    table.setInputValues(next);
                  }}
                  onFocus={(e) => {
                    table.setActiveInputIndex(index);
                    const next = [...table.cursorPositions];
                    next[index] = e.target.selectionStart;
                    table.setCursorPositions(next);
                  }}
                  onClick={(e) => {
                    const next = [...table.cursorPositions];
                    next[index] = e.target.selectionStart;
                    table.setCursorPositions(next);
                  }}
                  onKeyUp={(e) => {
                    const next = [...table.cursorPositions];
                    next[index] = e.target.selectionStart;
                    table.setCursorPositions(next);
                  }}
                  onSelect={(e) => {
                    const next = [...table.cursorPositions];
                    next[index] = e.target.selectionStart;
                    table.setCursorPositions(next);
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metadataRows.map((row, idx) => (
            <tr key={`meta-${row.absIndex}`} className="metadata-row">
              <td className="skip-column-cell">
                {row.absIndex <= 10 && <button className="set-header-button" onClick={() => setHeaderRowIndex(idx)}>^</button>}
              </td>
              {row.values.slice(0, header.length).map((cell, i) => <td key={i} className="metadata-cell">{cell}</td>)}
            </tr>
          ))}
          {dataRows.map((row, rowIndex) => (
            <tr key={row.absIndex} className={table.skippedRows.has(row.absIndex) ? 'skipped-row' : ''}>
              <td className="skip-column-cell">
                <div className="row-action-group">
                  <button className="skip-button" onClick={() => table.toggleSkipRow(row.absIndex)}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                  </button>
                  {row.absIndex <= 10 && <button className="set-header-button" onClick={() => setHeaderRowIndex(headerRowIndex + rowIndex + 1)}>^</button>}
                </div>
              </td>
              {row.values.map((cell, cellIndex) => (
                <ResponseCell
                  key={`${row.absIndex}-${cellIndex}`}
                  cellKey={`${row.absIndex}-${cellIndex}`}
                  cellState={table.cellStates[`${row.absIndex}-${cellIndex}`]}
                  initialValue={cell}
                  isProcessing={table.isProcessing}
                  moreInfoLabel={moreInfoLabel}
                  onSave={(val) => handleCellSave(row.absIndex, cellIndex, val)}
                  onRefresh={() => handleRefreshClick(rowIndex, cellIndex)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
