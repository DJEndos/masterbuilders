require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('../config/db');

const authRoutes = require('../routes/authRoutes');
const adminRoutes = require('../routes/adminRoutes');
const teacherRoutes = require('../routes/teacherRoutes');
const portalRoutes = require('../routes/portalRoutes');
const resultRoutes = require('../routes/resultRoutes');

const app = express();

connectDB().catch((err) => console.error('MongoDB connection error:', err.message));

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Lightweight health check â€” does not require a DB connection, so it stays
// useful as an uptime probe even during a database outage.
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));

// Only /api/* routes need the database, so only they wait on/require it.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again shortly.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/results', resultRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));

// Fallback to the landing page for any other unmatched (non-API) route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

// Only start a listening server when run directly (local development, or a
// persistent host like Render). On Vercel this file is `require`d as a
// serverless function handler instead, so `require.main === module` is
// false there and app.listen() never runs.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`ðŸš€ Masterbuilder Result System API running on port ${PORT}`));
}

module.exports = app;
