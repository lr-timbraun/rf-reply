import React from 'react';
import './UserManual.css';

const UserManual = ({ onBack }) => {
  return (
    <div className="manual-container">
      <header className="manual-header">
        <h1>User Manual</h1>
        <button onClick={onBack} className="back-button">Back</button>
      </header>
      <main className="manual-content">
        <section>
          <h2>1. Getting Started</h2>
          <p>The RFP Analyzer helps you automate responses to Request for Proposals (RFP) using the Gemini AI model. It processes Excel files and fills in answers based on your specific prompts.</p>
        </section>

        <section>
          <h2>2. Setup & Configuration</h2>
          <p>Before processing any files, you must configure the Gemini API:</p>
          <ul>
            <li>Click the <strong>Settings</strong> button in the header.</li>
            <li>Enter your <strong>Gemini API Key</strong>.</li>
            <li>Click <strong>Test Connection</strong> to validate your key and load available models.</li>
            <li>Select your preferred <strong>Model</strong> and adjust the <strong>Temperature</strong> (0.2 is recommended for professional replies).</li>
            <li>Set the <strong>Response Language</strong> to your desired output language.</li>
            <li>Click <strong>Save Settings</strong> to store your configuration securely.</li>
          </ul>
        </section>

        <section>
          <h2>3. Workflow</h2>
          <h3>Step 1: Upload</h3>
          <p>Select your <code>.xlsx</code> or <code>.xls</code> file from your computer.</p>
          
          <h3>Step 2: Tab Selection</h3>
          <p>Choose the sheets you want to process from the modal that appears. You will process them one by one.</p>

          <h3>Step 3: Header Detection</h3>
          <p>The app automatically detects the table header. If it's wrong, look for the green <strong>^</strong> icon in the first 10 rows and click it to set that row as the header manually.</p>

          <h3>Step 4: Prompting</h3>
          <p>Enter your instructions in the text areas above the columns you want to fill. Click any table header to insert it as a placeholder (e.g., <code>{'{Requirement}'}</code>). The placeholder will be replaced with the actual data from each row automatically.</p>
          <p>Click the red <strong>X</strong> on any row to skip it entirely.</p>

          <h3>Step 5: Execution</h3>
          <ul>
            <li>Click <strong>Go!</strong> to start processing. The app processes 5 rows at a time in parallel.</li>
            <li>Use <strong>Stop Processing</strong> if you need to halt the AI and adjust your prompts.</li>
          </ul>

          <h3>Step 6: Review & Edit</h3>
          <p>Click on any generated cell to <strong>edit the text manually</strong>. Press Enter or click outside of the cell to save your changes. Press Esc to cancel the changes you are making.</p>
          <p>To fully re-generate an answer, click the refresh button inside any of the generated answers cells.</p>

          <h3>Step 7: Download</h3>
          <p>Click <strong>Next</strong> to move through tabs. On the final tab, click <strong>Finish</strong> to automatically download the updated Excel file with all your original formatting preserved.</p>
        </section>

        <section>
          <h2>4. Important Tips</h2>
          <ul>
            <li><strong>Strict Options:</strong> If you need the AI to pick from a list (e.g., "Standard", "Development"), include those options in your prompt. The app will ensure only the exact option text is used.</li>
            <li><strong>No Markdown:</strong> The AI is instructed not to use bold or italics to ensure the text looks clean in Excel.</li>
            <li><strong>Sources:</strong> Citations are automatically appended to long answers in the Excel export but are excluded for short "option-based" answers to prevent validation errors.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default UserManual;
