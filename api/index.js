require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('../config/db');

const authRoutes = require('../routes/authRoutes');
const adminRoutes = require('../routes/adminRoutes');
const teacherRoutes = require('../routes/teacherRoutes');
const portalRoutes = require('../routes/portalRoutes');
const resultRoutes = require('../routes/resultRoutes');

const app = express();

// Kick off the DB connection as soon as the function is loaded. Mongoose
// buffers queries until the connection is ready, so routes don't need to
// await this directly — but we also guard with a tiny middleware below in
// case the very first request arrives before the connection promise settles.
connectDB().catch((err) => console.error('MongoDB connection error:', err.message));

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure DB is connected before handling any request (cheap no-op once warm)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again shortly.' });
  }
});

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/results', resultRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

// Only start a listening server when run directly (local development).
// On Vercel this file is `require`d as a serverless function handler instead,
// so `require.main === module` is false and app.listen() never runs there.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Masterbuilder Result System API running on port ${PORT}`));
}

module.exports = app;
