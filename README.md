<div align="center">
<img width="612" height="200" alt="Viscept Logo" src="https://github.com/user-attachments/assets/1e4b824e-2fb5-4c5e-b9af-46e805e4bc4d" />

<h1>Viscept: AI Diagram Builder</h1>
<p><strong>Transform natural language into stunning diagrams in seconds.</strong></p>
<p>Ultra-fast, privacy-first diagram generation with local AI. No cloud uploads. Pure performance.</p>

<!-- Badges -->
<img alt="Build" src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge" />
<img alt="Tests" src="https://img.shields.io/badge/tests-passing-success?style=for-the-badge" />
<img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" />
<img alt="Node" src="https://img.shields.io/badge/node-18%2B-339933?style=for-the-badge" />
<img alt="React" src="https://img.shields.io/badge/react-18-61dafb?style=for-the-badge" />
<img alt="TypeScript" src="https://img.shields.io/badge/typescript-5-3178c6?style=for-the-badge" />
<img alt="Docker" src="https://img.shields.io/badge/docker-supported-2496ed?style=for-the-badge" />
<img alt="LLM" src="https://img.shields.io/badge/llm-Ollama-informational?style=for-the-badge" />

<br />

**[Quick Start](#quick-start) • [Features](#features) • [Architecture](#architecture) • [API](#api-endpoints) • [Config](#configuration) • [Structure](#project-structure)**

</div>

---

## What is Viscept?

**Viscept** is a blazing-fast, local-first web application that turns plain English (or any language) into production-ready diagram code. No subscriptions. No rate limits. No data sent to the cloud. Everything runs on your machine with Ollama.

### The Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + TypeScript (instant rendering)
- **Backend**: Express + Node.js 18+ + TypeScript (zero-latency API)
- **Brain**: Ollama (local LLM inference on your GPU/CPU)
- **Containerization**: Docker (one-command deployment)

## Features That Matter

| Feature | Benefit |
|---------|----------|
| **Natural Language Input** | Just describe your diagram. AI handles the rest. |
| **4 Diagram Languages** | Mermaid • DBML • Graphviz (DOT) • PlantUML |
| **Live Preview** | See changes in real-time as you edit |
| **Local-First Storage** | Version history (20+ versions), projects saved as JSON |
| **Export Everything** | PNG • SVG • PDF with one click |
| **No Cloud Required** | Everything runs on your machine. Zero latency. |
| **Privacy Built-In** | Your diagrams never leave your device |
| **Power User Shortcuts** | Ctrl+Enter (Generate), Ctrl+S (Save), Ctrl+Shift+E (Export SVG) |
| **Remote Access** | Access from another device via Tailscale or LAN |

## Quick Start

### Prerequisites

- **Node.js**: 18 or newer
- **Ollama**: [Download here](https://ollama.ai) — required for AI generation
- **Docker** (optional): For containerized deployment

### Option 1: Local Development (Fastest Setup)

```bash
# 1. Start Ollama on your machine
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
ollama serve

# 2. In a new terminal, start the backend
cd backend
npm install
npm run dev

# 3. In another terminal, start the frontend
cd frontend
npm install
npm run dev

# 4. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api/health
```

### Option 2: Docker (All-in-One)

```bash
# Ensure Ollama is running on your host machine
ollama serve

# From project root, spin everything up
docker compose up --build -d

# Done! Access:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api/health
```

### Option 3: Remote Access via Tailscale (From Another Device)

```bash
# On host machine:
1. Install Tailscale: tailscale.com
2. tailscale up (log in with your account)
3. tailscale ip -4 (note your Tailscale IP, e.g., 100.x.x.x)
4. docker compose up --build -d (start the app)

# On remote device:
1. Install Tailscale, log in with same account
2. Open browser: http://100.x.x.x:3000
3. You're in! Full AI generation works over the VPN.
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your Browser                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React UI (Vite)                                │   │
│  │  • Chat interface                               │   │
│  │  • Live diagram preview                         │   │
│  │  • Code editor with highlighting                │   │
│  └────────────────┬─────────────────────────────────┘   │
└─────────────────┼──────────────────────────────────────┘
                  │ HTTP/JSON
                  ▼
┌─────────────────────────────────────────────────────────┐
│           Backend (Express + Node.js)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/generate    → Generate from prompt         │   │
│  │  /api/chat/message → Chat-based modifications   │   │
│  │  /api/validate    → Visual validation (VLM)     │   │
│  │  /api/format      → Code formatting             │   │
│  │  /api/health      → System status               │   │
│  └────────────────┬─────────────────────────────────┘   │
└─────────────────┼──────────────────────────────────────┘
                  │
                  ▼
      ┌───────────────────────────┐
      │   Ollama (Local LLM)      │
      │  • qwen2.5-coder (7B)     │
      │  • granite3.2-vision (2B) │
      └───────────────────────────┘
```

### Key Components

- **[`frontend/src/utils/api.ts`](frontend/src/utils/api.ts)**: API client with intelligent URL fallback for remote access
- **[`frontend/src/components/ChatPanel.tsx`](frontend/src/components/ChatPanel.tsx)**: Chat interface for diagram conversations
- **[`frontend/src/components/DiagramPreview.tsx`](frontend/src/components/DiagramPreview.tsx)**: Real-time diagram rendering
- **[`backend/src/routes/diagramRoutes.ts`](backend/src/routes/diagramRoutes.ts)**: All endpoint definitions
- **[`backend/src/controllers/diagramController.ts`](backend/src/controllers/diagramController.ts)**: Request handling and validation
- **[`backend/src/services/ollamaService.ts`](backend/src/services/ollamaService.ts)**: AI generation engine
- **[`backend/src/services/visualValidationService.ts`](backend/src/services/visualValidationService.ts)**: VLM-based diagram inspection
- **[`backend/src/services/pipelineService.ts`](backend/src/services/pipelineService.ts)**: Self-correction loop (Generate → Render → Inspect → Correct)

## How to Use

### Basic Workflow

1. **Select a Diagram Type** — Choose from Mermaid, DBML, Graphviz, or PlantUML
2. **Describe Your Diagram** — Type in plain English (or any language)
3. **Generate** — Press Ctrl+Enter or click the Generate button
4. **Edit & Refine** — Modify the code or ask the AI to adjust it
5. **Export** — Save as PNG, SVG, PDF, or copy the code

### Pro Tips

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Generate diagram |
| `Ctrl+S` | Save project (JSON) |
| `Ctrl+Shift+E` | Export as SVG |
| `Ctrl+B` | Open command palette |

### Example Prompts

```
"Create a flowchart for OAuth2 authentication flow"
"Database schema for an e-commerce platform with users, products, orders"
"System architecture diagram for a microservices API"
"Class hierarchy for a C++ graphics engine"
"State machine for a vending machine"
```

---

## API Endpoints

**Base URL**: `http://localhost:3001` (or your remote Tailscale IP)

### Core Endpoints

#### `POST /api/generate`
Generate diagram code from a natural-language prompt.

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Flowchart for user login with 2FA",
    "diagramType": "mermaid"
  }'
```

**Response:**
```json
{
  "code": "graph TD\n  A[Start] --> B{Credentials OK?}\n  B -->|Yes| C[2FA Check]\n  ...",
  "language": "mermaid",
  "timestamp": "2026-03-17T12:00:00Z"
}
```

#### `POST /api/chat/message`
Generate or modify diagrams conversationally.

```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "chat-123",
    "message": "Add a database connection check",
    "diagramType": "mermaid",
    "currentDiagramCode": "graph TD\n  A[Start] --> B[Login]",
    "isFirstMessage": false
  }'
