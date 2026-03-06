import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './DataTable.css';

const DataTable = ({ tabName, data, apiSettings, onNext, onCancel, isLastTab, onCellUpdate }) => {
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const inputRefs = useRef([]);

  // Strategy 2 Heuristic: Find first dense row in first 20
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const scanLimit = Math.min(data.length, 20);
    let maxFilled = 0;

    // First pass: Find the maximum number of filled cells in any of the first 20 rows
    for (let i = 0; i < scanLimit; i++) {
      const rowValues = data[i].values;
      const filled = rowValues ? rowValues.filter(v => v !== null && v !== undefined && v !== '').length : 0;
      if (filled > maxFilled) maxFilled = filled;
    }

    // Second pass: Pick the first row that is at least 80% as dense as the densest row
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
    if (!data || data.length === 0) {
      return { header: [], dataRows: [], colOffset: 1 };
    }
    
    const safeHeaderIndex = Math.min(headerRowIndex, data.length - 1);
    const headerRow = data[safeHeaderIndex];
    
    // Find the max column index across all data to ensure we don't miss any columns
    let maxCols = 0;
    data.forEach(row => {
      if (row.values && row.values.length > maxCols) maxCols = row.values.length;
    });

    // Extract headers starting from Excel Column A (index 1)
    const rawHeader = [];
    for (let j = 1; j < maxCols; j++) {
      rawHeader.push(headerRow.values[j] || '');
    }

    let currentHeader = [...rawHeader];
    let offset = 1;

    // Detect if Column A is empty in the header row and shift if so
    if (currentHeader.length > 0 && !currentHeader[0]) {
      currentHeader.shift();
      offset = 2;
    }

    // Process data rows, aligning them with the potentially shifted header
    const currentDataRows = data.slice(safeHeaderIndex + 1).map(row => {
      const denseRow = [];
      const rowValues = row.values || [];
      for (let j = offset; j < maxCols; j++) {
        denseRow.push(rowValues[j] !== null && rowValues[j] !== undefined ? rowValues[j] : '');
      }
      return { values: denseRow, absIndex: row.absIndex };
    });

    return { header: currentHeader, dataRows: currentDataRows, colOffset: offset };
  }, [data, headerRowIndex]);

  const [inputValues, setInputValues] = useState([]);
  const [cursorPositions, setCursorPositions] = useState([]);
  const [activeInputIndex, setActiveInputIndex] = useState(null);
  const [cellStates, setCellStates] = useState({}); // { 'absIndex-colIndex': { text: '...', sources: [...] } | 'loading' | 'Error' }
  const [skippedRows, setSkippedRows] = useState(new Set()); // Set of absIndex
  const [isProcessing, setIsProcessing] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // 'absIndex-colIndex'
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setInputValues(Array(header.length).fill(''));
    setCursorPositions(Array(header.length).fill(0));
    setActiveInputIndex(null);
    setCellStates({});
    setSkippedRows(new Set());
    setIsProcessing(false);
    if (abortController) abortController.abort();
    setAbortController(null);
    setEditingCell(null);
  }, [header]);

  const startEditing = (absIndex, colIndex, currentValue) => {
    setEditingCell(`${absIndex}-${colIndex}`);
    setEditValue(currentValue || '');
  };

  const saveEdit = (absIndex, colIndex) => {
    const cellKey = `${absIndex}-${colIndex}`;
    
    // Update local state so UI reflects the manual edit
    setCellStates(prev => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        text: editValue,
        excelText: editValue // For manual edits, we use the text exactly as entered
      }
    }));

    // Update the Excel workbook
    if (onCellUpdate) {
      onCellUpdate(absIndex, colIndex + colOffset, editValue);
    }
    
    setEditingCell(null);
  };

  const handleStopClick = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsProcessing(false);
  };

  const handleHeaderClick = (headerText) => {
    if (activeInputIndex === null) return;
    const placeholder = `{${headerText}}`;
    const index = activeInputIndex;
    const currentVal = inputValues[index];
    const cursorPos = cursorPositions[index];
    
    const newVal = `${currentVal.substring(0, cursorPos)}${placeholder}${currentVal.substring(cursorPos)}`;
    const newInputValues = [...inputValues];
    newInputValues[index] = newVal;
    setInputValues(newInputValues);

    const newCursorPos = cursorPos + placeholder.length;
    const newCursorPositions = [...cursorPositions];
    newCursorPositions[index] = newCursorPos;
    setCursorPositions(newCursorPositions);

    // Refocus and place cursor after the placeholder
    setTimeout(() => {
      const textarea = inputRefs.current[index];
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleInputChange = (e, index) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = e.target.value;
    setInputValues(newInputValues);
  };

  const handleInputActivity = (e, index) => {
    setActiveInputIndex(index);
    const newCursorPositions = [...cursorPositions];
    newCursorPositions[index] = e.target.selectionStart;
    setCursorPositions(newCursorPositions);
  };

  const getSourcesLabel = (lang) => {
    const translations = {
      'English': 'Sources',
      'German': 'Quellen',
      'French': 'Sources',
      'Spanish': 'Fuentes',
      'Italian': 'Fonti',
      'Portuguese': 'Fontes',
      'Dutch': 'Bronnen',
      'Russian': 'Источники',
      'Chinese (Simplified)': '来源',
      'Chinese (Traditional)': '來源',
      'Japanese': '出典',
      'Korean': '출처'
    };
    return translations[lang] || 'Sources';
  };

  const generateResponseForCell = async (rowValues, colIndex, promptTemplate, signal) => {
    if (!apiSettings.apiKey) {
      alert('Please set your API key in the settings.');
      return { text: 'Error: API Key Missing', sources: [] };
    }

    const genAI = new GoogleGenerativeAI(apiSettings.apiKey);
    const model = genAI.getGenerativeModel({
      model: apiSettings.model,
      systemInstruction: `${apiSettings.systemInstructions} Respond in ${apiSettings.responseLanguage || 'English'}.`,
    });

    const generationConfig = {
      temperature: apiSettings.temperature,
      maxOutputTokens: apiSettings.maxTokens,
    };

    let prompt = promptTemplate;
    
    // Always append generic instruction regarding potential reply options and formatting
    prompt += "\n\nIMPORTANT: If I have provided you with a specific set of reply options, you MUST respond ONLY with the exact text of the chosen option. In this case, do not add any explanations, headers, or sources. If no specific options are provided, you may reply with a full detailed answer. In all cases, do NOT use Markdown formatting (no bold, italics, lists, etc.) in your response.";

    header.forEach((h, i) => {
      if (!h) return;
      // Escape special characters for regex to prevent breakage if header has parens, etc.
      const escapedHeader = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const placeholder = new RegExp(`\\{${escapedHeader}\\}`, 'g');
      const value = rowValues[i] !== null && rowValues[i] !== undefined ? rowValues[i] : '';
      prompt = prompt.replace(placeholder, value);
    });

    try {
      const resultPromise = model.generateContent(prompt, generationConfig);
      
      const response = await Promise.race([
        resultPromise,
        new Promise((_, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => reject(new Error('Aborted')));
          }
        })
      ]);

      let text = response.response.text().trim();
      const citationMetadata = response.response.candidates && response.response.candidates[0] ? response.response.candidates[0].citationMetadata : null;

      let sources = [];
      if (citationMetadata && citationMetadata.citationSources) {
        sources = citationMetadata.citationSources.map(citation => ({
          uri: citation.uri,
          title: citation.uri
        }));
      }

      // Formulate the text for the Excel sheet.
      // If the response is very short (e.g. just a status or option selection), we omit sources
      // to keep the sheet clean and respect potential data validations.
      let finalTextForExcel = text;
      if (text.length > 25 && sources.length > 0) {
        const sourcesLabel = getSourcesLabel(apiSettings.responseLanguage || 'English');
        const sourcesList = sources.map(s => s.uri).join('\n');
        finalTextForExcel = `${text}\n\n${sourcesLabel}:\n${sourcesList}`;
      }

      return { 
        text: text, 
        excelText: finalTextForExcel,
        sources: sources 
      };
    } catch (error) {
      if (error.message === 'Aborted') {
        return { text: 'Cancelled', excelText: 'Cancelled', sources: [] };
      }
      console.error('API Error:', error);
      return { text: 'Error', excelText: 'Error', sources: [] };
    }
  };

  const handleGoClick = async () => {
    setIsProcessing(true);
    const controller = new AbortController();
    setAbortController(controller);

    const CHUNK_SIZE = 5; // Number of parallel requests

    try {
      // Collect all tasks that need processing
      const tasks = [];
      for (let colIndex = 0; colIndex < inputValues.length; colIndex++) {
        const promptTemplate = inputValues[colIndex];
        if (!promptTemplate) continue;

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const absIndex = dataRows[rowIndex].absIndex;
          if (skippedRows.has(absIndex)) {
            setCellStates(prev => ({ ...prev, [`${absIndex}-${colIndex}`]: 'Skipped' }));
            continue;
          }
          tasks.push({ rowIndex, colIndex, absIndex, promptTemplate });
        }
      }

      // Process tasks in chunks
      for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
        if (controller.signal.aborted) break;

        const chunk = tasks.slice(i, i + CHUNK_SIZE);
        
        // Mark all cells in the current chunk as loading
        setCellStates(prev => {
          const newState = { ...prev };
          chunk.forEach(t => {
            newState[`${t.absIndex}-${t.colIndex}`] = 'loading';
          });
          return newState;
        });

        // Execute chunk in parallel
        await Promise.all(chunk.map(async (task) => {
          if (controller.signal.aborted) return;

          const response = await generateResponseForCell(
            dataRows[task.rowIndex].values, 
            task.colIndex, 
            task.promptTemplate, 
            controller.signal
          );

          if (!controller.signal.aborted) {
            setCellStates(prev => ({ 
              ...prev, 
              [`${task.absIndex}-${task.colIndex}`]: response 
            }));
            if (onCellUpdate) {
              onCellUpdate(task.absIndex, task.colIndex + colOffset, response.excelText);
            }
          }
        }));
      }
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const handleRefreshClick = async (rowIndex, colIndex) => {
    const absIndex = dataRows[rowIndex].absIndex;
    if (skippedRows.has(absIndex)) {
      setCellStates(prev => ({ ...prev, [`${absIndex}-${colIndex}`]: 'Skipped' }));
      return;
    }
    const promptTemplate = inputValues[colIndex];
    if (!promptTemplate) return;

    const cellKey = `${absIndex}-${colIndex}`;
    setCellStates(prev => ({ ...prev, [cellKey]: 'loading' }));
    const response = await generateResponseForCell(dataRows[rowIndex].values, colIndex, promptTemplate);
    setCellStates(prev => ({ ...prev, [cellKey]: response }));
    if (onCellUpdate) {
      onCellUpdate(absIndex, colIndex + colOffset, response.excelText);
    }
  };

  const handleSkipRowToggle = (absIndex) => {
    setSkippedRows(prev => {
      const newSkippedRows = new Set(prev);
      if (newSkippedRows.has(absIndex)) {
        newSkippedRows.delete(absIndex);
        for (let colIndex = 0; colIndex < header.length; colIndex++) {
          const cellKey = `${absIndex}-${colIndex}`;
          if (cellStates[cellKey] === 'Skipped') {
            setCellStates(p => ({ ...p, [cellKey]: '' }));
          }
        }
      } else {
        newSkippedRows.add(absIndex);
        for (let colIndex = 0; colIndex < header.length; colIndex++) {
          setCellStates(p => ({ ...p, [`${absIndex}-${colIndex}`]: 'Skipped' }));
        }
      }
      return newSkippedRows;
    });
  };

  if (header.length === 0) {
    return <p>No data to display for {tabName}.</p>;
  }

  // Determine metadata rows to display (everything before headerRowIndex)
  // We use the same colOffset and maxCols logic to keep them aligned with data columns
  const metadataRows = data.slice(0, headerRowIndex).map(row => {
    const denseRow = [];
    const rowValues = row.values || [];
    const maxCols = header.length + colOffset;
    for (let j = colOffset; j < maxCols; j++) {
      denseRow.push(rowValues[j] !== null && rowValues[j] !== undefined ? rowValues[j] : '');
    }
    return { values: denseRow, absIndex: row.absIndex };
  });

  return (
    <div className="table-container">
      <div className="table-header-row">
        <h2>{tabName}</h2>
        {isProcessing && (
          <button className="stop-button" onClick={handleStopClick}>Stop Processing</button>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <th className="skip-column-header"></th>
            {header.map((cell, index) => (
              <th key={index} onClick={() => handleHeaderClick(cell)} className="clickable-header">
                {cell || `[Col ${index + 1}]`}
              </th>
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
                  value={inputValues[index]}
                  onChange={(e) => handleInputChange(e, index)}
                  onFocus={(e) => handleInputActivity(e, index)}
                  onSelect={(e) => handleInputActivity(e, index)}
                  onKeyUp={(e) => handleInputActivity(e, index)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Render Metadata Rows */}
          {metadataRows.map((row, idx) => (
            <tr key={`meta-${row.absIndex}`} className="metadata-row">
              <td className="skip-column-cell">
                {row.absIndex <= 10 && (
                  <button className="set-header-button" onClick={() => setHeaderRowIndex(idx)} title="Set as Header">^</button>
                )}
              </td>
              {row.values.slice(0, header.length).map((cell, cellIndex) => (
                <td key={cellIndex} className="metadata-cell">{cell}</td>
              ))}
            </tr>
          ))}

          {/* Render Data Rows */}
          {dataRows.map((row, rowIndex) => (
            <tr key={row.absIndex} className={skippedRows.has(row.absIndex) ? 'skipped-row' : ''}>
              <td className="skip-column-cell">
                <div className="row-action-group">
                  <button className="skip-button" onClick={() => handleSkipRowToggle(row.absIndex)} title="Skip/Enable Row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                  </button>
                  {row.absIndex <= 10 && (
                    <button className="set-header-button" onClick={() => setHeaderRowIndex(headerRowIndex + rowIndex + 1)} title="Set as Header">^</button>
                  )}
                </div>
              </td>
              {row.values.map((cell, cellIndex) => {
                const cellKey = `${row.absIndex}-${cellIndex}`;
                const cellState = cellStates[cellKey];
                const displayContent = cellState === 'loading' ? '...' : (cellState && cellState.text !== undefined ? cellState.text : cell);
                const showRefreshButton = cellState && cellState.text && cellState.text !== 'loading' && cellState.text !== 'Error' && cellState !== 'Skipped';
                const sources = cellState && cellState.sources ? cellState.sources : [];
                const isEditing = editingCell === cellKey;

                return (
                  <td key={cellIndex}>
                    <div className="response-cell-content">
                      {isEditing ? (
                        <textarea
                          className="inline-editor"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(row.absIndex, cellIndex)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit(row.absIndex, cellIndex);
                            }
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                        />
                      ) : (
                        <span 
                          className="response-text editable"
                          onClick={() => startEditing(row.absIndex, cellIndex, displayContent)}
                          title="Click to edit"
                        >
                          {displayContent}
                        </span>
                      )}
                      {showRefreshButton && (
                        <button className="refresh-button" onClick={() => handleRefreshClick(rowIndex, cellIndex)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    {sources.length > 0 && (
                      <div className="response-sources">
                        <strong>Sources:</strong>
                        <ul>
                          {sources.map((source, srcIndex) => (
                            <li key={srcIndex}>
                              <a href={source.uri} target="_blank" rel="noopener noreferrer">
                                {source.title || source.uri}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-actions">
        <button onClick={onCancel} className="cancel-button">Cancel</button>
        <div>
          <button onClick={handleGoClick} className="go-button">Go!</button>
          <button onClick={onNext}>
            {isLastTab ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
