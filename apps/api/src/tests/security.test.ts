import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

describe('HTTP security and conventions', () => {
  it('serves process health without infrastructure details', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns the standard not-found envelope with a request id', async () => {
    const response = await request(app).get('/does-not-exist').expect(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND' },
    });
    expect(response.body.requestId).toBeTypeOf('string');
  });

  it('does not grant CORS to an unlisted origin', async () => {
    const response = await request(app).get('/health').set('Origin', 'https://attacker.invalid').expect(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows the configured storefront origin', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://localhost:5173').expect(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects unauthorized customer and admin access', async () => {
    await request(app).get('/api/v1/me').expect(401);
    await request(app).get('/api/v1/admin/dashboard').expect(401);
    await request(app).get('/api/v1/me').set('Authorization', 'Bearer invalid').expect(401);
  });

  it('rejects cookie-authenticated mutations without an allowlisted origin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refresh_token=fake')
      .expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 413 for oversized JSON', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'a@example.com', password: 'x'.repeat(2_100_000) })
      .expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
