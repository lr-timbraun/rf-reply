import { useState, useCallback } from 'react';
import { useNotify } from './useNotify';
import { loggerService } from '../services/loggerService';

/**
 * Hook to manage the AI processing loop for the RFP table.
 */
export const useRFPProcessor = ({ processor, tabName, onCellUpdate, colOffset, header }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [usageStats, setUsageStats] = useState({ promptTokens: 0, responseTokens: 0, totalTokens: 0 });
  const { notify } = useNotify();

  const updateUsage = useCallback((usage) => {
    if (!usage) return;
    
    // Log for verification in the client debug logs
    loggerService.debugLog('RAW_TOKEN_USAGE_METADATA', usage);

    // Frontend strictly relies on the normalized unified schema provided by the AI Service
    setUsageStats(prev => ({
      promptTokens: prev.promptTokens + (usage.promptTokens || 0),
      responseTokens: prev.responseTokens + (usage.responseTokens || 0),
      totalTokens: prev.totalTokens + (usage.totalTokens || 0)
    }));
  }, []);

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
          const { results, usage } = await processor.processRow({
            row,
            activeCols,
            headers: header,
            abortSignal: controller.signal
          });

          // Update Usage
          updateUsage(usage);

          // Apply results
          results.forEach(res => {
            setCellState(row.absIndex, res.colIndex, res);
            if (onCellUpdate) onCellUpdate(tabName, row.absIndex, res.colIndex + colOffset, res.excelText);
          });
        } catch (rowError) {
          if (rowError.message === 'Aborted') break;
          loggerService.error(`ROW_PROCESS_FAILED_R${row.absIndex}`, rowError);
          notify(`Row ${row.absIndex} failed: ${rowError.message}`, 'error');
          
          activeCols.forEach(c => {
            setCellState(row.absIndex, c.colIndex, { text: 'Error', excelText: 'Error', sources: [] });
          });
        }
      }
    } catch (error) {
      loggerService.error("BATCH_PROCESS_FAILED", error);
      notify(`Processing error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  }, [processor, tabName, onCellUpdate, colOffset, header, notify, updateUsage]);

  const refreshCell = useCallback(async ({ rowIndex, colIndex, dataRows, promptTemplate, setCellState }) => {
    if (!processor) return;
    const row = dataRows[rowIndex];
    setCellState(row.absIndex, colIndex, 'loading');

    try {
      const activeCols = [{ colIndex, promptTemplate }];
      const { results, usage } = await processor.processRow({
        row,
        activeCols,
        headers: header
      });

      updateUsage(usage);

      results.forEach(res => {
        setCellState(row.absIndex, res.colIndex, res);
        if (onCellUpdate) onCellUpdate(tabName, row.absIndex, res.colIndex + colOffset, res.excelText);
      });
    } catch (e) {
      loggerService.error(`CELL_REFRESH_FAILED_R${row.absIndex}_C${colIndex}`, e);
      notify(`Refresh failed: ${e.message}`, 'error');
      setCellState(row.absIndex, colIndex, 'Error');
    }
  }, [processor, tabName, onCellUpdate, colOffset, header, notify, updateUsage]);

  const runPostAnalysis = useCallback(async ({ postProcessor, dataRows, activeCols, setCellState }) => {
    if (!postProcessor) {
      notify('Post-Analysis Processor not initialized.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      notify('Running post-analysis verification...', 'info');
      const { verifications, usage } = await postProcessor.verifyAnswers({
        rows: dataRows,
        activeCols,
        headers: header
      });

      updateUsage(usage);

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
      loggerService.error("POST_ANALYSIS_FAILED", e);
      notify(`Verification failed: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [header, notify, updateUsage]);

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
    stopProcessing,
    usageStats
  };
};
