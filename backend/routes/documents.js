const express = require('express');
const router = express.Router();

// GET /api/documents
router.get('/', (req, res) => {
  res.json({ message: 'Documents route working' });
});

module.exports = router; 