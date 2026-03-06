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
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Which tabs do you wish to reply to?</h2>
        <div className="tabs-list">
          {tabs.map((tabName) => (
            <div key={tabName} className="tab-item">
              <input
                type="checkbox"
                id={tabName}
                name={tabName}
                value={tabName}
                checked={selectedTabs.includes(tabName)}
                onChange={() => handleCheckboxChange(tabName)}
              />
              <label htmlFor={tabName}>{tabName}</label>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default TabsSelectionModal;
