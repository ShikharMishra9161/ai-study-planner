const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../index');

test('register returns 400 when required fields are missing', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'demo@example.com' });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /name|required/i);
});

test('login returns 400 when password is too short', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'demo@example.com', password: '123' });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /at least 6|required/i);
});
