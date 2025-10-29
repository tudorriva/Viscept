# 📑 AI Diagram Builder - Complete File Index

## 🎯 START HERE

👉 **Read this first:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (Main entry point)

📖 **Documentation:**
- [README.md](README.md) — Full features, API, architecture
- [QUICK_START.md](QUICK_START.md) — Quick setup (TL;DR)
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) — Project overview
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — This file + run commands

---

## 🏗️ PROJECT STRUCTURE

```
ai-diagram-builder/
├── 📚 Documentation
│   ├── README.md                   ← Full documentation
│   ├── QUICK_START.md             ← Quick setup guide
│   ├── PROJECT_SUMMARY.md         ← Project overview
│   └── DEPLOYMENT_GUIDE.md        ← Run instructions (THIS FILE)
│
├── ⚙️ Configuration
│   ├── .env.example               ← Environment template
│   ├── .gitignore                 ← Git ignore
│   ├── Makefile                   ← Development commands
│   ├── docker-compose.yml         ← Container orchestration
│   └── Dockerfile                 ← Backend container
│
├── 🔙 backend/ (Node.js + Express + TypeScript)
│   ├── package.json               ← Dependencies
│   ├── tsconfig.json              ← TypeScript config
│   ├── jest.config.js             ← Test config
│   ├── .eslintrc.json             ← Linting config
│   ├── .prettierrc.json           ← Formatting config
│   ├── .env.example               ← Backend env template
│   ├── Dockerfile                 ← Backend container
│   │
│   └── src/
│       ├── server.ts              ← Entry point
│       ├── app.ts                 ← Express setup
│       ├── routes/
│       │   └── diagramRoutes.ts    ← API routes
│       ├── controllers/
│       │   └── diagramController.ts ← Request handlers
│       ├── services/
│       │   ├── ollamaService.ts    ← Ollama integration
│       │   ├── formatterService.ts ← Code formatting
│       │   └── demoService.ts      ← Sample data
│       ├── middleware/
│       │   └── errorHandler.ts     ← Error handling
│       └── __tests__/
│           └── api.test.ts         ← Jest tests
│
├── 🎨 frontend/ (React + Vite + TypeScript)
│   ├── package.json               ← Dependencies
│   ├── tsconfig.json              ← TypeScript config
│   ├── vite.config.ts             ← Vite build config
│   ├── tailwind.config.js         ← Tailwind config
│   ├── postcss.config.js          ← PostCSS config
│   ├── .eslintrc.json             ← Linting config
│   ├── .prettierrc.json           ← Formatting config
│   ├── .env.example               ← Frontend env template
│   ├── Dockerfile                 ← Frontend container
│   ├── index.html                 ← HTML template
│   │
│   └── src/
│       ├── main.tsx               ← React entry
│       ├── App.tsx                ← Root component
│       ├── index.css              ← Tailwind styles
│       ├── components/
│       │   ├── ChatPanel.tsx       ← Prompt input
│       │   ├── CodeEditor.tsx      ← Code editor
│       │   ├── DiagramPreview.tsx  ← Diagram renderer
│       │   ├── HistoryPanel.tsx    ← Version history
│       │   └── ControlPanel.tsx    ← Export/save buttons
│       └── utils/
│           ├── api.ts             ← API client
│           ├── exporters.ts       ← PNG/SVG/PDF export
│           ├── storage.ts         ← localStorage
│           └── converters.ts      ← Diagram converters
│
├── 📝 templates/
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
└── 📜 scripts/
    └── setup-local-ollama.sh       ← Ollama setup guide
```

---

## 🚀 QUICK START COMMANDS

### **Without Docker (Recommended for First-Time)**

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Backend
cd backend
npm install
npm run dev
# Runs on http://localhost:3001

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000

# Browser
# Open http://localhost:3000
```

### **With Docker Compose**

```bash
# Terminal 1: Ollama (must run locally)
ollama serve

