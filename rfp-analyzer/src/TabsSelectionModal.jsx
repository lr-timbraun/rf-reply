import React, { useState } from 'react';
import './TabsSelectionModal.css';

const TabsSelectionModal = ({ tabs, onConfirm, onCancel }) => {
  const [selectedTabs, setSelectedTabs] = useState([]);

  const handleCheckboxChange = (tabName) => {
    setSelectedTabs((prevSelectedTabs) => {
      if (prevSelectedTabs.includes(tabName)) {
        return prevSelectedTabs.filter((t) => t !== tabName);
      } else {
        return [...prevSelectedTabs, tabName];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedTabs);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Which tabs do you wish to reply to?</h2>
        </div>
        <div className="modal-body">
          <div className="tabs-list">
            {tabs.map((tabName) => (
              <div 
                key={tabName} 
                className="tab-item" 
                onClick={() => handleCheckboxChange(tabName)}
              >
                <input
                  type="checkbox"
                  id={tabName}
                  name={tabName}
                  value={tabName}
                  checked={selectedTabs.includes(tabName)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleCheckboxChange(tabName);
                  }}
                />
                <label htmlFor={tabName} onClick={(e) => e.preventDefault()}>
                  {tabName}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onCancel}>Cancel</button>
          <button 
            className="confirm-button" 
            onClick={handleConfirm}
            disabled={selectedTabs.length === 0}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabsSelectionModal;
