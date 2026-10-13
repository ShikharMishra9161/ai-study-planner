const test = require('node:test');
const assert = require('node:assert/strict');
const { getTestDbUri } = require('./helpers/testDb');

function withEnv(env, fn) {
  const saved = { TEST_MONGO_URI: process.env.TEST_MONGO_URI, MONGO_URI: process.env.MONGO_URI };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('test DB guard rejects a missing TEST_MONGO_URI', () => {
  withEnv({ TEST_MONGO_URI: undefined }, () => {
    assert.throws(getTestDbUri, /TEST_MONGO_URI is not set/);
  });
});

test('test DB guard rejects the default "test" database used by Atlas URIs', () => {
  withEnv({ TEST_MONGO_URI: 'mongodb+srv://u:p@cluster0.example.mongodb.net/?retryWrites=true' }, () => {
    assert.throws(getTestDbUri, /Refusing/);
  });
  withEnv({ TEST_MONGO_URI: 'mongodb://localhost:27017/test' }, () => {
    assert.throws(getTestDbUri, /Refusing/);
  });
});

test('test DB guard rejects reusing MONGO_URI', () => {
  const uri = 'mongodb://localhost:27017/app_test';
  withEnv({ TEST_MONGO_URI: uri, MONGO_URI: uri }, () => {
    assert.throws(getTestDbUri, /must not be the same/);
  });
});

test('test DB guard accepts a separate, explicitly named test database', () => {
  withEnv({ TEST_MONGO_URI: 'mongodb://localhost:27017/studyai_test', MONGO_URI: 'mongodb://localhost:27017/studyai' }, () => {
    assert.equal(getTestDbUri(), 'mongodb://localhost:27017/studyai_test');
  });
});
