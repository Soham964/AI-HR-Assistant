const express = require('express');
const router = express.Router();

// GET /api/employees
router.get('/', (req, res) => {
  res.json({ message: 'Employees route working' });
});

module.exports = router; 