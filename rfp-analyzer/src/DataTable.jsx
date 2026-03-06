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
  const [chatHistory, setChatHistory] = useState([]); // Array of { role: 'user' | 'model', parts: [{ text: '...' }] }

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
    setChatHistory([]);
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

  const handleResetConversation = () => {
    setChatHistory([]);
    alert('Conversation history reset for this tab.');
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

  const generateResponseForRow = async (model, rowValues, activeCols, history, signal) => {
    const generationConfig = {
      temperature: apiSettings.temperature,
      maxOutputTokens: apiSettings.maxTokens,
      responseMimeType: "application/json",
    };

    // Prepare the unified prompt
    let unifiedPrompt = "For this specific RFP requirement, please perform the following tasks and provide a coordinated response:\n\n";
    
    activeCols.forEach((col, index) => {
      let cellPrompt = col.promptTemplate;
      header.forEach((h, i) => {
        if (!h) return;
        const escapedHeader = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const placeholder = new RegExp(`\\{${escapedHeader}\\}`, 'g');
        const value = rowValues[i] !== null && rowValues[i] !== undefined ? rowValues[i] : '';
        cellPrompt = cellPrompt.replace(placeholder, value);
      });
      unifiedPrompt += `Task ID ${index} (Target Column: ${header[col.colIndex] || col.colIndex}):\n${cellPrompt}\n\n`;
    });

    unifiedPrompt += "IMPORTANT: Respond ONLY with a JSON object. Ensure the 'text' for each reply follows these rules: If specific options were provided, use ONLY the chosen option text. Do NOT use Markdown formatting (no bold, italics, etc.).\n\nReturn the following JSON structure:\n{\n  \"replies\": [\n    { \"taskId\": 0, \"text\": \"...\", \"sources\": [\"url1\", \"url2\"] },\n    ...\n  ]\n}";

    try {
      const chat = model.startChat({
        history: history,
        generationConfig,
      });

      const resultPromise = chat.sendMessage(unifiedPrompt);
      
      const response = await Promise.race([
        resultPromise,
        new Promise((_, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => reject(new Error('Aborted')));
          }
        })
      ]);

      const rawText = response.response.text().trim();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawText);
      } catch (e) {
        console.error("JSON Parsing Error. Raw output:", rawText);
        throw new Error("AI failed to return valid JSON.");
      }

      const results = activeCols.map((col, index) => {
        const reply = parsedResponse.replies.find(r => r.taskId === index) || { text: 'Error: No reply for task', sources: [] };
        
        let text = reply.text;
        let sources = Array.isArray(reply.sources) ? reply.sources.map(s => ({ uri: s, title: s })) : [];

        let finalTextForExcel = text;
        if (text.length > 25 && sources.length > 0) {
          const sourcesLabel = getSourcesLabel(apiSettings.responseLanguage || 'English');
          const sourcesList = sources.map(s => s.uri).join('\n');
          finalTextForExcel = `${text}\n\n${sourcesLabel}:\n${sourcesList}`;
        }

        return {
          colIndex: col.colIndex,
          text: text,
          excelText: finalTextForExcel,
          sources: sources
        };
      });

      const newMessages = [
        { role: 'user', parts: [{ text: unifiedPrompt }] },
        { role: 'model', parts: [{ text: rawText }] }
      ];

      return { results, newMessages };
    } catch (error) {
      if (error.message === 'Aborted') {
        return { results: activeCols.map(c => ({ colIndex: c.colIndex, text: 'Cancelled', excelText: 'Cancelled', sources: [] })), newMessages: [] };
      }
      console.error('API Error:', error);
      return { results: activeCols.map(c => ({ colIndex: c.colIndex, text: 'Error', excelText: 'Error', sources: [] })), newMessages: [] };
    }
  };

  const handleGoClick = async () => {
    if (!apiSettings.apiKey) {
      alert('Please set your API key in the settings.');
      return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    setAbortController(controller);

    let currentHistory = [...chatHistory];

    try {
      const genAI = new GoogleGenerativeAI(apiSettings.apiKey);
      const docContext = apiSettings.docSource ? ` Use only the latest official documentation available at ${apiSettings.docSource} for replying to these prompts.` : '';
      const baseInstruction = 'You are a presales Engineer replying to an RFP requirements questionnaire. ';
      const model = genAI.getGenerativeModel({
        model: apiSettings.model,
        systemInstruction: `${baseInstruction}${apiSettings.systemInstructions}${docContext} Respond in ${apiSettings.responseLanguage || 'English'}.`,
      });

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        if (controller.signal.aborted) break;

        const row = dataRows[rowIndex];
        const absIndex = row.absIndex;

        if (skippedRows.has(absIndex)) {
          inputValues.forEach((val, colIndex) => {
            if (val) setCellStates(prev => ({ ...prev, [`${absIndex}-${colIndex}`]: 'Skipped' }));
          });
          continue;
        }

        const activeCols = [];
        inputValues.forEach((val, colIndex) => {
          if (val) activeCols.push({ colIndex, promptTemplate: val });
        });

        if (activeCols.length === 0) continue;

        setCellStates(prev => {
          const newState = { ...prev };
          activeCols.forEach(c => {
            newState[`${absIndex}-${c.colIndex}`] = 'loading';
          });
          return newState;
        });

        const response = await generateResponseForRow(
          model,
          row.values,
          activeCols,
          currentHistory,
          controller.signal
        );

        if (controller.signal.aborted) break;

        response.results.forEach(res => {
          setCellStates(prev => ({ 
            ...prev, 
            [`${absIndex}-${res.colIndex}`]: res 
          }));

          if (onCellUpdate) {
            onCellUpdate(absIndex, res.colIndex + colOffset, res.excelText);
          }
        });

        currentHistory = [...currentHistory, ...response.newMessages];
        setChatHistory(currentHistory);
      }
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const handleRefreshClick = async (rowIndex, colIndex) => {
    const absIndex = dataRows[rowIndex].absIndex;
    if (skippedRows.has(absIndex)) return;
    const promptTemplate = inputValues[colIndex];
    if (!promptTemplate) return;

    if (!apiSettings.apiKey) {
      alert('Please set your API key in the settings.');
      return;
    }

    const cellKey = `${absIndex}-${colIndex}`;
    setCellStates(prev => ({ ...prev, [cellKey]: 'loading' }));

    const genAI = new GoogleGenerativeAI(apiSettings.apiKey);
    const docContext = apiSettings.docSource ? ` Use only the latest official documentation available at ${apiSettings.docSource} for replying to these prompts.` : '';
    const baseInstruction = 'You are a presales Engineer replying to an RFP requirements questionnaire. ';
    const model = genAI.getGenerativeModel({
      model: apiSettings.model,
      systemInstruction: `${baseInstruction}${apiSettings.systemInstructions}${docContext} Respond in ${apiSettings.responseLanguage || 'English'}.`,
    });

    const response = await generateResponseForRow(model, dataRows[rowIndex].values, [{ colIndex, promptTemplate }], chatHistory);
    
    if (response.results.length > 0) {
      const res = response.results[0];
      setCellStates(prev => ({ ...prev, [cellKey]: res }));
      setChatHistory([...chatHistory, ...response.newMessages]);
      if (onCellUpdate) {
        onCellUpdate(absIndex, colIndex + colOffset, res.excelText);
      }
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
        <div className="table-header-actions">
          <button className="reset-button" onClick={handleResetConversation} title="Clear conversation history for this tab">Reset History</button>
          {isProcessing && (
            <button className="stop-button" onClick={handleStopClick}>Stop Processing</button>
          )}
        </div>
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
