const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
console.log('dotenv.config() executed.');

console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'MongoDB URI is set' : 'MongoDB URI is not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'JWT Secret is set' : 'JWT Secret is not set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Gemini API Key is set' : 'Gemini API Key is not set');
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
console.log('Attempting to connect to MongoDB with URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-assistant');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-assistant')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/ats', require('./routes/ats'));
console.log('Attempting to load interviews route...');
app.use('/api/interviews', require('./routes/interviews'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Caught:', err.stack || err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});