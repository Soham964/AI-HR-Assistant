const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['employee', 'hr', 'admin']
  },
  department: {
    type: String,
    required: true
  },
  firebaseUid: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  leaveBalance: {
    casual: { type: Number, default: 10 },
    sick: { type: Number, default: 7 },
    annual: { type: Number, default: 20 }
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  personalInfo: {
    phone: String,
    address: String,
    dateOfBirth: Date,
    joiningDate: { type: Date, default: Date.now }
  },
  documents: [{
    type: { type: String },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema); 