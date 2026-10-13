const mongoose = require("mongoose");
const { URL } = require("node:url");

// Tests that touch the database wipe collections between runs, so they must never
// point at real data. They use TEST_MONGO_URI (not MONGO_URI from .env) and refuse
// to run unless it names a separate database with "test" in its name.
//
// Note: a URI with no database name (e.g. an Atlas URI ending in "/") uses a db
// called "test" by default, which is where real data lives, so that is rejected too.
function getTestDbUri() {
  const uri = process.env.TEST_MONGO_URI;

  if (!uri) {
    throw new Error(
      "TEST_MONGO_URI is not set. DB tests delete data, so they need their own " +
      "throwaway database, e.g. mongodb://localhost:27017/studyai_test"
    );
  }

  if (uri === process.env.MONGO_URI) {
    throw new Error("TEST_MONGO_URI must not be the same as MONGO_URI.");
  }

  const dbName = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).pathname.slice(1);
  if (!dbName || dbName === "test" || !/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run DB tests against database "${dbName || "(default)"}". ` +
      "Name it explicitly and include \"test\", e.g. studyai_test."
    );
  }

  return uri;
}

async function connectTestDB() {
  await mongoose.connect(getTestDbUri(), { serverSelectionTimeoutMS: 5000 });
}

module.exports = { connectTestDB, getTestDbUri };
