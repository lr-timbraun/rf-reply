import { useState, useEffect, useRef } from 'react';

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

  // Track the last seen initialPrompts to avoid overwriting user input
  const lastAppliedPromptsRef = useRef(null);
  const currentHeaderCountRef = useRef(headerCount);

  // Sync initial prompts / recommendations
  useEffect(() => {
    const promptsJson = JSON.stringify(initialPrompts);
    const countChanged = currentHeaderCountRef.current !== headerCount;
    const promptsChanged = lastAppliedPromptsRef.current !== promptsJson;

    if (countChanged || promptsChanged) {
      const nextPrompts = Array(headerCount).fill('');
      Object.entries(initialPrompts).forEach(([colIdx, prompt]) => {
        const idx = parseInt(colIdx, 10);
        // If colIdx is 1-based (from AI) and inputValues is 0-based, 
        // we might need to adjust. However, given we are now providing [C index] in prompt,
        // it should match the internal index.
        if (idx < headerCount) nextPrompts[idx] = prompt;
      });

      setInputValues(nextPrompts);
      lastAppliedPromptsRef.current = promptsJson;
      currentHeaderCountRef.current = headerCount;

      // Also reset related state if tab changed
      if (countChanged) {
        setCursorPositions(Array(headerCount).fill(0));
        setActiveInputIndex(null);
        setCellStates({});
        setSkippedRows(new Set());
        setEditingCell(null);
      }
    }
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
