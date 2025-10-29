#!/bin/bash

# Setup instructions for Ollama (local LLM inference)
# This script provides step-by-step guidance for installing Ollama and running models locally.

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                  AI Diagram Builder - Ollama Setup Guide                   ║
╚════════════════════════════════════════════════════════════════════════════╝

This guide will help you set up Ollama to provide local LLM inference for
diagram generation. Ollama runs models entirely on your machine—no cloud 
required!

STEP 1: Install Ollama
────────────────────────────────────────────────────────────────────────────

Visit: https://ollama.ai/download

Select your operating system:
  - macOS: Download and run the .dmg installer
  - Linux: Run: curl https://ollama.ai/install.sh | sh
  - Windows: Download and run the .exe installer

After installation, verify:
  $ ollama --version

STEP 2: Download a Model
────────────────────────────────────────────────────────────────────────────

For diagram generation, we recommend:

  FAST (4GB RAM needed):
    $ ollama pull neural-chat

  BALANCED (8GB RAM needed):
    $ ollama pull mistral

  SPECIALIZED FOR CODE (14GB RAM needed):
    $ ollama pull codellama

Example: Download mistral
  $ ollama pull mistral

This downloads the model (can take 5-10 minutes depending on your connection).

STEP 3: Start Ollama Server
────────────────────────────────────────────────────────────────────────────

In a terminal, run:
  $ ollama serve

You should see:
  > Listening on 127.0.0.1:11434

This starts the Ollama API server on localhost:11434

STEP 4: Verify Ollama is Working
────────────────────────────────────────────────────────────────────────────

In another terminal, test the endpoint:
  $ curl -X POST http://localhost:11434/api/generate \
    -d '{"model":"mistral","prompt":"Hello","stream":false}'

You should see JSON output with a response.

STEP 5: Configure AI Diagram Builder
────────────────────────────────────────────────────────────────────────────

Edit backend/.env:
  OLLAMA_URL=http://localhost:11434/api/generate
  OLLAMA_MODEL=mistral

Then start the backend:
  $ cd backend && npm install && npm run dev

And frontend (in a new terminal):
  $ cd frontend && npm install && npm run dev

Navigate to http://localhost:3000 and start generating diagrams!

STEP 6: Using Docker (Optional)
────────────────────────────────────────────────────────────────────────────

If running with Docker Compose:
  1. Ensure Ollama is running locally: ollama serve
  2. Edit docker-compose.yml and set OLLAMA_URL to:
     - macOS/Windows: http://host.docker.internal:11434/api/generate
     - Linux: http://172.17.0.1:11434/api/generate
  3. Start containers: docker-compose up --build

TROUBLESHOOTING
────────────────────────────────────────────────────────────────────────────

Q: Ollama is running but backend can't reach it
A: Check OLLAMA_URL in backend/.env (port 11434 by default)

Q: Model is slow
A: Use a smaller model (neural-chat vs codellama)
   Or reduce prompt complexity

Q: Error: Model not found
A: Run: ollama pull mistral (or your model name)

Q: Backend returns fallback template
A: Ollama might be offline. Run: ollama serve in another terminal

RECOMMENDED MODELS FOR DIAGRAMS
────────────────────────────────────────────────────────────────────────────

neural-chat (3.5GB): Fastest, good for simple diagrams
mistral (4.4GB): Balanced speed/quality, recommended
codellama (7.7GB): Best for complex code-heavy diagrams

Set in backend/.env:
  OLLAMA_MODEL=mistral

For more info:
  - Ollama: https://ollama.ai
  - Models: https://ollama.ai/library
  - Documentation: https://github.com/jmorganca/ollama

════════════════════════════════════════════════════════════════════════════

EOF
