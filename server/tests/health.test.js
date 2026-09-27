const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../index');

test('GET /api/health returns ok and database state', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.ok(response.body.db === 'connected' || response.body.db === 'disconnected');
});

test('POST /api/auth/register rejects missing fields', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'demo@example.com' });

  assert.equal(response.status, 400);
  assert.ok(response.body.message.includes('name') || response.body.message.includes('required'));
});
