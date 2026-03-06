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
            <li>Enter your <strong>Gemini API Key</strong> and click <strong>Test Connection</strong>.</li>
            <li>Select your preferred <strong>Model</strong>.</li>
            <li>Set a <strong>Documentation Source</strong> URL (e.g., your product's official help site) to give the AI a specific knowledge base.</li>
            <li>Adjust the <strong>Temperature</strong> (0.2 is recommended for professional replies).</li>
            <li>Click <strong>Save Settings</strong> to store your configuration securely (AES-encrypted in your browser).</li>
          </ul>
        </section>

        <section>
          <h2>3. Workflow</h2>
          <h3>Step 1: Upload</h3>
          <p>Select your <code>.xlsx</code> or <code>.xls</code> file from your computer.</p>
          
          <h3>Step 2: Tab Selection</h3>
          <p>Choose the sheets you want to process. You will process them one by one.</p>

          <h3>Step 3: Header Detection</h3>
          <p>The app automatically detects the table header. If it's wrong, look for the green <strong>^</strong> icon in the first 10 rows and click it to set that row as the header manually.</p>

          <h3>Step 4: Prompting</h3>
          <p>Enter instructions in the text areas above the columns. Click any table header to insert it as a placeholder (e.g., <code>{'{Requirement}'}</code>). This will be replaced with data from each row.</p>
          <p>Click the red <strong>X</strong> on any row to skip it.</p>

          <h3>Step 5: Execution</h3>
          <ul>
            <li>Click <strong>Go!</strong> to start.</li>
            <li><strong>Context Awareness:</strong> The AI remembers previous rows in the current tab, reducing repetition.</li>
            <li><strong>Unified Requests:</strong> The app sends all column prompts for a single row in one call, ensuring that answers across columns (like a "Status" and an "Explanation") are perfectly coordinated.</li>
            <li>Use <strong>Reset History</strong> if you want the AI to "forget" previous rows and start fresh.</li>
          </ul>

          <h3>Step 6: Review & Edit</h3>
          <p>Click on any generated cell to <strong>edit text manually</strong>. Press Enter to save. Use the refresh icon in a cell to re-generate that specific row's answers.</p>

          <h3>Step 7: Download</h3>
          <p>On the final tab, click <strong>Finish</strong> to download the updated Excel file with all original formatting preserved.</p>
        </section>

        <section>
          <h2>4. Important Tips</h2>
          <ul>
            <li><strong>Strict Options:</strong> If you need the AI to pick from a list (e.g., "Yes", "No", "Partial"), include those options in your prompt.</li>
            <li><strong>No Markdown:</strong> The AI is automatically instructed to avoid bold or italics for a clean Excel look.</li>
            <li><strong>Sources:</strong> Citations are included for long answers but omitted for short "option-based" answers to prevent Excel validation errors.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default UserManual;
