import React, { useState, memo } from 'react';

/**
 * Encapsulates the logic for a single interactive cell in the RFP table.
 */
const ResponseCell = memo(({ 
  cellState, 
  initialValue, 
  moreInfoLabel,
  includeSources,
  onSave, 
  onRefresh, 
  onDismissReview,
  isProcessing 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const displayContent = cellState?.text !== undefined ? cellState.text : initialValue;
  const isLoading = cellState === 'loading';
  const needsReview = cellState?.needsReview === true;
  const verificationNote = cellState?.verificationNote;
  const status = cellState?.status || 'ok';

  const startEditing = () => {
    if (isProcessing || isLoading) return;
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
    <td className={`${needsReview ? 'needs-review-cell' : ''} status-${status}`}>
      <div className="response-cell-content">
        {isLoading ? (
          <div className="spinner" title="AI is thinking..."></div>
        ) : isEditing ? (
          <textarea
            className="inline-editor"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="text-container">
            <span 
              className={`response-text ${!isProcessing ? 'editable' : ''}`}
              onClick={startEditing}
              title={!isProcessing ? "Click to edit" : ""}
            >
              {displayContent}
            </span>
            {(needsReview || verificationNote) && !isEditing && (
              <div className={`review-badge-container ${status}`}>
                <span className="review-badge" title={verificationNote || "AI suggested a manual review."}>
                  {status === 'error' ? '❌ Error' : '⚠️ Review Required'}
                </span>
                <button 
                  className="dismiss-review-button" 
                  onClick={onDismissReview}
                  title="Mark as reviewed (removes flag)"
                >
                  &times;
                </button>
                {verificationNote && <div className="verification-note">{verificationNote}</div>}
              </div>
            )}
          </div>
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

      {includeSources && cellState?.sources?.length > 0 && (
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
});

export default ResponseCell;
