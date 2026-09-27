function validateEnv() {
  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "GEMINI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key] || !String(process.env[key]).trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
  }
}

module.exports = validateEnv;
