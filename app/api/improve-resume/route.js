import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const { resumeText } = await req.json();

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a resume reviewer for students. Be encouraging.
Rate resume out of 10. For freshers with projects give at least 6-7.
Return ONLY this JSON with no extra text:
{"suggestions":["tip1","tip2","tip3","tip4","tip5"],"improvedResume":"improved resume text","overallRating":7,"summary":"one encouraging sentence"}`
        },
        {
          role: 'user',
          content: 'Review:\n\n' + resumeText.slice(0, 1000)
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
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