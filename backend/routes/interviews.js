console.log('Loading interviews route file...');

const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const mongoose = require('mongoose');

// GET /api/interviews - Get all interviews for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    // Ensure req.user.id (MongoDB _id of authenticated user) is available from auth middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find interviews where the interviewer matches the authenticated user's MongoDB _id
    const interviews = await Interview.find({ interviewer: req.user.id })
      .populate('interviewer', 'firstName lastName email')
      .sort({ interviewDate: -1 });
    
    res.json(interviews);
  } catch (err) {
    console.error('Error fetching interviews:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/interviews/:id - Get interview by ID (and ensure it belongs to the user if not admin/hr)
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('interviewer', 'firstName lastName email');
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Security check: If not an admin/hr, ensure the interview belongs to the requesting user
    if (req.user.role === 'employee' && interview.interviewer && interview.interviewer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this interview' });
    }
    
    res.json(interview);
  } catch (err) {
    console.error('Error fetching interview:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/interviews - Create a new interview
router.post('/', auth, roleCheck(['hr', 'admin', 'employee']), async (req, res) => { // Allow employees to schedule their own interviews
  console.log('Received interview scheduling request');
  try {
    const { candidateName, position, interviewDate, interviewer, notes } = req.body;
    
    // Validate required fields
    if (!candidateName || !position || !interviewDate) {
      return res.status(400).json({ error: 'Please provide candidate name, position, and interview date' });
    }

    // Check if an interview already exists at the given date and time (globally, or for this interviewer?)
    // For now, keep it simple and check globally. If unique per interviewer, it needs more logic.
    const existingInterview = await Interview.findOne({ interviewDate });
    if (existingInterview) {
      return res.status(400).json({ error: 'This date and time is already assigned for another interview. Please choose a different slot.' });
    }
    
    let finalInterviewer = null;

    // Determine the interviewer: prioritize provided interviewer if valid and allowed by role, else use authenticated user
    if (interviewer) {
      // If an interviewer is provided in the body, it must be the requesting user's ID for employees
      // Or an existing employee's ID for HR/Admin
      if (req.user.role === 'employee' && interviewer !== req.user.id) {
        return res.status(403).json({ error: 'Employees can only schedule interviews for themselves' });
      }
      // For HR/Admin, we would typically resolve the interviewer's _id from a Firebase UID or email if passed
      // For now, we assume if `interviewer` is provided, it's a valid MongoDB _id for simplicity.
      if (mongoose.Types.ObjectId.isValid(interviewer)) {
        finalInterviewer = interviewer;
      } else {
        return res.status(400).json({ error: 'Invalid interviewer ID format' });
      }
    } else {
      // Default: use the authenticated user's ID as the interviewer
      finalInterviewer = req.user.id;
    }

    console.log('DEBUG: req.body.interviewer:', interviewer);
    console.log('DEBUG: req.user.id:', req.user ? req.user.id : 'N/A');
    console.log('DEBUG: finalInterviewer before saving:', finalInterviewer);

    // Create new interview
    const newInterview = new Interview({
      candidateName,
      position,
      interviewDate,
      interviewer: finalInterviewer, // Use the determined valid ObjectId or null
      notes
    });
    
    const interview = await newInterview.save();
    
    res.json(interview);
  } catch (err) {
    console.error('Error creating interview:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/interviews/:id - Update an interview
router.put('/:id', auth, roleCheck(['hr', 'admin', 'employee']), async (req, res) => { // Allow employees to update their own interviews
  try {
    const { candidateName, position, interviewDate, interviewer, status, notes } = req.body;
    
    // Build interview object
    const interviewFields = {};
    if (candidateName) interviewFields.candidateName = candidateName;
    if (position) interviewFields.position = position;
    if (interviewDate) interviewFields.interviewDate = interviewDate;
    if (interviewer) interviewFields.interviewer = interviewer;
    if (status) interviewFields.status = status;
    if (notes !== undefined) interviewFields.notes = notes;
    
    let interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Security check: If not an admin/hr, ensure the interview belongs to the requesting user
    if (req.user.role === 'employee' && interview.interviewer && interview.interviewer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to update this interview' });
    }
    
    interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { $set: interviewFields },
      { new: true }
    ).populate('interviewer', 'firstName lastName email');
    
    res.json(interview);
  } catch (err) {
    console.error('Error updating interview:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/interviews/:id - Delete an interview
router.delete('/:id', auth, roleCheck(['hr', 'admin', 'employee']), async (req, res) => { // Allow employees to delete their own interviews
  console.log(`[DELETE /api/interviews/:id] Attempting to delete interview with ID: ${req.params.id}`);
  console.log(`[DELETE /api/interviews/:id] Authenticated user: ID=${req.user ? req.user.id : 'N/A'}, Role=${req.user ? req.user.role : 'N/A'}`);
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      console.log(`[DELETE /api/interviews/:id] Interview with ID: ${req.params.id} not found.`);
      return res.status(404).json({ error: 'Interview not found' });
    }

    console.log(`[DELETE /api/interviews/:id] Found interview: ID=${interview._id}, Interviewer=${interview.interviewer}, Candidate=${interview.candidateName}`);

    // Security check: If not an admin/hr, ensure the interview belongs to the requesting user
    if (req.user.role === 'employee' && interview.interviewer && interview.interviewer.toString() !== req.user.id.toString()) {
      console.warn(`[DELETE /api/interviews/:id] Access denied for user ${req.user.id} (role: ${req.user.role}) trying to delete interview by ${interview.interviewer}.`);
      return res.status(403).json({ error: 'Access denied: You are not authorized to delete this interview' });
    }
    
    await Interview.findByIdAndDelete(req.params.id);
    
    console.log(`[DELETE /api/interviews/:id] Interview with ID: ${req.params.id} successfully removed.`);
    res.json({ message: 'Interview removed' });
  } catch (err) {
    console.error(`[DELETE /api/interviews/:id] Error deleting interview ID ${req.params.id}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Invalid Interview ID format' }); // More specific error
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/interviews/:id/generate-call-letter - Generate interview call letter
router.post('/:id/generate-call-letter', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('interviewer', 'firstName lastName email');
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Company details configuration
    const companyDetails = {
      name: 'TechRecruit Pro',
      address: '123 Innovation Drive, Tech Park, Suite 500\nSilicon Valley, CA 94025',
      phone: '+1 (555) 123-4567',
      email: 'hr@techrecruitpro.com',
      website: 'www.techrecruitpro.com',
      linkedin: 'linkedin.com/company/techrecruitpro'
    };

    // Generate call letter content
    const callLetter = {
      candidateName: interview.candidateName,
      position: interview.position,
      interviewDate: interview.interviewDate,
      interviewer: interview.interviewer ? `${interview.interviewer.firstName} ${interview.interviewer.lastName}` : 'TBD',
      companyName: companyDetails.name,
      companyAddress: companyDetails.address,
      companyPhone: companyDetails.phone,
      companyEmail: companyDetails.email,
      companyWebsite: companyDetails.website,
      companyLinkedIn: companyDetails.linkedin,
      generatedDate: new Date(),
      letterContent: `Dear ${interview.candidateName},

We are pleased to inform you that you have been shortlisted for the position of ${interview.position} at ${companyDetails.name}. 

Your interview has been scheduled for ${new Date(interview.interviewDate).toLocaleString()}.

Interview Details:
- Position: ${interview.position}
- Date & Time: ${new Date(interview.interviewDate).toLocaleString()}
- Interviewer: ${interview.interviewer ? `${interview.interviewer.firstName} ${interview.interviewer.lastName}` : 'TBD'}
${interview.notes ? `\nAdditional Notes: ${interview.notes}` : ''}

Please bring the following documents with you:
1. Updated Resume
2. Government-issued ID proof
3. Educational certificates
4. Previous employment documents (if applicable)

Venue:
${companyDetails.name}
${companyDetails.address}
Phone: ${companyDetails.phone}
Email: ${companyDetails.email}
Website: ${companyDetails.website}
LinkedIn: ${companyDetails.linkedin}

Please arrive 15 minutes before your scheduled interview time.

We look forward to meeting you!

Best regards,
HR Team
${companyDetails.name}

---
This is an automated message. Please do not reply directly to this email.
For any queries, please contact us at ${companyDetails.email} or call ${companyDetails.phone}.`
    };

    res.json(callLetter);
  } catch (err) {
    console.error('Error generating call letter:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;