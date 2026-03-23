import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 60000,
});

export async function POST(req) {
  try {
    const { resumeText } = await req.json();

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a helpful resume reviewer for students and freshers.
Be encouraging and realistic. Use this rating scale:
- 8-10: Excellent resume, very well structured
- 6-7: Good resume with some improvements needed
- 4-5: Average resume, needs work but has potential
- 2-3: Weak resume, major improvements needed

For a fresher with projects and skills listed, give at least 6-7.
Always give 5 specific actionable suggestions.
Return ONLY a JSON object with no extra text:
{
  "suggestions": ["suggestion 1","suggestion 2","suggestion 3","suggestion 4","suggestion 5"],
  "improvedResume": "full improved resume text here",
  "overallRating": 7,
  "summary": "2 sentence encouraging summary"
}`
        },
        {
          role: 'user',
          content: 'Review this resume:\n\n' + resumeText.slice(0, 3000)
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    let text = response.choices[0].message.content;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const result = JSON.parse(match[0]);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Resume improvement error:', error);
    return NextResponse.json({ error: 'Failed to improve resume' }, { status: 500 });
  }
}