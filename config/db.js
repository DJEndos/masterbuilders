const mongoose = require('mongoose');

/**
 * Vercel runs this code inside serverless functions that can be invoked many
 * times per minute, each potentially a fresh "cold start". Without caching,
 * every invocation would open a brand new MongoDB connection and quickly
 * exhaust your connection limit. We cache the connection (and the in-flight
 * connection promise) on the global object, which Vercel preserves across
 * invocations on a warm instance.
 */
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, { bufferCommands: true })
      .then((mongooseInstance) => {
        console.log(`✅ MongoDB connected: ${mongooseInstance.connection.host}`);
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next invocation instead of caching a failure forever
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
