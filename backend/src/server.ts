/**
 * Main server entry point.
 * NOTE: dotenv/config MUST be the first import so that process.env is populated
 * before any other module reads environment variables at the top level.
 */

import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Viscept Backend running on http://localhost:${PORT}`);
  console.log(`   Ollama endpoint: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
  console.log(`   Generative Model: ${process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'}`);
  console.log(`   Vision Model: ${process.env.OLLAMA_VLM_MODEL || 'moondream:latest'}`);
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
