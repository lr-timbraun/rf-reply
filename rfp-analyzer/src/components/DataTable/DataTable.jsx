import React, { useMemo, useRef, useCallback, useState } from 'react';
import { useRFPTable } from '../../hooks/useRFPTable';
import { useRFPProcessor } from '../../hooks/useRFPProcessor';
import { useNotify } from '../../hooks/useNotify';
import { excelService } from '../../services/excelService';
import { getMoreInfoLabel } from '../../utils/promptUtils';
import { getProviderClass } from '../../services/providers';
import TableActions from './TableActions';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import './DataTable.css';

/**
 * Main DataTable component that orchestrates the UI and processing.
 */
const DataTable = ({ 
  tabName, 
  data, 
  apiSettings, 
  processor, 
  recommendation,
  onSave,
  onNext, 
  onCancel, 
  isLastTab, 
  onCellUpdate,
  postProcessorSettings
}) => {
  // Use manual index if set, otherwise fall back to recommendation or detection
  const [manualHeaderIndex, setManualHeaderIndex] = useState(null);
  
  const headerRowIndex = useMemo(() => {
    if (manualHeaderIndex !== null) return manualHeaderIndex;
    if (recommendation?.headerRowIndex !== undefined) return recommendation.headerRowIndex;
    if (data && data.length > 0) return excelService.detectHeaderIndex(data);
    return 0;
  }, [manualHeaderIndex, recommendation, data]);

  const inputRefs = useRef([]);
  const { notify } = useNotify(); // eslint-disable-line no-unused-vars

  const { header, dataRows, colOffset } = useMemo(() => {
    return excelService.getStructuredData(data, headerRowIndex);
  }, [data, headerRowIndex]);

  // Normalize AI recommendations based on the actual table layout
  const normalizedRecommendation = useMemo(() => {
    if (!recommendation) return null;
    
    const normalizedPrompts = {};
    if (recommendation.columnPrompts) {
      Object.entries(recommendation.columnPrompts).forEach(([colIdx, prompt]) => {
        // AI returns absolute [C] index. We subtract offset to align with our local array.
        const internalIdx = parseInt(colIdx, 10) - colOffset;
        if (internalIdx >= 0) normalizedPrompts[internalIdx] = prompt;
      });
    }

    return {
      ...recommendation,
      columnPrompts: normalizedPrompts
    };
  }, [recommendation, colOffset]);

  const table = useRFPTable(header.length, normalizedRecommendation?.columnPrompts);

  const setCellState = useCallback((absIndex, colIndex, stateOrFn) => {
    table.setCellStates(prev => {
      const key = `${absIndex}-${colIndex}`;
      const oldVal = prev[key];
      const newVal = typeof stateOrFn === 'function' ? stateOrFn(oldVal) : stateOrFn;
      return { ...prev, [key]: newVal };
    });
  }, [table]);

  const { isProcessing, processAllRows, refreshCell, runPostAnalysis, stopProcessing, usageStats } = useRFPProcessor({
    processor,
    tabName,
    onCellUpdate,
    colOffset,
    header
  });

  const postProcessor = useMemo(() => {
    if (postProcessorSettings && postProcessorSettings.enablePostAnalysis && postProcessorSettings.providerId) {
      const ProviderClass = getProviderClass(postProcessorSettings.providerId);
      return new ProviderClass(postProcessorSettings);
    }
    return null;
  }, [postProcessorSettings]);

  const moreInfoLabel = useMemo(
    () => getMoreInfoLabel(apiSettings?.responseLanguage || 'English'), 
    [apiSettings?.responseLanguage]
  );

  const handleCellSave = (absIndex, colIndex, newValue) => {
    const cellKey = `${absIndex}-${colIndex}`;
    const oldState = table.cellStates[cellKey];
    
    // Feedback Loop: Register manual edit if it was an AI-generated cell
    if (oldState && oldState.text && oldState.text !== newValue) {
      if (processor && processor.registerManualEdit) {
        processor.registerManualEdit({
          header: header[colIndex],
          originalText: oldState.text,
          newText: newValue
        });
      }
    }

    setCellState(absIndex, colIndex, { ...oldState, text: newValue, excelText: newValue });
    if (onCellUpdate) onCellUpdate(absIndex, colIndex + colOffset, newValue);
  };

  const handleDismissReview = (absIndex, colIndex) => {
    const cellKey = `${absIndex}-${colIndex}`;
    const current = table.cellStates[cellKey];
    if (!current) return;
    
    // Remove both link review and verification notes
    const updated = { ...current, needsReview: false, verificationNote: null, status: 'ok' };
    
    // Safety check for excelText
    if (typeof updated.excelText === 'string') {
      const cleanedExcelText = updated.excelText.replace(' [REVIEW REQUIRED]', '');
      updated.excelText = cleanedExcelText;
      if (onCellUpdate) onCellUpdate(absIndex, colIndex + colOffset, cleanedExcelText);
    }
    
    setCellState(absIndex, colIndex, updated);
  };

  const handleHeaderClick = (headerText) => {
    if (table.activeInputIndex === null) return;
    const placeholder = `{${headerText}}`;
    const index = table.activeInputIndex;
    const currentVal = table.inputValues[index] || '';
    const cursorPos = table.cursorPositions[index] || 0;
    const newVal = `${currentVal.substring(0, cursorPos)}${placeholder}${currentVal.substring(cursorPos)}`;
    
    const newInputValues = [...table.inputValues];
    newInputValues[index] = newVal;
    table.setInputValues(newInputValues);
    
    const newCursorPos = cursorPos + placeholder.length;
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

  const metadataRows = useMemo(() => {
    return data.slice(0, headerRowIndex).map(row => {
      const denseRow = [];
      const maxCols = header.length + colOffset;
      for (let j = colOffset; j < maxCols; j++) denseRow.push(row.values?.[j] || '');
      return { values: denseRow, absIndex: row.absIndex };
    });
  }, [data, headerRowIndex, header.length, colOffset]);

  return (
    <div className="table-wrapper">
      <TableActions 
        tabName={tabName}
        isProcessing={isProcessing}
        onGo={() => processAllRows({
          dataRows,
          skippedRows: table.skippedRows,
          getActiveCols: table.getActiveCols,
          setCellState
        })}
        onStop={stopProcessing}
        onReset={() => processor && processor.resetHistory()}
        onDownload={onSave}
        onVerify={postProcessor ? () => runPostAnalysis({
          postProcessor,
          dataRows,
          activeCols: table.getActiveCols(),
          setCellState
        }) : null}
        onCancel={onCancel}
        onNext={onNext}
        isLastTab={isLastTab}
        usageStats={usageStats}
      />

      <div className="table-container">
        <table>
          <TableHeader 
            ref={inputRefs}
            header={header}
            inputValues={table.inputValues}
            onInputChange={(index, val) => {
              const next = [...table.inputValues];
              next[index] = val;
              table.setInputValues(next);
            }}
            onInputFocus={(index, pos) => {
              table.setActiveInputIndex(index);
              const next = [...table.cursorPositions];
              next[index] = pos;
              table.setCursorPositions(next);
            }}
            onInputClick={(index, pos) => {
              const next = [...table.cursorPositions];
              next[index] = pos;
              table.setCursorPositions(next);
            }}
            onHeaderClick={handleHeaderClick}
          />
          <TableBody 
            metadataRows={metadataRows}
            dataRows={dataRows}
            header={header}
            skippedRows={table.skippedRows}
            cellStates={table.cellStates}
            isProcessing={isProcessing}
            moreInfoLabel={moreInfoLabel}
            includeSources={apiSettings?.includeSourcesInAnswers ?? true}
            onToggleSkip={table.toggleSkipRow}
            onSetHeader={(idxOrFn) => {
              if (typeof idxOrFn === 'function') {
                setManualHeaderIndex(prev => idxOrFn(prev ?? headerRowIndex));
              } else {
                setManualHeaderIndex(idxOrFn);
              }
            }}
            onCellSave={handleCellSave}
            onCellRefresh={(rowIndex, colIndex) => refreshCell({
              rowIndex,
              colIndex,
              dataRows,
              promptTemplate: table.inputValues[colIndex],
              setCellState
            })}
            onDismissReview={handleDismissReview}
          />
        </table>
      </div>
    </div>
  );
};

export default DataTable;
