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
  onVerify,
  onCancel, 
  onNext, 
  isLastTab 
}) => {
  return (
    <div className="table-header-row">
      <div className="tab-info">
        <h2>Tab: {tabName}</h2>
      </div>
      <div className="table-actions">
        {!isProcessing ? (
          <>
            <button className="reset-button" onClick={onReset} title="Clear AI memory for this session">Reset History</button>
            <button className="cancel-button" onClick={onCancel}>Close File</button>
            <button className="go-button" onClick={onGo}>Process All Rows</button>
            {onVerify && (
              <button className="verify-button" onClick={onVerify} title="Check consistency and correctness of all answers">Verify Responses</button>
            )}
            <button className="next-button" onClick={onNext}>
              {isLastTab ? 'Finish & Download' : 'Save & Next Tab'}
            </button>
          </>
        ) : (
          <button className="stop-button" onClick={onStop}>Stop Processing</button>
        )}
      </div>
    </div>
  );
};

export default TableActions;
