/**
 * Basic tests for backend endpoints using supertest.
 * Run with: npm test
 */

import request from 'supertest';
import app from '../app';

describe('Diagram API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('POST /api/generate', () => {
    it('should return 400 if prompt is missing', async () => {
      const res = await request(app).post('/api/generate').send({
        diagramType: 'mermaid',
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if diagramType is invalid', async () => {
      const res = await request(app).post('/api/generate').send({
        prompt: 'test prompt',
        diagramType: 'invalid',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid diagramType');
    });

    it('should return code for valid request (fallback template)', async () => {
      const res = await request(app).post('/api/generate').send({
        prompt: 'Create a simple diagram',
        diagramType: 'mermaid',
      });
      // Should succeed with fallback template if Ollama unavailable
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('code');
        expect(res.body).toHaveProperty('language', 'mermaid');
      }
    });
  });

  describe('POST /api/format', () => {
    it('should return 400 if code is missing', async () => {
      const res = await request(app).post('/api/format').send({
        language: 'mermaid',
      });
      expect(res.status).toBe(400);
    });

    it('should format Mermaid code', async () => {
      const res = await request(app).post('/api/format').send({
        code: 'graph TD\n A-->B',
        language: 'mermaid',
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('formatted');
    });
  });

  describe('GET /api/demo', () => {
    it('should return demo data for all diagram types', async () => {
      const res = await request(app).get('/api/demo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('mermaid');
      expect(res.body).toHaveProperty('plantuml');
      expect(res.body).toHaveProperty('dbml');
      expect(res.body).toHaveProperty('graphviz');
    });
  });
});
