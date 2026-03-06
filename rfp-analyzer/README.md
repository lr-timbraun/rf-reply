# RFP Analyzer - Frontend Application

This is the React-based frontend for the RFP Analyzer tool, built with Vite and utilizing the Google Generative AI SDK.

## Key Technologies

- **React 19**: Modern UI library for the frontend.
- **Vite**: Ultra-fast build tool and development server.
- **@google/generative-ai**: Google's official library for Gemini API interaction.
- **ExcelJS**: Powerful library for reading and manipulating XLSX spreadsheets.
- **Crypto-js**: Used for AES encryption of API keys stored in local storage.

## Features

- **Excel Uploader**: Securely parses local Excel files and renders them in an interactive data table.
- **Interactive Data Table**: Allows users to select columns for requirements and target response locations.
- **AI-Powered Response Generation**: Processes selected requirements through Gemini models using a customizable system prompt.
- **Secure Settings**: Encrypts and persists user settings (API keys, model preferences, temperature) directly in the browser.
- **Built-in User Manual**: A dedicated help section explaining the end-to-end workflow.

## Development

### Installation

```bash
npm install
```

### Scripts

- `npm run dev`: Starts the Vite development server with HMR.
- `npm run build`: Generates the optimized production build in the `dist/` folder.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run preview`: Locally previews the production build.

## Project Structure

- `src/App.jsx`: Main entry point and state management for settings and navigation.
- `src/ExcelUploader.jsx`: Component for handling file uploads and initial data processing.
- `src/DataTable.jsx`: The core interactive component for managing RFP data and AI interaction.
- `src/Settings.jsx`: UI for managing API keys and model parameters.
- `src/UserManual.jsx`: Static documentation component.
- `src/assets/`: Static assets like logos and icons.

For information on how to serve the production build, please refer to the main [README.md](../README.md) in the project root.
