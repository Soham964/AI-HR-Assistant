const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDKPVG74ZgIeqjBv8V6WrHC5eCkjaNAuwQ';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generate content using Gemini API
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} modelName - The model to use (default: gemini-1.5-flash)
 * @returns {Promise<string>} - Generated content
 */
async function generateContent(prompt, modelName = 'gemini-1.5-flash') {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating content with Gemini:', error);
        throw new Error(`Gemini API error: ${error.message}`);
    }
}

/**
 * Generate content with custom configuration
 * @param {string} prompt - The prompt to send to Gemini
 * @param {object} config - Configuration object
 * @param {string} config.model - Model name (default: gemini-1.5-flash)
 * @param {number} config.temperature - Temperature for generation (default: 0.7)
 * @param {number} config.maxOutputTokens - Maximum tokens to generate
 * @returns {Promise<string>} - Generated content
 */
async function generateContentWithConfig(prompt, config = {}) {
    try {
        const {
            model = 'gemini-1.5-flash',
            temperature = 0.7,
            maxOutputTokens = 1000
        } = config;

        const generativeModel = genAI.getGenerativeModel({ 
            model,
            generationConfig: {
                temperature,
                maxOutputTokens
            }
        });
        
        const result = await generativeModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating content with Gemini:', error);
        throw new Error(`Gemini API error: ${error.message}`);
    }
}

/**
 * Generate HR document using Gemini
 * @param {string} documentType - Type of document (offer_letter, rejection_letter, etc.)
 * @param {object} employeeData - Employee data
 * @param {string} template - Template or additional context
 * @returns {Promise<string>} - Generated document
 */
async function generateHRDocument(documentType, employeeData, template) {
    const prompt = `Generate a professional ${documentType} for ${employeeData.firstName} ${employeeData.lastName}. 
                   Use the following template: ${template}`;
    
    return await generateContentWithConfig(prompt, {
        temperature: 0.4, // Lower temperature for more consistent formal documents
        maxOutputTokens: 1500
    });
}

/**
 * Analyze text using Gemini (for resume analysis, etc.)
 * @param {string} text - Text to analyze
 * @param {string} analysisType - Type of analysis (resume, job_description, etc.)
 * @returns {Promise<string>} - Analysis result
 */
async function analyzeText(text, analysisType = 'general') {
    let prompt;
    
    switch (analysisType) {
        case 'resume':
            prompt = `Analyze the following resume text and extract key information in JSON format:
            
Resume Text:
${text}

Please extract:
1. Personal information (name, contact details)
2. Skills categorized by type (technical, soft skills, etc.)
3. Work experience with details
4. Education history
5. Key achievements
6. Professional summary

Format the response as detailed JSON.`;
            break;
        case 'job_description':
            prompt = `Analyze this job description and extract key requirements:
            
${text}

Please extract:
1. Required skills
2. Experience level needed
3. Education requirements
4. Key responsibilities
5. Preferred qualifications

Format as JSON.`;
            break;
        default:
            prompt = `Analyze the following text and provide insights: ${text}`;
    }
    
    return await generateContentWithConfig(prompt, {
        temperature: 0.3, // Lower temperature for analytical tasks
        maxOutputTokens: 2000
    });
}

/**
 * Generate chat response with system context
 * @param {string} systemMessage - System message/context
 * @param {string} userMessage - User message
 * @param {object} config - Optional configuration
 * @returns {Promise<string>} - Generated response
 */
async function generateChatResponse(systemMessage, userMessage, config = {}) {
    const combinedPrompt = `${systemMessage}\n\nUser message: ${userMessage}`;
    
    return await generateContentWithConfig(combinedPrompt, {
        temperature: 0.7,
        maxOutputTokens: 1000,
        ...config
    });
}

module.exports = {
    generateContent,
    generateContentWithConfig,
    generateChatResponse,
    generateHRDocument,
    analyzeText,
    genAI // Export the client for direct use if needed
};