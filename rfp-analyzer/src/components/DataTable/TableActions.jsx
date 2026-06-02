import React from 'react';

/**
 * Component for table-level actions (Process, Stop, Save, etc.)
 */
const TableActions = ({ 
  tabName, 
  isProcessing, 
  onGo, 
  onStop, 
  onReset, 
  onDownload,
  onVerify,
  onCancel, 
  onNext, 
  isLastTab,
  usageStats
}) => {
  return (
    <div className="table-header-row">
      <div className="tab-info">
        <h2>Tab: {tabName}</h2>
        {usageStats && usageStats.totalTokens > 0 && (
          <div className="token-stats" title="Cumulative tokens used in this session">
            Tokens: <strong>{usageStats.totalTokens.toLocaleString()}</strong> 
            <small> (P: {usageStats.promptTokens.toLocaleString()} | R: {usageStats.responseTokens.toLocaleString()})</small>
          </div>
        )}
      </div>
      <div className="table-actions">
        {!isProcessing ? (
          <>
            <button className="action-btn reset-btn" onClick={onReset} title="Clear AI memory for this session">Reset History</button>
            <button className="action-btn close-btn" onClick={onCancel}>Close File</button>
            <button className="action-btn download-btn" onClick={onDownload} title="Download the current state of the workbook">Download</button>
            {onVerify && (
              <button className="action-btn verify-btn" onClick={onVerify} title="Check consistency and correctness of all answers">Verify Responses</button>
            )}
            <button className="action-btn process-btn" onClick={onGo}>Process All Rows</button>
            {!isLastTab && (
              <button className="action-btn next-btn" onClick={onNext}>
                Save & Next Tab
              </button>
            )}
          </>
        ) : (
          <button className="action-btn stop-btn" onClick={onStop}>Stop Processing</button>
        )}
      </div>
    </div>
  );
};

export default TableActions;
