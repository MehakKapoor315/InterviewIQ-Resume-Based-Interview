import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 60000,
});

export async function POST(req) {
  try {
    const { resumeText } = await req.json();

    // Step 1 — Extract key info from resume first (fast)
    const extractResponse = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Extract key information from this resume in 200 words max. Include: name, skills, projects, experience, education. Be concise.'
        },
        {
          role: 'user',
          content: resumeText.slice(0, 4000)
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const resumeSummary = extractResponse.choices[0].message.content;

    // Step 2 — Generate questions from summary (fast + accurate)
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical interviewer. Generate exactly 8 interview questions based on the candidate profile. Ask specific questions about their actual projects, skills and experience mentioned. Return ONLY a valid JSON array: [{"id":1,"question":"...","type":"technical"}] Types: technical, behavioral, project. No extra text.'
        },
        {
          role: 'user',
          content: 'Candidate profile:\n\n' + resumeSummary
        }
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    let text = response.choices[0].message.content;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');
    const questions = JSON.parse(match[0]);
    return NextResponse.json({ questions });

  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}