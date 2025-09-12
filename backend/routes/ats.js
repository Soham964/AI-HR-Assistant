const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const { generateContent } = require('../utils/geminiClient');

// Set up multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error in ATS route:', err);
  res.status(500).json({ msg: 'An error occurred during ATS processing.' });
};

// POST /api/ats/score - Calculate ATS score for CV against a job description
router.post('/score', upload.single('cv'), async (req, res, next) => {
  try {
    const jobDescription = req.body.jobDescription;
    const cvFile = req.file;

    if (!cvFile || !jobDescription) {
      return res.status(400).json({ msg: 'Please provide both a CV file and a job description.' });
    }

    let cvText = '';
    console.log('Uploaded CV Mime Type:', cvFile.mimetype);
    
    try {
      if (cvFile.mimetype === 'text/plain') {
        cvText = cvFile.buffer.toString();
      } else if (cvFile.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(cvFile.buffer);
        cvText = pdfData.text;
      } else if (cvFile.mimetype.startsWith('image/')) {
        const { data: { text } } = await Tesseract.recognize(
          cvFile.buffer,
          'eng',
          { logger: m => console.log(m) }
        );
        cvText = text;
      } else {
        return res.status(400).json({ msg: 'Unsupported file type. Please upload a text file, PDF, or image.' });
      }

      if (!cvText.trim()) {
        return res.status(400).json({ msg: 'Could not extract readable text from the CV.' });
      }

      const promptLines = [
        "As an advanced Applicant Tracking System (ATS), perform a comprehensive analysis of the candidate's CV against the job description:",
        "",
        "Your response MUST be a valid JSON object enclosed within triple backticks (```json...```).",
        "",
        "Task 1: Extract the following information from the CV in JSON format, using the exact keys specified:",
        "- \"name\": Candidate's full name (string)",
        "- \"contact\": Email and/or phone number (string)",
        "- \"skills\": Key technical and soft skills (string, comma-separated if multiple)",
        "- \"education\": Educational background including degrees, institutions, and graduation years (string)",
        "- \"experience\": Work experience including job titles, companies, duration, and key achievements (string)",
        "",
        "Task 2: Perform a detailed evaluation of the CV against the provided Job Description using the following criteria and calculate a weighted score for each category, along with an overall compatibility score as a percentage. All scores must be integers between 0 and 100.",
        "",
        "1. Skills Match (30% weight): How well do the candidate's skills align with the job description?",
        "2. Experience Relevance (30% weight): How relevant is the candidate's work experience to the role?",
        "3. Education Alignment (15% weight): Does the candidate's education meet the job requirements?",
        "4. Keyword Optimization (15% weight): Presence and density of important keywords from the job description.",
        "5. Overall Presentation (10% weight): Clarity, organization, and professionalism of the CV.",
        "",
        "Task 3: Provide brief, actionable improvement suggestions for the CV for this specific role.",
        "",
        "Your JSON output must strictly adhere to this structure:",
        "```json",
        "{",
        "  \"name\": \"string\",",
        "  \"contact\": \"string\",",
        "  \"skills\": \"string\",",
        "  \"education\": \"string\",",
        "  \"experience\": \"string\",",
        "  \"categoryScores\": {",
        "    \"skillsMatch\": integer (0-100),",
        "    \"experienceRelevance\": integer (0-100),",
        "    \"educationAlignment\": integer (0-100),",
        "    \"keywordOptimization\": integer (0-100),",
        "    \"overallPresentation\": integer (0-100)",
        "  },",
        "  \"score\": integer (0-100),",
        "  \"improvementSuggestions\": \"string\"",
        "}",
        "```",
        "",
        "CV:",
        cvText,
        "",
        "Job Description:",
        jobDescription
      ];
      const prompt = promptLines.join('\n');

      const responseText = await generateContent(prompt);
      
      // Attempt to extract JSON from triple backticks first
      let cleanResponseText = responseText.trim();
      const jsonMatch = cleanResponseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        cleanResponseText = jsonMatch[1].trim();
      }

      console.log("Raw Gemini Response Text (after backtick extraction attempt):", cleanResponseText);

      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(cleanResponseText);
        
        // Extract resume information and score
        const resumeInfo = {
          name: parsedResponse.name || '',
          contact: parsedResponse.contact || '',
          skills: parsedResponse.skills || '',
          education: parsedResponse.education || '',
          experience: parsedResponse.experience || ''
        };
        
        // Get the score and ensure it's within 0-100
        let atsScore = parsedResponse.score || 0;
        atsScore = Math.max(0, Math.min(100, atsScore));
        
        // Extract category scores if available
        const categoryScores = parsedResponse.categoryScores || {
          skillsMatch: 0,
          experienceRelevance: 0,
          educationAlignment: 0,
          keywordOptimization: 0,
          overallPresentation: 0
        };
        
        // Extract improvement suggestions if available
        const improvementSuggestions = parsedResponse.improvementSuggestions || '';
        
        // Return the enhanced response with category scores and improvement suggestions
        res.json({ 
          score: atsScore,
          resumeInfo: resumeInfo,
          categoryScores: categoryScores,
          improvementSuggestions: improvementSuggestions
        });
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.log('Raw response:', cleanResponseText);
        
        // Fallback to regex extraction if JSON parsing fails
        const scoreMatch = cleanResponseText.match(/"score"\s*:\s*(\d+)/);
        let atsScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        atsScore = Math.max(0, Math.min(100, atsScore));
        
        // Try to extract some information from the text even if JSON parsing failed
        let name = '';
        let contact = '';
        let skills = '';
        let education = '';
        let experience = '';
        let improvementSuggestions = '';
        
        // Default category scores
        let categoryScores = {
          skillsMatch: 0,
          experienceRelevance: 0,
          educationAlignment: 0,
          keywordOptimization: 0,
          overallPresentation: 0
        };
        
        // Simple regex extractions for common patterns
        const nameMatch = cleanResponseText.match(/"name"\s*:\s*"([^"]+)"/i);
        if (nameMatch) name = nameMatch[1];
        
        const contactMatch = cleanResponseText.match(/"contact"\s*:\s*"([^"]+)"/i);
        if (contactMatch) contact = contactMatch[1];
        
        const skillsMatch = cleanResponseText.match(/"skills"\s*:\s*"([^"]+)"/i);
        if (skillsMatch) skills = skillsMatch[1];
        
        const educationMatch = cleanResponseText.match(/"education"\s*:\s*"([^"]+)"/i);
        if (educationMatch) education = educationMatch[1];
        
        const experienceMatch = cleanResponseText.match(/"experience"\s*:\s*"([^"]+)"/i);
        if (experienceMatch) experience = experienceMatch[1];
        
        const improvementMatch = cleanResponseText.match(/"improvementSuggestions"\s*:\s*"([^"]+)"/i);
        if (improvementMatch) improvementSuggestions = improvementMatch[1];

        // Try to extract category scores with regex if JSON parsing failed
        const skillsScoreMatch = cleanResponseText.match(/"skillsMatch"\s*:\s*(\d+)/i);
        if (skillsScoreMatch) categoryScores.skillsMatch = parseInt(skillsScoreMatch[1]);
        
        const expScoreMatch = cleanResponseText.match(/"experienceRelevance"\s*:\s*(\d+)/i);
        if (expScoreMatch) categoryScores.experienceRelevance = parseInt(expScoreMatch[1]);
        
        const eduScoreMatch = cleanResponseText.match(/"educationAlignment"\s*:\s*(\d+)/i);
        if (eduScoreMatch) categoryScores.educationAlignment = parseInt(eduScoreMatch[1]);
        
        const keywordScoreMatch = cleanResponseText.match(/"keywordOptimization"\s*:\s*(\d+)/i);
        if (keywordScoreMatch) categoryScores.keywordOptimization = parseInt(keywordScoreMatch[1]);
        
        const presentationScoreMatch = cleanResponseText.match(/"overallPresentation"\s*:\s*(\d+)/i);
        if (presentationScoreMatch) categoryScores.overallPresentation = parseInt(presentationScoreMatch[1]);

        res.json({ 
          score: atsScore,
          resumeInfo: {
            name,
            contact,
            skills,
            education,
            experience
          },
          categoryScores: categoryScores,
          improvementSuggestions: improvementSuggestions
        });
      }
    } catch (fileReadError) {
      console.error('Error processing CV file:', fileReadError);
      return res.status(500).json({ msg: 'Error processing CV file.' });
    }
  } catch (error) {
    console.error('Error in ATS score route:', error);
    next(error); // Pass to global error handler
  }
});

// Apply error handling middleware
router.use(errorHandler);

module.exports = router;