# Terminal 2: Docker
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

---

## 📋 KEY FILES EXPLAINED

### Backend Core
| File | Purpose |
|------|---------|
| `server.ts` | Starts Express server on port 3001 |
| `app.ts` | Express app with CORS, middleware setup |
| `diagramRoutes.ts` | Routes: POST /api/generate, /api/format, GET /api/demo |
| `diagramController.ts` | Request validation, calls services |
| `ollamaService.ts` | Calls local Ollama endpoint, returns diagram code |
| `formatterService.ts` | Formats code for Mermaid/PlantUML/DBML/Graphviz |
| `demoService.ts` | Returns sample diagrams for testing |

### Frontend Core
| File | Purpose |
|------|---------|
| `App.tsx` | Main React component, manages app state |
| `ChatPanel.tsx` | Prompt input, diagram type selector, generate button |
| `CodeEditor.tsx` | Textarea for editing code, format button |
| `DiagramPreview.tsx` | Renders diagrams using Mermaid/PlantUML/etc |
| `HistoryPanel.tsx` | Shows last 20 versions, click to restore |
| `ControlPanel.tsx` | Export (PNG/SVG/PDF), Save/Load buttons |
| `api.ts` | axios client for backend API calls |
| `storage.ts` | localStorage for projects and history |

### Configuration
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Defines backend, frontend, optional PlantUML containers |
| `Dockerfile` | Backend container (Node.js Alpine) |
| `frontend/Dockerfile` | Frontend container (multi-stage build) |
| `Makefile` | Commands: make dev, make build, make up, make down |
| `.env.example` | Environment variables template |

---

## 🎯 FEATURES IMPLEMENTED

### ✅ Frontend
- [x] Chat interface with prompt input
- [x] Diagram type selector (Mermaid, PlantUML, DBML, Graphviz)
- [x] Code editor with format button
- [x] Live diagram preview (auto-updates)
- [x] Version history sidebar (localStorage, 20 versions)
- [x] Export buttons (PNG, SVG, PDF)
- [x] Save/Load projects (JSON)
- [x] Keyboard shortcuts (Ctrl+Enter, Ctrl+S, Ctrl+Shift+E)
- [x] Responsive 3-column layout
- [x] Tailwind CSS styling

### ✅ Backend
- [x] POST /api/generate (AI diagram generation)
- [x] POST /api/format (code formatting)
- [x] GET /api/demo (sample diagrams)
- [x] Ollama integration
- [x] Fallback templates
- [x] Error handling
- [x] Input validation
- [x] Output sanitization

### ✅ Diagram Support
- [x] Mermaid (flowcharts, sequence, class, state)
- [x] PlantUML (UML, component diagrams)
- [x] DBML (entity-relationship)
- [x] Graphviz DOT (directed graphs)

### ✅ DevOps
- [x] Docker & Docker Compose
- [x] TypeScript throughout
- [x] ESLint & Prettier
- [x] Jest tests
- [x] Makefile
- [x] Comprehensive docs

---

## 📊 STATISTICS

- **Total Files**: ~50
- **Backend Code**: ~600 lines TypeScript
- **Frontend Code**: ~800 lines React/TypeScript
- **Documentation**: 4 markdown files
- **Sample Data**: 4 diagrams + 4 prompt templates
- **Configuration**: 15+ files
- **Tests**: Jest test suite

---

## 🔧 COMMON COMMANDS

```bash
# Development
make dev          # Show dev setup instructions
make build        # Build production bundles
make install      # Install all dependencies

# Docker
make up           # Start containers
make down         # Stop containers
make logs         # View container logs

# Code Quality
make lint         # Run ESLint
make format       # Run Prettier
make test         # Run Jest tests
```

---

## 📱 UI LAYOUT

