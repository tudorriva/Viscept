#!/bin/bash

# Setup instructions for Ollama (local LLM inference)
# This script provides step-by-step guidance for installing Ollama and running
# the recommended models for Viscept (AI Diagram Builder).

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                      Viscept - Ollama Setup Guide                          ║
╚════════════════════════════════════════════════════════════════════════════╝

This guide sets up Ollama for local AI diagram generation and validation.
Viscept uses TWO models that run entirely on your machine — no cloud required!

  • Qwen2.5-Coder-7B  → generates diagram code (Mermaid, DBML, DOT, PlantUML)
  • Qwen2.5-VL-3B     → visual judge that inspects rendered diagrams for errors

STEP 1: Install Ollama
────────────────────────────────────────────────────────────────────────────

Visit: https://ollama.ai/download

Select your operating system:
  - macOS: Download and run the .dmg installer
  - Linux: Run: curl https://ollama.ai/install.sh | sh
  - Windows: Download and run the .exe installer

After installation, verify:
  $ ollama --version

STEP 2: Download the Recommended Models
────────────────────────────────────────────────────────────────────────────

GENERATIVE MODEL (code generation):

  RECOMMENDED (8GB RAM / ~5.5GB VRAM):
    $ ollama pull qwen2.5-coder:7b

  FAST ALTERNATIVE (4GB RAM / ~2.5GB VRAM):
    $ ollama pull qwen2.5-coder:3b

  LEGACY (not recommended — lower diagram accuracy):
    $ ollama pull mistral

VISUAL VALIDATION MODEL (diagram inspection):

  RECOMMENDED (~3GB):
    $ ollama pull qwen2.5-vl:3b

  LIGHTER ALTERNATIVE (~2GB):
    $ ollama pull moondream

Quick setup (pull both recommended models):
  $ ollama pull qwen2.5-coder:7b && ollama pull qwen2.5-vl:3b

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
    -d '{"model":"qwen2.5-coder:7b","prompt":"Hello","stream":false}'

You should see JSON output with a response.

List installed models:
  $ ollama list

STEP 5: Configure Viscept
────────────────────────────────────────────────────────────────────────────

Edit backend/.env (or copy from backend/.env.example):

  OLLAMA_URL=http://localhost:11434
  OLLAMA_MODEL=qwen2.5-coder:7b
  OLLAMA_VLM_MODEL=qwen2.5-vl:3b

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
     - macOS/Windows: http://host.docker.internal:11434
     - Linux: http://172.17.0.1:11434
  3. Start containers: docker-compose up --build

TROUBLESHOOTING
────────────────────────────────────────────────────────────────────────────

Q: Ollama is running but backend can't reach it
A: Check OLLAMA_URL in backend/.env (port 11434 by default)

Q: Model is slow
A: Use qwen2.5-coder:3b for faster generation
   Or disable auto-validation in Settings → AI Models

Q: Error: Model not found
A: Run: ollama pull qwen2.5-coder:7b (or your model name)

Q: Backend returns fallback template
A: Ollama might be offline. Run: ollama serve in another terminal

Q: VRAM is insufficient for both models
A: Viscept uses Sequential Loading — it swaps models automatically.
   Reduce VRAM usage further with: OLLAMA_MODEL=qwen2.5-coder:3b

Q: Visual validation is slow
A: Disable "Auto Visual Validation" in Settings and use the
   "Check Diagram" button on demand instead.

RECOMMENDED MODELS FOR VISCEPT
────────────────────────────────────────────────────────────────────────────

Generation (Code → Diagram):
  qwen2.5-coder:7b  (~5.5GB) — Best quality, 88%+ HumanEval ★ Recommended
  qwen2.5-coder:3b  (~2.5GB) — Fast, 30+ tok/s, good quality
  mistral            (~4.4GB) — Legacy, lower diagram accuracy

Visual Validation (Image → Judgement):
  qwen2.5-vl:3b     (~3GB)   — Best OCR + spatial reasoning ★ Recommended
  moondream          (~2GB)   — Faster, weaker at small text

Set in backend/.env:
  OLLAMA_MODEL=qwen2.5-coder:7b
  OLLAMA_VLM_MODEL=qwen2.5-vl:3b

For more info:
  - Ollama: https://ollama.ai
  - Models: https://ollama.ai/library
  - Qwen2.5-Coder: https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct

════════════════════════════════════════════════════════════════════════════

EOF
