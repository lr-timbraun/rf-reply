import { useState, useCallback } from 'react';
import { useNotify } from './useNotify';

/**
 * Hook to manage the AI processing loop for the RFP table.
 */
export const useRFPProcessor = ({ processor, onCellUpdate, colOffset, header }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const { notify } = useNotify();

  const processAllRows = useCallback(async ({ dataRows, skippedRows, getActiveCols, setCellState }) => {
    if (!processor) { 
      notify('AI Processor not initialized.', 'error');
      return; 
    }

    setIsProcessing(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      for (const row of dataRows) {
        if (controller.signal.aborted) break;
        if (skippedRows.has(row.absIndex)) continue;

        const activeCols = getActiveCols();
        if (activeCols.length === 0) continue;

        // Set loading state for active cells
        activeCols.forEach(c => setCellState(row.absIndex, c.colIndex, 'loading'));

        try {
          const results = await processor.processRow({
            row,
            activeCols,
            headers: header,
            abortSignal: controller.signal
          });

          // Apply results
          results.forEach(res => {
            setCellState(row.absIndex, res.colIndex, res);
            if (onCellUpdate) onCellUpdate(row.absIndex, res.colIndex + colOffset, res.excelText);
          });
        } catch (rowError) {
          if (rowError.message === 'Aborted') break;
          console.error(`Error processing row ${row.absIndex}:`, rowError);
          notify(`Row ${row.absIndex} failed: ${rowError.message}`, 'error');
          
          activeCols.forEach(c => {
            setCellState(row.absIndex, c.colIndex, { text: 'Error', excelText: 'Error', sources: [] });
          });
        }
      }
    } catch (error) {
      console.error("Processing error:", error);
      notify(`Processing error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  }, [processor, onCellUpdate, colOffset, header, notify]);

  const refreshCell = useCallback(async ({ rowIndex, colIndex, dataRows, promptTemplate, setCellState }) => {
    if (!processor) return;
    const row = dataRows[rowIndex];
    setCellState(row.absIndex, colIndex, 'loading');

    try {
      const activeCols = [{ colIndex, promptTemplate }];
      const results = await processor.processRow({
        row,
        activeCols,
        headers: header
      });

      results.forEach(res => {
        setCellState(row.absIndex, res.colIndex, res);
        if (onCellUpdate) onCellUpdate(row.absIndex, res.colIndex + colOffset, res.excelText);
      });
    } catch (e) {
      console.error("Refresh error:", e);
      notify(`Refresh failed: ${e.message}`, 'error');
      setCellState(row.absIndex, colIndex, 'Error');
    }
  }, [processor, onCellUpdate, colOffset, header, notify]);

  const runPostAnalysis = useCallback(async ({ postProcessor, dataRows, activeCols, setCellState }) => {
    if (!postProcessor) {
      notify('Post-Analysis Processor not initialized.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      notify('Running post-analysis verification...', 'info');
      const verifications = await postProcessor.verifyAnswers({
        rows: dataRows,
        activeCols,
        headers: header
      });

      verifications.forEach(v => {
        if (v.status !== 'ok') {
          setCellState(v.rowIndex, v.colIndex, prev => ({
            ...(typeof prev === 'object' ? prev : {}),
            verificationNote: v.verificationNote,
            status: v.status
          }));
        }
      });
      notify('Verification complete.', 'success');
    } catch (e) {
      console.error("Verification error:", e);
      notify(`Verification failed: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [header, notify]);

  const stopProcessing = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  return {
    isProcessing,
    processAllRows,
    refreshCell,
    runPostAnalysis,
    stopProcessing
  };
};
