/**
 * Standalone test for the scan endpoint
 * Run with: node test-scan-endpoint.js
 */

const express = require('express');
const multer = require('multer');
const scanController = require('./src/controllers/scanController');

const app = express();
const PORT = 3333;

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Scan route
app.post('/api/scan', upload.single('image'), scanController.scanFood);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Scan endpoint test server running' });
});

app.listen(PORT, () => {
  console.log(`\n🧪 Test server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📸 Scan endpoint: POST http://localhost:${PORT}/api/scan`);
  console.log('\nTest with:');
  console.log(`  curl -X POST http://localhost:${PORT}/api/scan -F "image=@path/to/image.jpg"`);
  console.log('\nOr test no file error:');
  console.log(`  curl -X POST http://localhost:${PORT}/api/scan`);
  console.log('');
});
