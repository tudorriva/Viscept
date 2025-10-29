<div align="center">
<img width="612" height="200" alt="rsz_chatgpt_image_oct_29_2025_06_20_28_pm-removebg-preview" src="https://github.com/user-attachments/assets/1e4b824e-2fb5-4c5e-b9af-46e805e4bc4d" />

<h1>Viscept: AI Diagram Builder</h1>
<p>Generate professional diagrams from natural language. Rendering happens in the browser; AI generation runs locally via Ollama.</p>

<!-- Badges -->
<img alt="Build" src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge" />
<img alt="Tests" src="https://img.shields.io/badge/tests-passing-success?style=for-the-badge" />
<img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" />
<img alt="Node" src="https://img.shields.io/badge/node-18%2B-339933?style=for-the-badge" />
<img alt="React" src="https://img.shields.io/badge/react-18-61dafb?style=for-the-badge" />
<img alt="TypeScript" src="https://img.shields.io/badge/typescript-5-3178c6?style=for-the-badge" />
<img alt="Docker" src="https://img.shields.io/badge/docker-supported-2496ed?style=for-the-badge" />
<img alt="LLM" src="https://img.shields.io/badge/llm-Ollama-informational?style=for-the-badge" />

<p>
<a href="#quick-start">Quick Start</a> •
<a href="#features">Features</a> •
<a href="#architecture">Architecture</a> •
<a href="#api-endpoints">API</a> •
<a href="#configuration">Configuration</a> •
<a href="#project-structure">Project Structure</a> •
<a href="#development">Development</a> •
<a href="#troubleshooting">Troubleshooting</a>
</p>
</div>

---

## Overview

Viscept is a local-first web application that converts natural-language prompts into diagram code and renders the result instantly. It supports Mermaid, DBML, Graphviz (DOT), and PlantUML (via conversion/optional server). The backend integrates with Ollama so models run on your machine.

- Frontend: React + Vite + Tailwind + TypeScript
- Backend: Node.js + Express + TypeScript
- AI: Ollama (local LLM inference)

---

## Features

- Natural-language prompts with fast generation
- Four diagram languages: Mermaid, DBML, Graphviz (DOT), PlantUML
- Live preview panel with immediate re-render
- Code editor with formatting
- Version history (up to 20) stored locally
- Export to PNG, SVG, and PDF
- Save/Load projects as JSON
- Keyboard shortcuts for common actions
- Docker support

---

## Quick Start

### Prerequisites

- Node.js 18 or newer
- Ollama installed and running locally
- Docker (optional)

### 1) Start Ollama

```bash
ollama pull mistral
ollama serve
```

Ollama listens on http://localhost:11434.

### 2) Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at http://localhost:3001.

### 3) Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Docker (optional)

```bash
# Ensure Ollama is running on the host
ollama serve

# From project root
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001

If Docker needs to reach Ollama on the host:
- macOS/Windows: OLLAMA_URL=http://host.docker.internal:11434/api/generate
- Linux: OLLAMA_URL=http://172.17.0.1:11434/api/generate

---

## Architecture

```
ai-diagram-builder/
├── frontend/   React + Vite (TypeScript)
└── backend/    Express API (TypeScript)  →  Ollama (local LLM)
```

Key components:
- Rendering: [`frontend/src/components/DiagramPreview.tsx`](frontend/src/components/DiagramPreview.tsx)
- API client: [`frontend/src/utils/api.ts`](frontend/src/utils/api.ts)
- Routes: [`backend/src/routes/diagramRoutes.ts`](backend/src/routes/diagramRoutes.ts)
- Controllers: [`backend/src/controllers/diagramController.ts`](backend/src/controllers/diagramController.ts)
- LLM service: [`backend/src/services/ollamaService.ts`](backend/src/services/ollamaService.ts)
- Formatting service: [`backend/src/services/formatterService.ts`](backend/src/services/formatterService.ts)
- Demo data: [`backend/src/services/demoService.ts`](backend/src/services/demoService.ts)

---

## Usage

1. Select a diagram type in the UI.
2. Describe your diagram in plain language.
3. Generate; the code and preview update instantly.
4. Edit code manually if needed.
5. Export (PNG/SVG/PDF) or Save the project as JSON.

Keyboard shortcuts:
- Ctrl+Enter — Generate
- Ctrl+S — Save project
- Ctrl+Shift+E — Export SVG

---

## API Endpoints

Base URL: http://localhost:3001

### POST /api/generate
Generate diagram code from a prompt.

Request:
```json
{
  "prompt": "Create a flowchart for user login",
  "diagramType": "mermaid"
}
```

Response:
```json
{
  "code": "graph TD\n  A[Start] --> B[Enter Credentials]\n  ...",
  "language": "mermaid",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

### POST /api/format
Format diagram code.

Request:
```json
{
  "code": "graph TD\nA-->B",
  "language": "mermaid"
}
```

Response:
```json
{
  "formatted": "graph TD\n  A --> B\n"
}
```

### GET /api/demo
Return sample diagrams for each supported type.

---

## Configuration

Backend (`backend/.env` or docker-compose):

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral
OLLAMA_TIMEOUT=30000
PORT=3001
NODE_ENV=development
PLANTUML_SERVER=https://www.plantuml.com/plantuml/svg/
STRICT_MODE=false
MAX_OUTPUT_LENGTH=10000
```

Frontend (Vite):

```env
VITE_API_URL=http://localhost:3001
```

---

## Project Structure

```
frontend/
  src/
    components/
      ChatPanel.tsx
      CodeEditor.tsx
      DiagramPreview.tsx
      HistoryPanel.tsx
      ControlPanel.tsx
    utils/
      api.ts
      exporters.ts
      converters.ts
    main.tsx
    index.css
  vite.config.ts
  tailwind.config.js

backend/
  src/
    routes/diagramRoutes.ts
    controllers/diagramController.ts
    services/
      ollamaService.ts
      formatterService.ts
      demoService.ts
    middleware/errorHandler.ts
    app.ts
    server.ts

templates/
  prompts/...
  samples/...
```

Additional documentation:
- [QUICK_START.md](QUICK_START.md)
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- [FILE_INDEX.md](FILE_INDEX.md)

---

## Development

Install dependencies and run dev servers:

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

Build:

```bash
make build
# or
npm run build --prefix frontend && npm run build --prefix backend
```

Tests:

```bash
cd backend && npm test
```

Lint and format:

```bash
# Frontend
cd frontend && npm run lint && npm run format
# Backend
cd backend && npm run lint && npm run format
```

---

## Troubleshooting

Cannot reach Ollama:
- Ensure `ollama serve` is running.
- Verify `OLLAMA_URL` points to the correct endpoint.
- Test with: `curl http://localhost:11434/api/tags`.

Diagram not rendering:
- Check browser console for errors.
- Validate syntax for the selected diagram type.
- Use the Format button to normalize code.

Docker cannot reach Ollama:
- macOS/Windows: `http://host.docker.internal:11434/api/generate`
- Linux: `http://172.17.0.1:11434/api/generate`

Model performance:
- Try a smaller model (for example `neural-chat`) if memory is limited.

---

## License

MIT License. See the LICENSE file if included.

---

## Acknowledgments

- Mermaid for client-side rendering
- Ollama for local LLM inference
- React, Vite, TypeScript, and Tailwind CSS for the web stack
