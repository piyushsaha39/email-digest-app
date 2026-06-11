const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Helper utility to pause execution
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function summarizeEmail(senderName, senderEmail, subject, emailBody) {
  const truncatedBody = emailBody?.slice(0, 2000) || '';

  const prompt = `You are an intelligent email assistant. Analyze the following email and respond in JSON format only.

Email Details:
- From: ${senderName} <${senderEmail}>
- Subject: ${subject}
- Body: ${truncatedBody}

Respond with ONLY a valid JSON object matching this structure exactly, do not wrap in markdown block ticks:
{
  "summary": "2-3 sentence summary of what this email is about and what action (if any) is needed",
  "urgencyScore": <integer 1-10>,
  "urgencyReason": "one sentence explaining the urgency score"
}

Urgency scoring guide:
10 = Requires response within the hour
7-9 = Requires response today
4-6 = Can wait 1-2 days
1-3 = Low priority`;

  // 1. Strict Baseline Throttle: Pause BEFORE making the API call 
  // This guarantees our background loop spaces out requests perfectly.
  await sleep(7000); 

  console.log(`[Gemini] Sending email from "${senderName}" to AI for processing...`);

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        // Explicitly forces the model to respond in raw structured JSON formats natively
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 429) {
      console.error(`[Gemini] 429 Rate Limit hit. Google API says: ${data?.error?.message}`);
    }
    throw new Error(JSON.stringify(data.error));
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    const parsed = JSON.parse(text.trim());
    return {
      summary: parsed.summary || '',
      urgencyScore: parseInt(parsed.urgencyScore) || 1,
      urgencyReason: parsed.urgencyReason || ''
    };
  } catch (parseError) {
    console.error("Failed to parse Gemini JSON output structure. Raw text:", text);
    return {
      summary: 'Error analyzing email content structure. Could not generate digest summary fields.',
      urgencyScore: 1,
      urgencyReason: 'Parsing fallback validation default'
    };
  }
}