```

#### `POST /api/validate`
Validate a diagram visually using AI (VLM).

```bash
curl -X POST http://localhost:3001/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "graph TD\n  A[Start] --> B[Login]",
    "diagramType": "mermaid",
    "originalPrompt": "User login flow"
  }'
```

**Response** (validation result):
```json
{
  "status": "PASS",
  "reason": "Diagram is clear and readable",
  "confidence": 0.92,
  "suggestions": []
}
```

#### `POST /api/format`
Format and normalize diagram code.

```bash
curl -X POST http://localhost:3001/api/format \
  -H "Content-Type: application/json" \
  -d '{
    "code": "graph TD\nA-->B",
    "language": "mermaid"
  }'
```

#### `GET /api/health`
Check backend and Ollama status.

```bash
curl http://localhost:3001/api/health
```

**Response**:
```json
{
  "status": "ok",
  "ollama": {
    "online": true,
    "generativeModel": "qwen2.5-coder:7b-instruct-q4_K_M",
    "visionModel": "granite3.2-vision:2b"
  },
  "vlm": {
    "available": true,
    "model": "granite3.2-vision:2b"
  }
}
```

#### `GET /api/demo`
Get sample diagrams for each supported type.

```bash
curl http://localhost:3001/api/demo
```

---

## Configuration

### Backend Configuration

Set these environment variables in your shell or in `backend/.env`:

```env
# Ollama connection
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b-instruct-q4_K_M
OLLAMA_VLM_MODEL=granite3.2-vision:2b
OLLAMA_TIMEOUT=300000

# Server
PORT=3001
NODE_ENV=development

# Optional: PlantUML server (for PlantUML rendering)
PLANTUML_SERVER=https://www.plantuml.com/plantuml/svg/

