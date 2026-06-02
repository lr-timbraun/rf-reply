import React from 'react';
import DataRow from './DataRow';

/**
 * Component for the table body containing metadata and RFP data rows.
 */
const TableBody = ({ 
  metadataRows, 
  dataRows, 
  header, 
  skippedRows, 
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
    <tbody>
      {metadataRows.map((row) => (
        <tr key={`meta-${row.absIndex}`} className="metadata-row">
          <td className="skip-column-cell">
            {row.absIndex <= 10 && (
              <div className="row-action-group">
                <button 
                  className="set-header-button" 
                  onClick={() => onSetHeader(row.absIndex - 1)}
                  title="Promote this row to be the Header row"
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M8 10a.5.5 0 0 0 .5-.5V3.707l2.146 2.147a.5.5 0 0 0 .707-.708l-3-3a.5.5 0 0 0-.707 0l-3 3a.5.5 0 1 0 .708.708L7.5 3.707V9.5a.5.5 0 0 0 .5.5zm-7 2.5a.5.5 0 0 1 .5-.5h14a.5.5 0 0 1 0 1H1.5a.5.5 0 0 1-.5-.5z"/>
                  </svg>
                </button>
              </div>
            )}
          </td>
          {row.values.slice(0, header.length).map((cell, i) => (
            <td key={i} className="metadata-cell">{cell}</td>
          ))}
        </tr>
      ))}
      {dataRows.map((row, rowIndex) => (
        <DataRow 
          key={row.absIndex}
          row={row}
          rowIndex={rowIndex}
          header={header}
          isSkipped={skippedRows.has(row.absIndex)}
          cellStates={cellStates}
          isProcessing={isProcessing}
          moreInfoLabel={moreInfoLabel}
          includeSources={includeSources}
          onToggleSkip={onToggleSkip}
          onSetHeader={onSetHeader}
          onCellSave={onCellSave}
          onCellRefresh={onCellRefresh}
          onDismissReview={onDismissReview}
        />
      ))}
    </tbody>
  );
};

export default TableBody;
