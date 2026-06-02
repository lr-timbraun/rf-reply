# RFP Analyzer (v2.0-dev)

An enterprise-grade tool designed for Sales and Presales Engineers to automate and verify responses for complex RFP (Request for Proposal) documents. It leverages advanced AI orchestration to generate consistent, context-aware answers from prioritized knowledge bases.

## Major Advancements in v2.0

- **Master Passphrase Security**: Fully secure local storage with user-provided encryption keys. No more hardcoded secrets.
- **Multi-Source Prioritization**: Mix and match Web, GitHub, MCP, and Context7 sources. Order them by importance to guide the AI's "source of truth".
- **AI-Powered Workflow Automation**:
    - **Discovery (Pre-Analysis)**: Automates the tedious mapping of requirements and headers.
    - **Generation**: High-quality response drafting with stateful memory and coordinated multi-column processing.
    - **QA (Post-Analysis)**: A fresh AI reviewer checks the final document for correctness and consistency.
- **Pluggable Architecture**: Modular system for adding new AI providers and custom documentation connectors.
- **Professional UX**: Multi-page settings manager, sidebar navigation, and full Dark Mode support.

## Core Features

- **Context-Aware Memory**: The AI remembers previous answers within a tab to maintain objective consistency.
- **Manual Feedback Loop**: Your edits help the AI learn. Manual corrections are fed back into the session history to improve subsequent answers.
- **Citations & Control**: Optional inclusion of localized "More Information" links for full transparency.
- **Excel Native**: Full preservation of original workbook formatting, styles, and formulas.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Recommended: Latest LTS)
- A Google Gemini API Key (or other supported AI providers)

### Quick Start

1.  **Install dependencies**:
    ```bash
    cd rfp-analyzer
    npm install
    ```
2.  **Launch the application**:
    - **Development**: `npm run dev`
    - **Production (Windows)**: Run `run.bat`
    - **Production (Linux/macOS)**: `./run.sh`
3.  **Initialize your Vault**: Set your Master Passphrase and configure your first AI preset and documentation sources.

## Configuration & Usage

Access the **Settings** panel to manage your environment:
- **AI Configurations**: Save multiple presets for different models (Flash vs. Pro) and temperatures.
- **Source Definitions**: Register documentation URLs, repositories, and context servers.
- **General Tab**: Select your active presets, enable/disable pre/post processing, and set your target response language.

---
*Note: This tool is intended for professional use by Technical Sales Engineers. All API keys and data remain local to your browser and are never transmitted to any central server besides the chosen AI provider.*
