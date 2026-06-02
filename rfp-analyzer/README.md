# RFP Analyzer - Frontend Application (v2.0-dev)

The React-based frontend for the RFP Analyzer tool, featuring a highly modular AI architecture, prioritized multi-source documentation, and a secure configuration vault.

## Key Technologies

- **React 19**: Modern UI library for the frontend.
- **Vite 8**: Ultra-fast build tool and development server.
- **Master Passphrase Security**: User-provided passphrase used for local AES encryption (via `crypto-js`), ensuring API keys are never stored in plain text.
- **Pluggable AI & Source Providers**: Abstracted interfaces allowing for diverse AI models (Gemini, etc.) and knowledge bases (Web, GitHub, MCP, Context7).
- **ExcelJS**: Powerful library for reading and manipulating XLSX spreadsheets with original formatting preservation.

## Advanced Features

- **Multi-Source Prioritization**: Define multiple documentation sources and repositories, then prioritize them to guide the AI's reasoning.
- **Independent Pre/Post Processing**:
    - **Pre-Analysis**: Automated workbook structure discovery (tabs, headers, and column prompts).
    - **Post-Analysis Verification**: A batch QA step where a fresh AI checks all responses for correctness and global consistency.
- **AI Configuration Presets**: Save and switch between different AI models and parameter sets for discovery versus execution.
- **Interactive Data Table**: Rich spreadsheet interface with inline editing, row skipping, and dynamic prompt templating.
- **Manual Feedback Loop**: Manual corrections are fed back into the stateful AI chain, enabling "learning" within a session.
- **Dark Mode Support**: Full-scale compatibility across all management views and interactive components.

## Development

### Installation

```bash
npm install
```

### Scripts

- `npm run dev`: Starts the Vite development server with HMR.
- `npm run build`: Generates the optimized production build.
- `npm run lint`: Runs ESLint for architectural and code quality checks.
- `npm run preview`: Locally previews the production build.

## Project Structure

- `src/services/providers/`: Encapsulates AI-specific logic (e.g., Gemini).
- `src/services/sources/`: Modular source connectors (GitHub, Web, MCP, Context7).
- `src/components/DataTable/`: The core interactive logic for managing RFP processing.
- `src/components/Settings/`: Multi-page sidebar management for AI and Sources.
- `src/hooks/useSettings.js`: Central security hook managing the encrypted vault and global merges.

For full deployment instructions, please refer to the main [README.md](../README.md).
