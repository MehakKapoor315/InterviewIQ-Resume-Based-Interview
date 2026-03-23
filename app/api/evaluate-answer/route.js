export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
});

export async function POST(req) {
  try {
    const { question, answer } = await req.json();

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a friendly and encouraging interview coach evaluating a student or fresher candidate.
Be generous and realistic with scoring. Use this scale:
- 8-10: Great answer with good detail
- 6-7: Good answer, covers the main points
- 4-5: Decent answer, basic understanding shown
- 2-3: Weak answer, very little relevant content
- 0-1: No relevant answer at all

Important rules:
- Freshers and students should be scored generously
- Even a basic correct answer deserves at least 4-5
- Only give 1-2 if the answer is completely wrong or irrelevant
- Always find something positive to say in strengths
- Keep feedback encouraging and constructive

Return ONLY a JSON object with no extra text:
{
  "score": 6,
  "feedback": "...",
  "strengths": "...",
  "improve": "..."
}`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nAnswer: ${answer}`
        }
      ],
      max_tokens: 300,
    });

    const text = response.choices[0].message.content;
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const evaluation = JSON.parse(match[0]);
    return NextResponse.json({ evaluation });

  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}