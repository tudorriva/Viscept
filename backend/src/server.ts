/**
 * Main server entry point.
 */

import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Viscept Backend running on http://localhost:${PORT}`);
  console.log(`   Ollama endpoint: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
  console.log(`   Generative Model: ${process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'}`);
  console.log(`   Vision Model: ${process.env.OLLAMA_VLM_MODEL || 'qwen2.5-vl:3b'}`);
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
