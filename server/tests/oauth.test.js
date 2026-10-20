const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('node:crypto');

const app = require('../index');
const User = require('../models/User');
const { connectTestDB } = require('./helpers/testDb');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

test('GET /api/auth/oauth/:provider/callback rejects a mismatched state', async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

  const response = await request(app)
    .get('/api/auth/oauth/google/callback?code=abc&state=forged')
    .set('Cookie', 'oauthState=google:expected');

  assert.equal(response.status, 302);
  assert.match(response.headers.location, /\/oauth\/callback\?error=invalid_state$/);
});

test('POST /api/auth/oauth/exchange issues tokens once for a valid code', async () => {
  await connectTestDB();
  await User.deleteMany({});

  const user = await User.create({
    name: 'OAuth Tester',
    email: 'oauth.tester@example.com',
    googleId: 'google-123',
    oauthCodeHash: hash('one-time-code'),
    oauthCodeExpires: new Date(Date.now() + 60_000),
  });

  const first = await request(app).post('/api/auth/oauth/exchange').send({ code: 'one-time-code' });
  assert.equal(first.status, 200);
  assert.ok(first.body.token);
  assert.equal(first.body.user.id, user._id.toString());

  const second = await request(app).post('/api/auth/oauth/exchange').send({ code: 'one-time-code' });
  assert.equal(second.status, 401);

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('POST /api/auth/oauth/exchange rejects an expired code', async () => {
  await connectTestDB();
  await User.deleteMany({});

  await User.create({
    name: 'Expired Tester',
    email: 'expired.tester@example.com',
    githubId: 'gh-1',
    oauthCodeHash: hash('stale-code'),
    oauthCodeExpires: new Date(Date.now() - 1000),
  });

  const response = await request(app).post('/api/auth/oauth/exchange').send({ code: 'stale-code' });
  assert.equal(response.status, 401);

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('POST /api/auth/login refuses password login for an OAuth-only account', async () => {
  await connectTestDB();
  await User.deleteMany({});

  await User.create({ name: 'No Password', email: 'nopass@example.com', googleId: 'google-456' });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nopass@example.com', password: 'whatever123' });

  assert.equal(response.status, 400);

  await User.deleteMany({});
  await mongoose.disconnect();
});
