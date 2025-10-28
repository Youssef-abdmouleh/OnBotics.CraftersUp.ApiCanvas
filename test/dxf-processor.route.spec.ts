/**
 * Integration tests for DXF Processor API routes
 * Run with: yarn test
 */

import * as request from 'supertest';
import app from '../app';

describe('DXF Processor API', () => {
  const authHeader = 'Basic ' + Buffer.from('username:123456').toString('base64');

  describe('POST /api/process-dxf', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/process-dxf')
        .send({ textObjects: [] });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should reject invalid credentials', async () => {
      const badAuth = 'Basic ' + Buffer.from('wrong:password').toString('base64');
      const response = await request(app)
        .post('/api/process-dxf')
        .set('Authorization', badAuth)
        .send({ textObjects: [] });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_INVALID');
    });

    it('should reject missing textObjects field', async () => {
      const response = await request(app)
        .post('/api/process-dxf')
        .set('Authorization', authHeader)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid textObjects format', async () => {
      const response = await request(app)
        .post('/api/process-dxf')
        .set('Authorization', authHeader)
        .send({ textObjects: [{ invalid: 'data' }] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    // TODO: Add test with valid makerjs data
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});

