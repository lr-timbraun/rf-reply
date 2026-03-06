import { useState, useEffect } from 'react';

/**
 * Hook to manage the state of an RFP data table during processing.
 */
export const useRFPTable = (headerCount) => {
  const [inputValues, setInputValues] = useState(Array(headerCount).fill(''));
  const [cursorPositions, setCursorPositions] = useState(Array(headerCount).fill(0));
  const [activeInputIndex, setActiveInputIndex] = useState(null);
  const [cellStates, setCellStates] = useState({});
  const [skippedRows, setSkippedRows] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Reset state when header count changes (new tab)
  useEffect(() => {
    setInputValues(Array(headerCount).fill(''));
    setCursorPositions(Array(headerCount).fill(0));
    setActiveInputIndex(null);
    setCellStates({});
    setSkippedRows(new Set());
    setIsProcessing(false);
    setEditingCell(null);
    setChatHistory([]);
  }, [headerCount]);

  const toggleSkipRow = (absIndex) => {
    setSkippedRows(prev => {
      const next = new Set(prev);
      if (next.has(absIndex)) {
        next.delete(absIndex);
      } else {
        next.add(absIndex);
      }
      return next;
    });
  };

  const getActiveCols = () => {
    const active = [];
    inputValues.forEach((val, colIndex) => {
      if (val) active.push({ colIndex, promptTemplate: val });
    });
    return active;
  };

  return {
    inputValues, setInputValues,
    cursorPositions, setCursorPositions,
    activeInputIndex, setActiveInputIndex,
    cellStates, setCellStates,
    skippedRows, toggleSkipRow,
    isProcessing, setIsProcessing,
    abortController, setAbortController,
    editingCell, setEditingCell,
    editValue, setEditValue,
    chatHistory, setChatHistory,
    getActiveCols
  };
};
