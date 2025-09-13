// Test script for new Gemini API key
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI(apiKey) {
  try {
    console.log('Testing Gemini API key...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = "Hello, can you respond with 'API key is working correctly'?";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API Key Working!');
    console.log('Response:', text);
    return true;
  } catch (error) {
    console.log('❌ API Key Failed:');
    console.error(error.message);
    return false;
  }
}

// Your new API key
const newApiKey = 'AIzaSyAR7s-i0rRTajfEOUHcMpa06NAlhqDqFWY';
testGeminiAPI(newApiKey);