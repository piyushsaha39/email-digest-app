import { Mistral } from '@mistralai/mistralai';

// Initialize the Mistral client using the key from your .env
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

/**
 * Analyzes raw email text, generates a summary, and calculates an urgency score.
 * @param {string} emailContent - The raw text content of the email.
 * @returns {Promise<{summary: string, urgencyScore: number}>}
 */
export const analyzeEmailWithMistral = async (emailContent) => {
  try {
    const response = await mistral.chat.complete({
      model: 'mistral-small-latest', 
      messages: [
        {
          role: 'system',
          content: `You are an advanced email triage assistant. Analyze the email content provided and return a clean JSON object. 
          The JSON must contain exactly two keys:
          1. "summary": A concise one-sentence summary of the email's core message.
          2. "urgencyScore": An integer from 1 to 10 rating how critical it is for the user to see this immediately (e.g., automated alerts = 2, family emergencies or direct job/exam updates = 9 or 10).
          
          Respond ONLY with the raw JSON object. Do not include markdown codeblocks or extra text.`
        },
        {
          role: 'user',
          content: `Email Content:\n${emailContent}`,
        },
      ],
      // Forcing JSON response format ensures the output never breaks our app
      responseFormat: { type: 'json_object' } 
    });

    // Extract the stringified JSON from the Mistral response payload
    const resultText = response.choices[0].message.content;
    
    // Convert the string into an actual JavaScript object
    const parsedData = JSON.parse(resultText);

    return {
      summary: parsedData.summary || "No summary generated.",
      urgencyScore: Number(parsedData.urgencyScore) || 1
    };

  } catch (error) {
    console.error("Mistral Processing Error:", error);
    // Safe fallback if the API fails or times out
    return {
      summary: "Error generating summary with Mistral. Manual review required.",
      urgencyScore: 1
    };
  }
};