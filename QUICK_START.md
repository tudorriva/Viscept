# AI Diagram Builder - Quick Start Guide

## Project Overview

**AI Diagram Builder** is a full-stack web application that generates diagrams from natural-language prompts using local LLM inference (Ollama). Supports 4 diagram types: Mermaid, PlantUML, DBML (ERD), and Graphviz (DOT).

### Key Features
- 💬 Chat interface for natural language diagram requests
- 🎨 4 diagram types (Mermaid, PlantUML, DBML, Graphviz)
- ✏️ Monaco editor for code editing
- 👁️ Live diagram preview with auto-render
- 📚 Version history (localStorage, 20 versions)
- 💾 Save/Load projects as JSON
- 📥 Export as PNG, SVG, or PDF
- ⌨️ Keyboard shortcuts (Ctrl+Enter, Ctrl+S, Ctrl+Shift+E)
- 🐳 Docker & Docker Compose support

---

## Prerequisites

- **Node.js** ≥ 18
- **Ollama** (local LLM) — [Download](https://ollama.ai)
- **Docker & Docker Compose** (optional)

---

## Quick Start (Local, Without Docker)

### 1. Install Ollama and Download a Model

```bash
# Download and install Ollama from https://ollama.ai
# Then, in a terminal, run:
ollama serve

# In another terminal, download a model (takes 5-15 mins):
ollama pull mistral
# OR for faster inference:
ollama pull neural-chat
```

Ollama will listen on `http://localhost:11434`

### 2. Clone/Navigate to Project

```bash
cd ai-diagram-builder
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (or copy from .env.example)
# Default values should work if Ollama is on localhost:11434
# cat .env.example > .env

# Start backend dev server
npm run dev
```

Backend runs on `http://localhost:3001`

### 4. Frontend Setup (New Terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start frontend dev server
npm run dev
```

Frontend runs on `http://localhost:3000`

### 5. Open Browser

Navigate to **http://localhost:3000** and start generating diagrams!

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker and Docker Compose installed
- Ollama running locally: `ollama serve`

### Steps

```bash
# 1. Navigate to project root
cd ai-diagram-builder

# 2. Configure environment (optional, defaults provided)
cp .env.example .env

# 3. For macOS/Windows, edit docker-compose.yml if needed:
#    Set OLLAMA_URL=http://host.docker.internal:11434/api/generate
#    For Linux: http://172.17.0.1:11434/api/generate

# 4. Build and start containers
docker-compose up --build

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Stop Containers

```bash
docker-compose down
```

---

## Makefile Commands (Quick Reference)

```bash
make dev          # Show instructions for running dev servers locally
make build        # Build frontend and backend
make up           # Start Docker containers
make down         # Stop Docker containers
make logs         # View Docker logs
make install      # Install dependencies for both frontend/backend
make lint         # Run ESLint
make format       # Run Prettier
make test         # Run backend tests
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral                          # or neural-chat, codellama
OLLAMA_TIMEOUT=30000                          # milliseconds
PORT=3001
NODE_ENV=development
PLANTUML_SERVER=https://www.plantuml.com/plantuml/svg/
STRICT_MODE=false
MAX_OUTPUT_LENGTH=10000
```

### Frontend (Vite config)

```env
VITE_API_URL=http://localhost:3001            # Backend API URL
```

---

## Usage

### Generate a Diagram

1. **Select Diagram Type** (top selector): Mermaid, PlantUML, DBML, or Graphviz
2. **Type Prompt**: Natural language description, e.g.:
   ```
   Create a Mermaid flowchart for a user login workflow
   ```
3. **Send**: Press `Ctrl+Enter` or click "✨ Generate"
4. **View**: Code appears in editor, diagram renders in preview
5. **Edit**: Modify code directly; preview updates in real-time

### Export Diagrams

- **PNG**: Rasterized image (transparent background)
- **SVG**: Vector graphic (scalable, best for web)
- **PDF**: Portable document format

### Save & Load Projects

- **Save**: `Ctrl+S` or click "💾 Save Project" → downloads `.json` file
- **Load**: Click "📂 Load Project" → select saved `.json` file
- **History**: Right sidebar shows last 20 versions; click to restore

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send prompt & generate |
| `Ctrl+S` | Save project |
| `Ctrl+Shift+E` | Export as SVG |

---

## API Endpoints (Backend)

### POST /api/generate

Generate diagram code from a prompt.

**Request:**
```json
{
  "prompt": "Create a DBML ERD for a blog with users, posts, and comments",
  "diagramType": "dbml"
}
```

**Response:**
```json
{
  "code": "Table users {...}",
  "language": "dbml",
  "timestamp": "2025-10-20T12:00:00Z"
}
```

### POST /api/format

Format diagram code.

**Request:**
```json
{
  "code": "graph TD\nA-->B",
  "language": "mermaid"
}
```

**Response:**
```json
{
  "formatted": "graph TD\n  A --> B\n",
  "language": "mermaid",
  "originalLength": 14,
  "formattedLength": 18,
  "timestamp": "2025-10-20T12:00:00Z"
}
```

### GET /api/demo

Fetch sample diagrams for all types.

**Response:**
```json
{
  "mermaid": "graph TD\n  ...",
  "plantuml": "@startuml\n  ...",
  "dbml": "Table users {...}",
  "graphviz": "digraph {...}",
  "timestamp": "2025-10-20T12:00:00Z"
}
```

### GET /api/health

Health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T12:00:00Z"
}
```

---

## Folder Structure

```
ai-diagram-builder/
├── README.md                          # Main documentation
├── .env.example                       # Environment template
├── docker-compose.yml                 # Docker orchestration
├── Dockerfile                         # Backend container
├── Makefile                           # Development commands
├── .gitignore
│
├── backend/                           # Node.js + Express API
│   ├── src/
│   │   ├── server.ts                 # Entry point
│   │   ├── app.ts                    # Express setup
│   │   ├── routes/diagramRoutes.ts   # API routes
│   │   ├── controllers/diagramController.ts
│   │   ├── services/
│   │   │   ├── ollamaService.ts      # Ollama integration
│   │   │   ├── formatterService.ts   # Code formatting
│   │   │   └── demoService.ts        # Sample data
│   │   ├── middleware/errorHandler.ts
│   │   └── __tests__/api.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── .prettierrc.json
│   ├── jest.config.js
│   └── .env.example
│
├── frontend/                          # React + Vite app
│   ├── src/
│   │   ├── main.tsx                  # Entry
│   │   ├── App.tsx                   # Root component
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── DiagramPreview.tsx
│   │   │   ├── HistoryPanel.tsx
│   │   │   └── ControlPanel.tsx
│   │   ├── utils/
│   │   │   ├── api.ts                # Backend API client
│   │   │   ├── exporters.ts          # PNG/SVG/PDF export
│   │   │   ├── storage.ts            # localStorage persistence
│   │   │   └── converters.ts         # DBML/Graphviz converters
│   │   ├── index.css                 # Tailwind styles
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .eslintrc.json
│   ├── .prettierrc.json
│   ├── Dockerfile
│   └── .env.example
│
├── templates/
│   ├── prompts/
│   │   ├── mermaid-examples.txt
│   │   ├── plantuml-examples.txt
│   │   ├── dbml-examples.txt
│   │   └── graphviz-examples.txt
│   └── samples/
│       ├── company-erp.dbml
│       ├── user-login-flow.mermaid
│       ├── class-hierarchy.plantuml
│       └── microservices-arch.dot
│
└── scripts/
    └── setup-local-ollama.sh          # Ollama setup guide
```

---

## Building for Production

### Build Frontend & Backend

```bash
make build

# Or manually:
cd frontend && npm run build && cd ../backend && npm run build
```

Outputs:
- Frontend: `frontend/dist/`
- Backend: `backend/dist/`

### Build Docker Images

```bash
docker-compose build

# Or just backend:
docker build -t ai-diagram-builder:latest .
```

---

## Troubleshooting

### Issue: Backend can't reach Ollama

**Solution:**
1. Ensure Ollama is running: `ollama serve` (in separate terminal)
2. Check `OLLAMA_URL` in `backend/.env` — should be `http://localhost:11434/api/generate`
3. Test manually:
   ```bash
   curl -X POST http://localhost:11434/api/generate \
     -d '{"model":"mistral","prompt":"test","stream":false}'
   ```

### Issue: Docker containers can't reach Ollama

**Solution:**
1. On Docker, Ollama on host is not at `localhost` (inside container)
2. Edit `docker-compose.yml` and set `OLLAMA_URL`:
   - **macOS/Windows**: `http://host.docker.internal:11434/api/generate`
   - **Linux**: `http://172.17.0.1:11434/api/generate`

### Issue: Diagram not rendering

**Solution:**
1. Check browser console for errors (F12)
2. Verify generated code syntax
3. Try **Format Code** button to clean up whitespace
4. Check **History** panel for a working version

### Issue: Slow diagram generation

**Solution:**
1. Model is processing; wait or check Ollama logs
2. Use smaller/faster model: `ollama pull neural-chat`
3. Reduce prompt complexity

### Issue: Model not found

**Solution:**
```bash
ollama pull mistral
# List available models:
ollama list
```

---

## Development Tips

### Hot Reload

Both frontend and backend support hot reload in dev mode:
```bash
cd backend && npm run dev   # Auto-reloads on src/ changes
cd frontend && npm run dev  # Vite hot reload
```

### Testing

```bash
cd backend && npm test       # Run Jest tests
```

### Code Quality

```bash
npm run lint                 # ESLint check
npm run format              # Prettier formatting
```

### Debugging Backend

```bash
cd backend
NODE_DEBUG=express npm run dev
```

---

## Deployment (Cloud)

### Before Deploying
1. **Never expose Ollama endpoint publicly** — add authentication layer
2. Use a managed LLM endpoint (AWS SageMaker, Azure ML, Replicate, etc.)
3. Set up rate limiting, input validation, caching
4. Use HTTPS/TLS for all connections

### Deployment Options

**Option 1: Managed LLM API**
- Replace local Ollama with API (e.g., Replicate, Together AI)
- Update `OLLAMA_URL` to point to managed endpoint
- Add authentication headers

**Option 2: Self-Hosted LLM on VM**
- Deploy Ollama on EC2/VM with GPU
- Run backend on same or different machine
- Set `OLLAMA_URL` to remote endpoint

**Option 3: Containerized on Kubernetes**
- Use existing `Dockerfile` and `docker-compose.yml`
- Deploy to EKS, AKS, GKE, or DigitalOcean Apps
- Use secrets for `OLLAMA_URL` and credentials

**Option 4: Serverless**
- Deploy frontend to Vercel, Netlify
- Deploy backend to AWS Lambda, Google Cloud Functions (requires API gateway)

---

## Extending the Project

### Add a New Diagram Type

1. **Backend**: Add to `generateWithOllama()` in `ollamaService.ts`
2. **Frontend**: Add option in `ChatPanel.tsx` select
3. **Renderer**: Add case in `DiagramPreview.tsx`
4. **Formatter**: Add formatting logic in `formatterService.ts`

### Add Custom Models

Edit `backend/.env`:
```env
OLLAMA_MODEL=neural-chat
# or
OLLAMA_MODEL=codellama
```

### Integrate Different LLM Provider

Replace `ollamaService.ts` with your provider's API client:
```typescript
// Example: Using OpenAI API
const response = await openai.createCompletion({
  model: 'gpt-3.5-turbo',
  prompt: userMessage,
  ...
});
```

---

## License

MIT (see LICENSE if included)

---

## Support

For issues, suggestions, or contributions:
1. Check `troubleshooting` section above
2. Review backend/frontend logs
3. Test with demo data (`Load Demo` button)
4. Verify Ollama is running and model is installed

---

## Summary

| Task | Command |
|------|---------|
| Install Ollama | Visit https://ollama.ai |
| Start Ollama | `ollama serve` |
| Download model | `ollama pull mistral` |
| Install deps | `npm install` (in backend/ and frontend/) |
| Dev (local) | `cd backend && npm run dev` + `cd frontend && npm run dev` |
| Dev (Docker) | `docker-compose up --build` |
| Build | `make build` |
| Test | `cd backend && npm test` |
| Format code | `npm run format` |
| Lint | `npm run lint` |

Happy diagramming! 🎨
