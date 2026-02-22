const express = require('express');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');

// Initialize dotenv
dotenv.config();

const app = express();
const cors = require('cors');

// Middlewares
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  if (err.stack) console.error(err.stack);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Determine error code based on message content if status is 500
  let errorCode = "OCR_PROCESSING_FAILED";
  if (statusCode === 400) {
    errorCode = "INVALID_INPUT";
  } else if (message.includes("Auth Error")) {
    errorCode = "AUTH_FAILED";
  } else if (message.includes("Quota Exceeded")) {
    errorCode = "QUOTA_EXCEEDED";
  } else if (message.includes("Model Error")) {
    errorCode = "MODEL_NOT_FOUND";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message
    }
  });
});

module.exports = app;
