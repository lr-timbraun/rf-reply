import React, { useState } from 'react';

/**
 * Encapsulates the logic for a single interactive cell in the RFP table.
 * Handles loading states, inline editing, manual saves, and source display.
 */
const ResponseCell = ({ 
  cellKey, 
  cellState, 
  initialValue, 
  moreInfoLabel,
  onSave, 
  onRefresh, 
  isProcessing 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const displayContent = cellState === 'loading' 
    ? '...' 
    : (cellState?.text !== undefined ? cellState.text : initialValue);

  const startEditing = () => {
    if (isProcessing || cellState === 'loading') return;
    setEditValue(displayContent);
    setIsEditing(true);
  };

  const handleBlur = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(editValue);
      setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const showRefreshButton = cellState?.text && cellState !== 'Skipped' && !isProcessing;

  return (
    <td>
      <div className="response-cell-content">
        {isEditing ? (
          <textarea
            className="inline-editor"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span 
            className={`response-text ${!isProcessing ? 'editable' : ''}`}
            onClick={startEditing}
            title={!isProcessing ? "Click to edit" : ""}
          >
            {displayContent}
          </span>
        )}
        
        {showRefreshButton && (
          <button className="refresh-button" onClick={onRefresh} title="Re-generate this cell">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          </button>
        )}
      </div>

      {cellState?.sources?.length > 0 && (
        <div className="response-sources">
          <strong>{moreInfoLabel}:</strong>
          <ul>
            {cellState.sources.map((s, i) => (
              <li key={i}>
                <a href={s.uri} target="_blank" rel="noopener noreferrer">
                  {s.uri}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </td>
  );
};

export default ResponseCell;
