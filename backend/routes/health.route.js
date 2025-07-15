import express from 'express';
import connectDB from '../utils/db.js';

const router = express.Router();

let isInitialized = false;

// Run once on import
(async () => {
  try {
    await connectDB(); // or ping the DB instead if it's already connected
    isInitialized = true;
    console.log('Health probes initialized successfully');
  } catch (error) {
    console.error('Initialization failed:', error);
  }
})();

// Startup Probe
router.get('/startup', (req, res) => {
  if (isInitialized) {
    res.status(200).send('Application initialized');
  } else {
    res.status(503).send('Application initializing');
  }
});

// Liveness Probe
router.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Readiness Probe
router.get('/ready', async (req, res) => {
  try {
    // Simple ping, or re-use connectDB logic
    await connectDB(); // or create a `pingDB()` method if you prefer
    res.status(200).send('Ready');
  } catch (err) {
    console.error('Readiness check failed:', err);
    res.status(503).send('Not ready');
  }
});

export default router;