```
┌────────────────────────────────────────────────────────────┐
│              AI Diagram Builder                              │
├──────────┬─────────────────────┬──────────┬────────────────┤
│  CHAT    │   CODE EDITOR       │ PREVIEW  │  HISTORY       │
│  • Type  │ • Textarea/Monaco   │  • Live  │  • Versions    │
│  • Prompt│ • Format button     │  • Mermaid/PlantUML/etc │
│  • Send  │ • Line count        │  • Error display │
│          │                     │          │ • Click restore│
└──────────┴─────────────────────┴──────────┴────────────────┘
│ Error display (if any)                                       │
├────────────────────────────────────────────────────────────┤
│ Buttons: PNG | SVG | PDF | Save Project | Load Project     │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ TECH STACK

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Axios (HTTP)
- Mermaid.js (rendering)
- html-to-image (export)
- jsPDF (PDF export)

**Backend:**
- Node.js ≥ 18
- Express (web framework)
- TypeScript
- Axios (HTTP client)
- Jest (testing)
- ESLint + Prettier (code quality)

**Infrastructure:**
- Docker & Docker Compose
- Ollama (local LLM)

---

## 🔐 SECURITY

**Current (Local Development):**
- No external exposure
- localStorage for persistence
- Input validation & sanitization
- Error handling

**Production Considerations:**
- Add API authentication
- Rate limiting
- Use managed LLM (AWS/Azure/GCP)
- HTTPS/TLS
- Secrets management

---

## 📞 SUPPORT

### Issue: "Cannot reach Ollama"
```bash
# Check Ollama is running
ollama serve

# Test endpoint
curl http://localhost:11434/api/tags
```

### Issue: "Diagram not rendering"
- Check browser console (F12)
- Try Format Code button
- Load demo data to verify

### Issue: "Docker can't reach Ollama"
- Edit docker-compose.yml
- Set OLLAMA_URL to: `http://host.docker.internal:11434/api/generate` (macOS/Windows)
- Or: `http://172.17.0.1:11434/api/generate` (Linux)

### Issue: "Model not found"
```bash
ollama pull mistral
ollama list
```

---

## 🎓 NEXT STEPS

1. **Install Ollama** → https://ollama.ai
2. **Run Ollama** → `ollama serve`
3. **Download Model** → `ollama pull mistral`
4. **Start Backend** → `cd backend && npm install && npm run dev`
5. **Start Frontend** → `cd frontend && npm install && npm run dev`
6. **Open Browser** → http://localhost:3000
7. **Generate Diagrams!** → Type prompt + Ctrl+Enter

---

## 📖 DOCUMENTATION GUIDE

| Document | Content |
|----------|---------|
| README.md | Full features, API docs, architecture, deployment |
| QUICK_START.md | TL;DR setup, common commands, troubleshooting |
| PROJECT_SUMMARY.md | File structure, tech stack, feature checklist |
| DEPLOYMENT_GUIDE.md | Run instructions, quick commands, complete guide |

**Read in order:**
1. Start → DEPLOYMENT_GUIDE.md (this file)
2. Quick setup → QUICK_START.md
3. Full docs → README.md
4. Deep dive → PROJECT_SUMMARY.md

---

## ✅ VERIFICATION CHECKLIST

Before running, ensure you have:

- [ ] Node.js ≥ 18 installed (`node --version`)
- [ ] Ollama installed and running (`ollama serve`)
- [ ] Model downloaded (`ollama pull mistral`)
- [ ] Project files in place (`ls -la backend/ frontend/`)
- [ ] Dependencies not installed yet (will do with `npm install`)

---

## 🎉 YOU'RE READY!

Everything is set up. Follow the **QUICK START COMMANDS** above to run the app.

**Questions?**
- Check troubleshooting sections in QUICK_START.md
- Review README.md for full API documentation
- Check code comments in backend/frontend src/

**Happy diagramming!** 🎨📊

---

*AI Diagram Builder v1.0.0*
*Created: October 20, 2025*
*Status: ✅ Complete & Ready to Run*
