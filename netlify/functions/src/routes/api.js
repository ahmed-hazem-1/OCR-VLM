const express = require('express');
const multer = require('multer');
const { medicalOcrController } = require('../controllers/medicalOcrController');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Supported MIME types
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Unsupported file type: ${file.mimetype}`);
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

// POST /api/medical-ocr
router.post('/medical-ocr', upload.single('file'), medicalOcrController);

module.exports = router;
