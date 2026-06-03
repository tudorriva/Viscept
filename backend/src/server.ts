/**
 * Main server entry point.
 * NOTE: dotenv/config MUST be the first import so that process.env is populated
 * before any other module reads environment variables at the top level.
 */

import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;
const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const generativeModel =
  provider === 'groq'
    ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b')
    : provider === 'gemini'
      ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
      : (process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b');
const visionModel =
  provider === 'groq'
    ? (process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct')
    : provider === 'gemini'
      ? (process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash')
      : (process.env.VISION_MODEL || process.env.OLLAMA_VLM_MODEL || 'granite3.2-vision:2b');

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Viscept Backend running on http://0.0.0.0:${PORT} (all interfaces)`);
  console.log(`   Provider: ${provider}`);
  if (provider === 'ollama') {
    console.log(`   Ollama endpoint: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
  }
  console.log(`   Generative Model: ${generativeModel}`);
  console.log(`   Vision Model: ${visionModel}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
