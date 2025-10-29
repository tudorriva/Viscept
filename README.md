# AI Diagram Builder

A personal web app that takes natural-language prompts and returns rendered diagrams in multiple languages (Mermaid, PlantUML, DBML, Graphviz). Powered by local LLM inference via Ollama.

## Features

✨ **Core Features:**
- 💬 Chat-style prompt interface for natural language diagram requests
- 🎨 Support for 4 diagram types: **Mermaid**, **PlantUML**, **DBML (ERD)**, **Graphviz (DOT)**
- ✏️ Monaco editor with live syntax highlighting
- 👁️ Real-time diagram preview with auto-re-render on code changes
- 📊 History/Versions panel (last 20 versions stored in localStorage)
- 💾 Save/Load projects as JSON
- 📥 Export diagrams as **PNG**, **SVG**, or **PDF**
- ⌨️ Keyboard shortcuts: `Ctrl+Enter` (send), `Ctrl+S` (save), `Ctrl+Shift+E` (export SVG)
- 🎯 Regenerate with AI, format code, strict mode toggle
- 📱 Responsive 3-column layout (Chat | Code | Preview)

## Architecture

```
ai-diagram-builder/
├── frontend/          # React + Vite + Tailwind + Monaco
├── backend/           # Node.js + Express
├── templates/         # Sample prompts and diagram files
├── scripts/           # Setup helpers
├── docker-compose.yml # Multi-container orchestration
├── Dockerfile         # Backend
├── Dockerfile.frontend # Frontend
├── Makefile          # Dev/build tasks
├── .env.example      # Environment config
└── README.md
```

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Ollama** (local LLM inference) — [Install here](https://ollama.ai)
- **Docker & Docker Compose** (optional, for containerized setup)

### Option 1: Run Locally (without Docker)

#### 1. Install Ollama & Pull a Model

```bash
# Install Ollama from https://ollama.ai
# Then download a code-generation model:
ollama pull mistral
# or
ollama pull neural-chat
```

Start Ollama in the background:
```bash
ollama serve
```
(Ollama will listen on `http://localhost:11434`)

#### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will start on `http://localhost:3001`

#### 3. Frontend Setup (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

#### 4. Open Browser

Navigate to **http://localhost:3000** and start generating diagrams!

---

### Option 2: Run with Docker Compose

#### 1. Ensure Ollama is Running

```bash
ollama serve
```

#### 2. Configure .env

Copy `.env.example` to `.env` (or leave defaults):
```bash
cp .env.example .env
```

**Important:** On Docker, use `http://host.docker.internal:11434/api/generate` (macOS/Windows) or `http://172.17.0.1:11434/api/generate` (Linux) to reach host Ollama.

#### 3. Start Containers

```bash
make up
# or
docker-compose up --build
```

- Frontend: **http://localhost:3000**
- Backend: **http://localhost:3001**
- PlantUML Server (optional): **http://localhost:8080** (if `ENABLE_PLANTUML=true`)

#### 4. Stop Containers

```bash
make down
# or
docker-compose down
```

---

## Usage Guide

### 1. Generate a Diagram

1. **Select Diagram Type**: Choose from Mermaid, PlantUML, DBML, or Graphviz in the top selector.
2. **Type Prompt**: Enter a natural-language request in the chat box, e.g.:
   ```
   Create a Mermaid flowchart for a user login workflow with error handling
   ```
3. **Submit**: Press `Ctrl+Enter` or click "Generate".
4. **View Result**: The AI-generated code appears in the Monaco editor; the diagram renders in the preview pane.

### 2. Edit Code Manually

- Click in the **Code Editor** panel and modify the diagram code.
- The preview updates **in real-time**.
- Use the **Format Code** button to auto-format (basic formatting).

### 3. Regenerate with AI

- Click **"Regenerate with AI"** to ask the AI to create a new version based on the last prompt.
- New version appears in History panel.

### 4. Save & Load Projects

- **Save**: Click **"Save Project"** to download a `.json` file containing:
  - All prompt history
  - Current code
  - Diagram type and metadata
- **Load**: Click **"Load Project"** and select a previously saved `.json` file.

### 5. Export Diagrams

- **PNG**: Rasterized version (transparent background).
- **SVG**: Scalable vector graphics (best for web/print).
- **PDF**: Portable document format.

### 6. Version History

- Every generated diagram is stored in the **History Panel** (right sidebar).
- Browse back through the last **20 versions**.
- Click to restore any previous version.
- Versions are persisted in `localStorage`.

### 7. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send prompt & generate diagram |
| `Ctrl+S` | Save project to JSON |
| `Ctrl+Shift+E` | Export diagram as SVG |

---

## API Endpoints

### Backend API Reference

#### `POST /api/generate`

Generate diagram code from a natural-language prompt.

**Request:**
```json
{
  "prompt": "Create a Mermaid diagram for a database schema",
  "diagramType": "mermaid|plantuml|dbml|graphviz"
}
```

**Response:**
```json
{
  "code": "graph TD\n  A --> B",
  "language": "mermaid",
  "timestamp": "2025-10-20T12:34:56Z"
}
```

**Fallback:** If Ollama is unavailable, returns a skeleton template for the requested diagram type.

---

#### `POST /api/format`

Format/pretty-print diagram code (optional).

**Request:**
```json
{
  "code": "graph TD\n A-->B",
  "language": "mermaid"
}
```

**Response:**
```json
{
  "formatted": "graph TD\n  A --> B\n"
}
```

---

#### `GET /api/demo`

Get sample diagrams for each type (demo/testing).

**Response:**
```json
{
  "dbml": "...",
  "mermaid": "...",
  "plantuml": "...",
  "graphviz": "..."
}
```

---

## Configuration

### Environment Variables

**Backend (.env or docker-compose):**
```env
# Local LLM endpoint
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral

# Server
PORT=3001
NODE_ENV=development

# Optional PlantUML server
PLANTUML_SERVER=https://www.plantuml.com/plantuml/svg/
```

**Frontend (vite.config.ts):**
```env
VITE_API_URL=http://localhost:3001
```

---

## Diagram Type Recommendations

### Mermaid
Best for: Flowcharts, sequence diagrams, class diagrams, state machines.
```
Example: "Create a Mermaid flowchart showing the steps to book a flight ticket."
```

### PlantUML
Best for: Component diagrams, deployment diagrams, UML class diagrams.
```
Example: "Draw a PlantUML sequence diagram of a banking transaction."
```

### DBML (Entity-Relationship Diagram)
Best for: Database schemas, relationships, constraints.
```
Example: "Design a DBML ERD for an e-commerce platform with users, products, and orders."
```

### Graphviz (DOT)
Best for: Directed graphs, dependency graphs, technical diagrams.
```
Example: "Create a Graphviz diagram of a microservices architecture."
```

---

## Local LLM Setup

### Recommended Models

**For Code/Diagram Generation:**
- `mistral` — Fast, 7B, excellent code quality
- `neural-chat` — Optimized for conversations
- `codellama` — Specialized for code (requires ~14GB RAM)

### Setup Script

```bash
bash scripts/setup-local-ollama.sh
```

This script provides instructions to:
1. Download and install Ollama
2. Pull a recommended model (`mistral` or `neural-chat`)
3. Configure the `OLLAMA_MODEL` environment variable
4. Verify the endpoint is reachable

---

## Development

### Build Frontend & Backend

```bash
make build
# or
npm run build --prefix frontend && npm run build --prefix backend
```

### Run Dev Servers

```bash
make dev
# Terminal 1:
cd backend && npm run dev
# Terminal 2:
cd frontend && npm run dev
```

### Run Tests

```bash
cd backend
npm test
```

### Linting & Formatting

```bash
# Frontend
cd frontend
npm run lint
npm run format

# Backend
cd backend
npm run lint
npm run format
```

---

## Project Structure Details

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatPanel.tsx         # Prompt input & send
│   │   ├── CodeEditor.tsx        # Monaco editor
│   │   ├── DiagramPreview.tsx    # Renderer (Mermaid/Graphviz/PlantUML/DBML)
│   │   ├── HistoryPanel.tsx      # Version history sidebar
│   │   └── ControlPanel.tsx      # Export, save, load, format buttons
│   ├── hooks/
│   │   ├── useDiagramRenderer.ts # Render logic
│   │   └── useHistory.ts         # localStorage persistence
│   ├── utils/
│   │   ├── api.ts                # Backend API client
│   │   ├── exporters.ts          # PNG/SVG/PDF export
│   │   └── dbml-to-mermaid.ts    # DBML converter (fallback)
│   ├── App.tsx
│   ├── index.css                 # Tailwind
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js

backend/
├── src/
│   ├── controllers/
│   │   └── diagramController.ts  # API logic
│   ├── services/
│   │   ├── ollamaService.ts      # Ollama integration
│   │   ├── formatterService.ts   # Code formatting
│   │   └── demoService.ts        # Sample data
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── sanitizer.ts          # Output cleanup
│   │   └── templates.ts          # Fallback templates
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── server.ts                 # Main entry
│   └── app.ts                    # Express setup
├── package.json
├── tsconfig.json
└── jest.config.js

templates/
├── prompts/
│   ├── mermaid-examples.txt
│   ├── plantuml-examples.txt
│   ├── dbml-examples.txt
│   └── graphviz-examples.txt
└── samples/
    ├── company-erp.dbml
    ├── user-login-flow.mermaid
    ├── class-hierarchy.plantuml
    └── microservices-arch.dot

scripts/
└── setup-local-ollama.sh         # Ollama setup guide
```

---

## Deployment Notes

### Local Development (Recommended for Initial Use)

- Ollama runs on your machine; no internet required (after model is cached).
- All processing is local—no data sent to external services.
- Perfect for privacy-sensitive diagram generation.

### Cloud Deployment

If scaling beyond local dev:

1. **Managed Inference Services:**
   - AWS SageMaker, Azure ML, GCP Vertex AI
   - Replicate, Together AI (serverless LLM APIs)
   - Scale dynamically based on load.

2. **Self-Hosted LLM:**
   - Deploy Ollama on a VM with GPU (e.g., AWS EC2 with NVIDIA GPU).
   - Set `OLLAMA_URL` to the remote endpoint.
   - Add authentication (API keys) before exposing publicly.

3. **Containerized Frontend/Backend:**
   - Already in `Dockerfile` and `docker-compose.yml`.
   - Deploy to Kubernetes, ECS, or App Platform.

4. **Security Considerations:**
   - **Never expose Ollama endpoint publicly without authentication.**
   - Add API key authentication in the backend before production.
   - Rate-limit requests to prevent abuse.
   - Sanitize and validate user inputs.

---

## Troubleshooting

### Issue: "Cannot reach Ollama"

**Solution:**
1. Ensure Ollama is running: `ollama serve`
2. Check `OLLAMA_URL` in `.env` — should be `http://localhost:11434/api/generate`
3. In Docker, use `http://host.docker.internal:11434/api/generate` (macOS/Windows)
4. Test: `curl -X POST http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"test"}'`

### Issue: Diagram Not Rendering

**Solution:**
1. Check browser console for JavaScript errors.
2. Verify the generated code syntax for the diagram type.
3. Try the **Format Code** button to clean up whitespace.
4. Check the **History Panel** for previous working versions.

### Issue: Model Timeout

**Solution:**
1. Increase `OLLAMA_TIMEOUT` in backend `.env` (default 30s).
2. Use a smaller/faster model: `ollama pull neural-chat` (smaller than mistral).
3. Check system resources: `ollama serve` requires RAM proportional to model size.

### Issue: Export Not Working

**Solution:**
1. Ensure preview renders successfully (no red errors).
2. Check browser permissions for file downloads.
3. Export function converts SVG → PNG/PDF; ensure diagram is valid.

---

## Contributing & License

This is a personal project template. Modify freely for your use case.

### License

MIT (see LICENSE if included)

---

## Support & Next Steps

- **Feedback?** Add issues or enhancements to suit your workflow.
- **Custom Models?** Edit `OLLAMA_MODEL` in `.env` and test with your preferred LLM.
- **More Diagram Types?** Add support for Plotly, Vega, or other diagram libraries by extending the renderer and backend logic.

---

## Changelog

**v1.0.0** (2025-10-20)
- Initial release
- Support for Mermaid, PlantUML, DBML, Graphviz
- Local Ollama integration
- Full UI with export, save/load, history
- Docker + docker-compose setup
- Keyboard shortcuts and responsive layout

---

Happy diagramming! 🎨
