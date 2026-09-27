const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('node:crypto');

const app = require('../index');
const User = require('../models/User');
const connectDB = require('../config/db');

const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

test('POST /api/auth/refresh issues a new access token', async () => {
  await connectDB();
  await User.deleteMany({});

  const userId = new mongoose.Types.ObjectId();
  const refreshToken = jwt.sign({ id: userId.toString() }, refreshSecret, { expiresIn: '30d' });
  const user = await User.create({
    _id: userId,
    name: 'Refresh Tester',
    email: 'refresh.tester@example.com',
    password: 'hashed-password',
    refreshTokenHash: hashRefreshToken(refreshToken),
  });

  const response = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.id, user._id.toString());

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('POST /api/auth/refresh rotates and stores the new refresh token', async () => {
  await connectDB();
  await User.deleteMany({});

  const user = await User.create({
    name: 'Rotate Tester',
    email: 'rotate.tester@example.com',
    password: 'hashed-password',
    refreshTokenHash: hashRefreshToken('stale-token'),
  });

  const refreshToken = jwt.sign({ id: user._id.toString() }, refreshSecret, { expiresIn: '30d' });
  const originalHash = hashRefreshToken('stale-token');

  const response = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Invalid refresh token');

  const refreshedUser = await User.findById(user._id);
  assert.equal(refreshedUser.refreshTokenHash, originalHash);

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('POST /api/auth/login sets an httpOnly refresh cookie', async () => {
  await connectDB();
  await User.deleteMany({});

  const hashedPassword = await bcrypt.hash('secret123', 10);

  await User.create({
    name: 'Cookie User',
    email: 'cookie.user@example.com',
    password: hashedPassword,
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cookie.user@example.com', password: 'secret123' });

  assert.equal(response.status, 200);
  assert.ok(response.headers['set-cookie'].some((cookie) => cookie.startsWith('refreshToken=')));
  assert.ok(response.headers['set-cookie'].some((cookie) => cookie.includes('HttpOnly')));

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('POST /api/auth/logout revokes the current refresh token', async () => {
  await connectDB();
  await User.deleteMany({});

  const user = await User.create({
    name: 'Logout Tester',
    email: 'logout.tester@example.com',
    password: 'hashed-password',
    refreshTokenHash: hashRefreshToken('active-token'),
  });

  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const response = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`)
    .send({ refreshToken: 'active-token' });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Logged out successfully');

  const refreshedUser = await User.findById(user._id);
  assert.equal(refreshedUser.refreshTokenHash, null);

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('GET /api/auth/me returns the current user role', async () => {
  await connectDB();
  await User.deleteMany({});

  const user = await User.create({
    name: 'Role User',
    email: 'role.user@example.com',
    password: 'hashed-password',
    role: 'student',
  });

  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const response = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'student');

  await User.deleteMany({});
  await mongoose.disconnect();
});

test('GET /api/auth/admin-check rejects non-admin users', async () => {
  await connectDB();
  await User.deleteMany({});

  const user = await User.create({
    name: 'Student User',
    email: 'student.user@example.com',
    password: 'hashed-password',
    role: 'student',
  });

  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const response = await request(app)
    .get('/api/auth/admin-check')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Access denied: admin role required');

  await User.deleteMany({});
  await mongoose.disconnect();
});
