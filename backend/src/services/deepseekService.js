const fetch = require('node-fetch');
const config = require('../config');

// DeepSeek API integration for generating AI messages
async function generateAIResponse(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DeepSeek API key not set');

  const response = await fetch('https://api.deepseek.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      prompt,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].text.trim();
}

module.exports = { generateAIResponse };