import React from 'react';

/**
 * Component for the table headers and prompt inputs.
 */
const TableHeader = React.forwardRef(({ 
  header, 
  inputValues, 
  onInputChange, 
  onInputFocus, 
  onInputClick, 
  onHeaderClick 
}, ref) => {
  return (
    <thead>
      <tr>
        <th className="skip-column-header"></th>
        {header.map((cell, index) => (
          <th 
            key={index} 
            onClick={() => onHeaderClick(cell)} 
            className="clickable-header"
          >
            {cell || `[Col ${index + 1}]`}
          </th>
        ))}
      </tr>
      <tr>
        <th className="skip-column-header"></th>
        {header.map((_, index) => (
          <th key={index}>
            <textarea
              ref={(el) => (ref.current[index] = el)}
              className="header-input"
              rows="3"
              placeholder="Enter prompt..."
              value={inputValues[index]}
              onChange={(e) => onInputChange(index, e.target.value)}
              onFocus={(e) => onInputFocus(index, e.target.selectionStart)}
              onClick={(e) => onInputClick(index, e.target.selectionStart)}
              onKeyUp={(e) => onInputClick(index, e.target.selectionStart)}
              onSelect={(e) => onInputClick(index, e.target.selectionStart)}
            />
          </th>
        ))}
      </tr>
    </thead>
  );
});

export default TableHeader;