# Output limits
MAX_OUTPUT_LENGTH=15000
MAX_VALIDATION_RETRIES=2
```

**Docker users**: Edit `docker-compose.yml`:

```yaml
environment:
  - OLLAMA_URL=http://host.docker.internal:11434  # macOS/Windows
  # - OLLAMA_URL=http://172.17.0.1:11434          # Linux
  - OLLAMA_MODEL=qwen2.5-coder:7b-instruct-q4_K_M
  - OLLAMA_VLM_MODEL=granite3.2-vision:2b
```

### Frontend Configuration

Frontend reads from Vite env vars:

```env
# Optional: Override backend API URL for production/remote access
VITE_API_URL=http://100.x.x.x:3001  # Tailscale IP, for example
```

---

## Project Structure

```
viscept/
├── frontend/                    # React + Vite frontend app
│   ├── src/
│   │   ├── components/         # React components (Chat, Editor, Preview, etc.)
│   │   ├── hooks/              # Custom hooks (useChat, useSettings, etc.)
│   │   ├── utils/
│   │   │   ├── api.ts          # Backend API client
│   │   │   ├── exporters.ts    # PNG/SVG/PDF export logic
│   │   │   └── converters.ts   # DBML ↔ Mermaid conversions
│   │   ├── App.tsx             # Main app entry point
│   │   ├── main.tsx            # Vite entry
│   │   └── index.css           # Tailwind + custom styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                     # Express + Node.js backend
│   ├── src/
│   │   ├── routes/             # API endpoint definitions
│   │   ├── controllers/        # Request handlers
│   │   ├── services/
│   │   │   ├── ollamaService.ts         # LLM generation
│   │   │   ├── visualValidationService.ts # VLM inspection
│   │   │   ├── pipelineService.ts       # Self-correction loop
│   │   │   ├── renderingService.ts      # Diagram rendering
│   │   │   ├── formatterService.ts      # Code formatting
│   │   │   └── demoService.ts           # Sample diagrams
│   │   ├── middleware/         # Error handling, CORS
│   │   ├── app.ts              # Express setup
│   │   └── server.ts           # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
│
├── templates/
│   ├── prompts/                # Example prompts
│   └── samples/                # Sample diagrams
│
├── docker-compose.yml          # All services
├── Makefile                    # Build shortcuts
└── README.md                   # You are here
```

---

## Development

### Installation

```bash
# Backend
cd backend && npm install

# Frontend  
cd frontend && npm install
```

### Running Locally

```bash
# Terminal 1: Backend dev server
cd backend && npm run dev

# Terminal 2: Frontend dev server
cd frontend && npm run dev

# Terminal 3 (on host): Ollama
ollama serve
```

### Production Build

```bash
# Build everything
make build

# Or manually:
npm run build --prefix frontend
npm run build --prefix backend
```

### Testing

```bash
cd backend && npm test
```

### Code Quality

```bash
# Format code
make format

# Lint
make lint
```

---

## Troubleshooting

### "Cannot connect to Ollama"

```bash
# Check Ollama is running on port 11434
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve

# Or pull a model first
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
```

### "500 error on /api/chat/message"

Make sure your configured models exist:

```bash
ollama list
# Should show:
# qwen2.5-coder:7b-instruct-q4_K_M
# granite3.2-vision:2b
```

### Docker Can't Reach Ollama

**macOS/Windows**: Use `http://host.docker.internal:11434` (already set in compose)  
**Linux**: Use `http://172.17.0.1:11434` — change this in `docker-compose.yml`

### Rendering Fails (mmdc not found)

This is okay! The app falls back to placeholder rendering. Diagrams still work fine in the browser preview.

---

## Additional Resources

- **[QUICK_START.md](QUICK_START.md)** — Fast setup guide
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** — Production deployment
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** — Technical deep dive
- **[FILE_INDEX.md](FILE_INDEX.md)** — Complete file reference
- **[Ollama Docs](https://ollama.ai)** — Learn about local LLMs
- **[Mermaid Syntax](https://mermaid.js.org)** — Diagram language reference

---

## License

MIT License — See [LICENSE](LICENSE) for details. Use Viscept freely in personal and commercial projects.

---

## Acknowledgments

Viscept is built on the shoulders of giants:

- **[Ollama](https://ollama.ai)** — Local LLM inference made easy
- **[Mermaid](https://mermaid.js.org)** — Fantastic client-side diagram rendering
- **[React](https://react.dev)** — UI framework with dev experience
- **[Vite](https://vitejs.dev)** — Lightning-fast frontend tooling
- **[Express](https://expressjs.com)** — Minimal, powerful backend framework
- **[TypeScript](https://www.typescriptlang.org)** — Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com)** — Utility-first CSS framework

---

## Contributing

Found a bug? Want to add a feature? Open an issue or PR on GitHub. All contributions welcome!

---

<div align="center">

### If you find Viscept useful, please star the repository!

**Made with care for diagram enthusiasts.**

</div>
