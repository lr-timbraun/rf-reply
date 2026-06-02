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
  onToggleSkip,
  onSetHeader,
  onCellSave,
  onCellRefresh,
  onDismissReview
}) => {
  return (
    <tbody>
      {metadataRows.map((row, idx) => (
        <tr key={`meta-${row.absIndex}`} className="metadata-row">
          <td className="skip-column-cell">
            {row.absIndex <= 10 && (
              <button 
                className="set-header-button" 
                onClick={() => onSetHeader(idx)}
              >
                ^
              </button>
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
