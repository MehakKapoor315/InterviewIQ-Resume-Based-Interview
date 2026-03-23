import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const { question, answer } = await req.json();

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a kind and fair interview coach evaluating a fresher or student candidate.

IMPORTANT SCORING RULES:
- Score is out of 10
- If the answer shows any basic understanding → give minimum 4
- If the answer is relevant and covers main points → give 6-7
- If the answer is detailed with examples → give 8-9
- Only give 1-3 if the answer is completely wrong or irrelevant
- Never give 0 unless the answer is totally blank or nonsense
- Always find at least one strength even in weak answers
- Be encouraging and constructive in feedback
- Consider that speech recognition may have errors in transcription so be lenient

Scoring guide:
9-10: Excellent, detailed, with examples
7-8: Good, covers main points well
5-6: Decent, basic understanding shown
3-4: Weak but some relevant content
1-2: Very poor, barely relevant
0: Completely blank or nonsense

Return ONLY this JSON with no extra text:
{
  "score": 6,
  "feedback": "constructive feedback here",
  "strengths": "what was good",
  "improve": "specific improvement tip"
}`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nCandidate Answer: ${answer}\n\nEvaluate fairly and give appropriate score.`
        }
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    let text = response.choices[0].message.content;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const evaluation = JSON.parse(match[0]);
    return NextResponse.json({ evaluation });

  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}