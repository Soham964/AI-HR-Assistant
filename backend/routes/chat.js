const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Document = require('../models/Document');
const mongoose = require('mongoose');
const { generateHRDocument, generateContent, analyzeText, generateChatResponse } = require('../utils/geminiClient');

// Helper function to get employee context
async function getEmployeeContext(firebaseUid) {
  console.log(`getEmployeeContext called with firebaseUid: ${firebaseUid}`);

  if (firebaseUid === 'test-employee-id') {
    console.log('Using mock employee context for test-employee-id');
    return {
      employee: {
        name: 'Test Employee',
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@example.com',
        department: 'IT',
        position: 'Developer',
        leaveBalance: {
          casual: 10,
          sick: 5,
          annual: 15
        }
      },
      leaves: []
    };
  }

  try {
    const employee = await Employee.findOne({ firebaseUid: firebaseUid });
    if (employee) {
      console.log('Employee found for firebaseUid:', firebaseUid);
      const leaves = await Leave.find({ employee: employee._id });
      return { employee, leaves };
    } else {
      console.warn('Employee not found for firebaseUid:', firebaseUid);
      return { employee: null, leaves: [] };
    }
  } catch (error) {
    console.error('Error fetching employee context for firebaseUid:', firebaseUid, error);
    return { employee: null, leaves: [] };
  }
}

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    const { message, employeeId } = req.body;
    
    // Get employee context using firebaseUid
    const context = await getEmployeeContext(employeeId);
    
    // Prepare system message with context
    const systemMessageContent = context.employee ? 
    `You are an AI HR Assistant. You have access to the following information:
        Employee: ${context.employee.firstName} ${context.employee.lastName}
        Department: ${context.employee.department}
        Leave Balance: ${JSON.stringify(context.employee.leaveBalance)}
        Recent Leaves: ${JSON.stringify(context.leaves)}
        
        You can help with:
        1. Leave balance checks and applications
        2. Document generation (offer letters, experience certificates)
        3. Company policy questions
        4. Personal information updates
        5. General HR queries`
    : 'You are an AI HR Assistant.';

    // Get AI response from Gemini
    const aiResponse = await generateChatResponse(systemMessageContent, message);

    // Handle specific actions based on AI response
    if (context.employee && message.toLowerCase().includes('leave balance')) {
      return res.json({
        response: aiResponse,
        leaveBalance: context.employee.leaveBalance
      });
    }

    if (message.toLowerCase().includes('apply for leave')) {
      return res.json({
        response: aiResponse,
        action: 'leave_application',
        leaveTypes: ['casual', 'sick', 'annual']
      });
    }

    // Handle offer letter generation requests
    if (message.toLowerCase().includes('generate offer letter')) {
      const extractionPrompt = `From the following message, extract the key details for an offer letter in a JSON format. If a detail is not explicitly mentioned, omit it from the JSON. Be precise with dates and names.\n\nMessage: "${message}"\nExpected JSON keys: candidateName, jobTitle, annualSalary, startDate, reportingManager, companyName, benefits.`;

      const extractedDetailsString = await generateContent(extractionPrompt);
      
      let extractedDetails = {};
      try {
        extractedDetails = JSON.parse(extractedDetailsString);
      } catch (parseError) {
        console.error('Failed to parse extracted offer letter details as JSON:', parseError);
        return res.json({
          response: "I'm sorry, I had trouble understanding all the details for the offer letter. Could you please provide them in a clearer format? (Parsing Error)"
        });
      }

      const { candidateName, jobTitle, annualSalary, startDate, reportingManager, companyName, benefits } = extractedDetails;

      if (!candidateName || !jobTitle || !annualSalary || !startDate || !reportingManager || !companyName) {
        const missingFields = [];
        if (!candidateName) missingFields.push("Employee's full name");
        if (!startDate) missingFields.push('Start date');
        if (!reportingManager) missingFields.push("Reporting manager's full name");
        if (!companyName) missingFields.push('Company name');
        if (!jobTitle) missingFields.push('Job title');
        if (!annualSalary) missingFields.push('Annual salary');

        return res.json({
          response: `I'm sorry, but I need some more information to generate the offer letter. Could you please provide the following details: ${missingFields.join(', ')}.`
        });
      }

      const offerLetterTemplate = `Generate a professional offer letter for ${candidateName} for the position of ${jobTitle} at ${companyName}. The annual salary will be ${annualSalary}, and the start date is ${startDate}. The reporting manager will be ${reportingManager}.${benefits ? `\n\nAdditional benefits: ${benefits}` : ''}`;

      try {
        const docGenResponse = await fetch('http://localhost:5000/api/chat/generate-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'offer_letter',
            employeeId: employeeId,
            template: offerLetterTemplate
          }),
        });

        if (!docGenResponse.ok) {
          const errorText = await docGenResponse.text();
          console.error(`Document generation API responded with status ${docGenResponse.status}:`, errorText);
          throw new Error(`Document generation failed with status ${docGenResponse.status}`);
        }

        const docGenData = await docGenResponse.json();

        let finalDocumentContent = null;
        if (docGenData.success) {
          if (docGenData.document && docGenData.document.content) {
            finalDocumentContent = docGenData.document.content;
          } else if (docGenData.content) {
            finalDocumentContent = docGenData.content;
          }
        }

        return res.json({
          response: finalDocumentContent || 'Document generated successfully.',
          type: 'letter',
          data: { letterUrl: docGenData.document ? docGenData.document.url : null }
        });
      } catch (error) {
        console.error('Error generating document:', error);
        return res.json({
          response: "I'm sorry, there was an error generating the offer letter. Please try again later."
        });
      }
    }

    // Default response for other queries
    return res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Document generation endpoint
router.post('/generate-document', async (req, res) => {
  try {
    const { type, employeeId, template } = req.body;
    
    let employee = null;

    // Handle test employee ID or invalid ObjectId format
    if (employeeId === 'test-employee-id') {
      // Use mock employee data for document generation prompt
      employee = {
        firstName: 'Test',
        lastName: 'Employee'
        // Add other necessary properties if the template uses them
      };
    } else if (mongoose.Types.ObjectId.isValid(employeeId)) { // Check if it's a valid ObjectId format
      // Find employee by ObjectId for real IDs
      try {
        employee = await Employee.findById(employeeId);
      } catch (error) {
        console.error('Error finding employee for document generation:', error);
        return res.status(500).json({ error: 'Error finding employee.' });
      }
    } else {
       // If it's not 'test-employee-id' and not a valid ObjectId format
      console.error('Invalid employee ID format received for document generation:', employeeId);
      return res.status(400).json({ error: 'Invalid employee ID format.' });
    }

    // Check if employee was found (or is the mock employee)
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Generate document content using Gemini AI
    const generatedContent = await generateHRDocument(type, employee, template);

    // Always return content directly for frontend consistency
    if (employeeId !== 'test-employee-id') {
       // Create document in database
      const document = new Document({
        type,
        employee: employeeId,
        content: generatedContent,
        status: 'draft'
      });
      await document.save();
      // Even if saved, return only the content for frontend
      return res.json({
        success: true,
        content: generatedContent
      });
    } else {
      // Return generated content for test employee without saving
      return res.json({
        success: true,
        content: generatedContent
      });
    }

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ error: 'Error generating document' });
  }
});

// GET /api/chat
router.get('/', (req, res) => {
  res.json({ message: 'Chat route working' });
});

module.exports = router; 