const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['offer_letter', 'experience_certificate', 'payslip', 'resume', 'cover_letter', 'interview_letter']
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedAt: Date,
  metadata: {
    fileName: String,
    fileType: String,
    fileSize: Number,
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  version: {
    type: Number,
    default: 1
  },
  history: [{
    content: mongoose.Schema.Types.Mixed,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    version: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema); 