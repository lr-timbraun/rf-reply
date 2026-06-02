import React, { memo } from 'react';
import ResponseCell from './ResponseCell';

/**
 * Memoized row component to prevent entire table re-renders.
 */
const DataRow = memo(({ 
  row, 
  rowIndex, 
  isSkipped, 
  cellStates, 
  isProcessing, 
  moreInfoLabel,
  includeSources,
  onToggleSkip,
  onSetHeader,
  onCellSave,
  onCellRefresh,
  onDismissReview
}) => {
  return (
    <tr className={isSkipped ? 'skipped-row' : ''}>
      <td className="skip-column-cell">
        <div className="row-action-group">
          <button 
            className="skip-button" 
            onClick={() => onToggleSkip(row.absIndex)}
            title="Exclude/Include this row from AI processing"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
          {row.absIndex <= 10 && (
            <button 
              className="set-header-button" 
              onClick={() => onSetHeader(row.absIndex - 1)}
              title="Promote this row to be the Header row"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 10a.5.5 0 0 0 .5-.5V3.707l2.146 2.147a.5.5 0 0 0 .707-.708l-3-3a.5.5 0 0 0-.707 0l-3 3a.5.5 0 1 0 .708.708L7.5 3.707V9.5a.5.5 0 0 0 .5.5zm-7 2.5a.5.5 0 0 1 .5-.5h14a.5.5 0 0 1 0 1H1.5a.5.5 0 0 1-.5-.5z"/>
              </svg>
            </button>
          )}
        </div>
      </td>
      {row.values.map((cell, cellIndex) => (
        <ResponseCell
          key={`${row.absIndex}-${cellIndex}`}
          cellKey={`${row.absIndex}-${cellIndex}`}
          cellState={cellStates[`${row.absIndex}-${cellIndex}`]}
          initialValue={cell}
          isProcessing={isProcessing}
          moreInfoLabel={moreInfoLabel}
          includeSources={includeSources}
          onSave={(val) => onCellSave(row.absIndex, cellIndex, val)}
          onRefresh={() => onCellRefresh(rowIndex, cellIndex)}
          onDismissReview={() => onDismissReview(row.absIndex, cellIndex)}
        />
      ))}
    </tr>
  );
});

export default DataRow;
