import { useState, useEffect } from 'react';

/**
 * Hook to manage the state of an RFP data table during processing.
 */
export const useRFPTable = (headerCount, initialPrompts = {}) => {
  const [inputValues, setInputValues] = useState(Array(headerCount).fill(''));
  const [cursorPositions, setCursorPositions] = useState(Array(headerCount).fill(0));
  const [activeInputIndex, setActiveInputIndex] = useState(null);
  const [cellStates, setCellStates] = useState({});
  const [skippedRows, setSkippedRows] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Reset state when header count changes (new tab)
  useEffect(() => {
    const defaultPrompts = Array(headerCount).fill('');
    Object.entries(initialPrompts).forEach(([colIdx, prompt]) => {
      const idx = parseInt(colIdx, 10);
      if (idx < headerCount) defaultPrompts[idx] = prompt;
    });
    
    // Using simple stringify for deep equality check to prevent loops
    const currentPromptsJson = JSON.stringify(inputValues);
    const nextPromptsJson = JSON.stringify(defaultPrompts);

    if (currentPromptsJson !== nextPromptsJson) {
      setInputValues(defaultPrompts); // eslint-disable-line react-hooks/set-state-in-effect
    }

    setCursorPositions(Array(headerCount).fill(0));
    setActiveInputIndex(null);
    setCellStates({});
    setSkippedRows(new Set());
    setEditingCell(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerCount, initialPrompts]); 

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
    editingCell, setEditingCell,
    editValue, setEditValue,
    getActiveCols
  };
};
