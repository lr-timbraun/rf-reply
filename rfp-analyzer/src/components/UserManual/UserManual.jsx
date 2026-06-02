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
          <h2>1. Getting Started & Security</h2>
          <p>The RFP Analyzer helps you automate responses to Request for Proposals (RFP) using AI. To protect your API keys and tokens, the application uses a <strong>Master Passphrase</strong> security model.</p>
          <ul>
            <li><strong>Vault Initialization:</strong> The first time you use the app, you must set a Master Passphrase. This key is used to encrypt your settings at rest.</li>
            <li><strong>Unlocking:</strong> You must enter your passphrase on each new session to access your configurations.</li>
            <li><strong>Locking:</strong> Use the 🔒 icon in the header to manually lock your vault at any time.</li>
          </ul>
        </section>

        <section>
          <h2>2. Configuration Management</h2>
          <p>The system is divided into three main management areas:</p>
          
          <h3>AI Configurations</h3>
          <p>Create and manage multiple AI presets (e.g., "Fast Flash", "High Quality Pro"). Each configuration stores its own provider, model, and behavioral parameters.</p>
          
          <h3>Source Definitions</h3>
          <p>Define your knowledge bases. Supported types include:</p>
          <ul>
            <li><strong>Web Documentation:</strong> Single URLs to product documentation.</li>
            <li><strong>GitHub Repositories:</strong> Reference code and files directly from a repo (supports private tokens).</li>
            <li><strong>MCP Servers:</strong> Connect to remote Model Context Protocol servers for specialized tools.</li>
            <li><strong>Context7 Docs:</strong> Access up-to-date library documentation and code snippets.</li>
          </ul>

          <h3>General Settings</h3>
          <p>Link your configurations together:</p>
          <ul>
            <li><strong>Active Analyzer:</strong> Select which AI preset to use for generating answers.</li>
            <li><strong>Pre-Processor:</strong> Optionally select a different AI to handle workbook structure discovery.</li>
            <li><strong>Active Sources:</strong> Enable multiple sources and <strong>prioritize</strong> them using ↑/↓ arrows.</li>
            <li><strong>Citation Toggle:</strong> Enable or disable the addition of "More Information" links in the final Excel cells.</li>
          </ul>
        </section>

        <section>
          <h2>3. Workflow</h2>
          <h3>Step 1: Upload & Checkpoint</h3>
          <p>Drag and drop your <code>.xlsx</code> or <code>.xlsm</code> file directly onto the upload card, or click to browse. Once loaded, you will see a file summary. Click the prominent <strong>GO!</strong> button to proceed. If <strong>AI Pre-Analysis</strong> is enabled, a dedicated AI will automatically analyze the workbook structure to identify questionnaire tabs and columns for you before you select sheets.</p>
          
          <h3>Step 2: Interactive Table</h3>
          <p>Verify the detected headers. If incorrect, use the <strong>Arrow Bar Up</strong> icon (in the first 10 rows) to set the header row manually. Enter your prompt templates above the columns (e.g., <code>{'{Requirement}'}</code>). Hover over any icon button for a detailed description of what it does.</p>

          <h3>Step 3: Execution & Token Monitoring</h3>
          <ul>
            <li><strong>Context Awareness:</strong> The AI maintains a stateful chain, remembering previous answers to ensure global consistency across the tab.</li>
            <li><strong>Unified Requests:</strong> All column prompts for a single row are sent in one call to coordinate complex answers (like a Status and its corresponding logic).</li>
            <li><strong>Live Token Dashboard:</strong> Monitor your model consumption in real-time. The <strong>Tokens</strong> stats in the top-left displays your active session's cumulative token counts, broken down by Prompt (P) and Response (R).</li>
          </ul>

          <h3>Step 4: Post-Analysis Verification (Optional)</h3>
          <p>Once all rows are filled, click <strong>Verify Responses</strong>. A fresh AI session will review the entire document for correctness, consistency, and potential hallucinations.</p>

          <h3>Step 5: Review & Download</h3>
          <p>Manual edits are automatically fed back into the AI's memory. You have two final actions:</p>
          <ul>
            <li><strong>Download:</strong> Click <strong>Download</strong> at any time to save and export your current progress to an Excel file without closing your current workspace.</li>
            <li><strong>Close File:</strong> Click <strong>Close File</strong> when you are finished to safely clear the session and return to the main landing page.</li>
          </ul>
        </section>

        <section>
          <h2>4. Important Tips</h2>
          <ul>
            <li><strong>Priority Matters:</strong> The AI treats your source list as a hierarchy. Place your most trusted documentation at the top.</li>
            <li><strong>No Markdown:</strong> The system automatically instructs AI to avoid Markdown formatting for better Excel compatibility.</li>
            <li><strong>Token Management:</strong> If you expect very long answers, ensure your "Max Output Tokens" is set high enough in the AI configuration.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default UserManual;
