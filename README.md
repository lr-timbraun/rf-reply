# RFP Analyzer

A specialized tool designed for Sales Engineers to analyze and generate responses for RFP (Request for Proposal) documents. It leverages Google Gemini AI to provide high-quality, context-aware answers.

## Overview

The RFP Analyzer streamlines the process of responding to complex technical requirements by:
- Processing Excel-based RFP documents.
- Utilizing Google's Gemini models to draft responses.
- Providing a secure way to manage API credentials and AI parameters.

## Key Features

- **Context-Aware Conversations**: The AI maintains a conversation history for each tab, ensuring responses are consistent and aware of previous requirements.
- **Unified Row Requests**: Multiple columns per row are processed in a single API call, ensuring perfect coordination between answers (e.g., matching a "Yes/No" status with its explanation).
- **AI-Powered Responses**: Directly integrated with the Google Generative AI SDK (`@google/generative-ai`).
- **Excel Workflow**: Upload RFP spreadsheets, select relevant columns, and process requirements in bulk or individually.
- **Documentation Reference**: Specify a documentation URL (e.g., a product manual) to guide the AI's knowledge base.
- **Secure Configuration**: API keys and sensitive settings are encrypted using AES (via `crypto-js`) before being stored in the browser's local storage.
- **Customizable AI Parameters**: Fine-tune the AI's behavior by adjusting temperature, max tokens, and additional system instructions.
- **Built-in User Manual**: Accessible documentation within the app to guide users through the workflow.

## Project Structure

- `rfp-analyzer/`: The core React application built with Vite.
- `rfp-analyzer/src/`: Contains React components, styling, and application logic.
- `rfp-analyzer/server.cjs`: A lightweight Node.js server to serve the production build.
- `rfp-analyzer/dist/`: Contains the optimized production build (created via `npm run build`).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Recommended: Latest LTS version)
- A Google Gemini API Key

### Installation

1. Navigate to the `rfp-analyzer` directory:
   ```bash
   cd rfp-analyzer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

#### Development Mode
To run the app in development mode with Hot Module Replacement (HMR):
```bash
npm run dev
```

#### Production Mode (Serving Built Files)
If you want to run the pre-built application using the included local server:

- **Windows**: Double-click `run.bat` (or run it via CMD/PowerShell).
- **macOS/Linux**: Run the shell script:
  ```bash
  ./run.sh
  ```
The application will be available at `http://localhost:3000`.

## Configuration

Upon launching the application, click on the **Settings** button to configure:
1. **API Key**: Your Google Gemini API key.
2. **Model**: Select the desired Gemini model (e.g., Gemini 1.5 Flash).
3. **Documentation Source**: Provide a URL for the AI to use as its primary knowledge reference.
4. **Additional System Instructions**: Define any extra context or persona details.

Settings are saved securely in your browser and are not sent to any backend other than the official Google AI APIs.

---
*Note: This tool is intended for internal use by Sales Engineers.*
