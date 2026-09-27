const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../index');
const User = require('../models/User');
const connectDB = require('../config/db');

async function makeToken(role = 'student') {
  const user = await User.create({
    name: role === 'admin' ? 'Admin User' : 'Regular User',
    email: role === 'admin' ? 'admin.role@example.com' : 'student.role@example.com',
    password: 'hashed-password',
    role,
  });

  return {
    user,
    token: jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' }),
  };
}

test('GET /api/auth/admin-check allows admins and rejects students', async () => {
  await connectDB();
  await User.deleteMany({});

  const admin = await makeToken('admin');
  const student = await makeToken('student');

  const adminResponse = await request(app)
    .get('/api/auth/admin-check')
    .set('Authorization', `Bearer ${admin.token}`);

  const studentResponse = await request(app)
    .get('/api/auth/admin-check')
    .set('Authorization', `Bearer ${student.token}`);

  assert.equal(adminResponse.status, 200);
  assert.equal(adminResponse.body.role, 'admin');
  assert.equal(studentResponse.status, 403);
  assert.equal(studentResponse.body.message, 'Access denied: admin role required');

  await User.deleteMany({});
  await mongoose.disconnect();
});
