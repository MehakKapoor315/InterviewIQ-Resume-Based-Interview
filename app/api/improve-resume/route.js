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
          content: 'You are a resume reviewer. Return ONLY valid JSON, nothing else, no markdown.'
        },
        {
          role: 'user',
          content: `Review this resume and return this exact JSON structure:
{
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "improvedResume": "write improved resume here",
  "overallRating": 7,
  "summary": "one sentence summary"
}

Resume: ${resumeText.slice(0, 500)}`
        }
      ],
      temperature: 0.1,
      max_tokens: 600,
    });

    const text = response.choices[0].message.content;
    console.log('Raw response:', text);

    // Try multiple ways to parse
    let result;
    try {
      // Try direct parse first
      result = JSON.parse(text);
    } catch {
      // Try extracting JSON
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        // Return default if parsing fails
        return NextResponse.json({
          suggestions: [
            'Add more specific technical skills',
            'Include quantified achievements',
            'Add a professional summary',
            'List projects with technologies used',
            'Include relevant certifications'
          ],
          improvedResume: resumeText,
          overallRating: 6,
          summary: 'Your resume shows good potential with room for improvement.'
        });
      }
      result = JSON.parse(match[0]);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Resume improvement error:', error.message);
    // Return default response instead of error
    return NextResponse.json({
      suggestions: [
        'Add more specific technical skills',
        'Include quantified achievements',
        'Add a professional summary',
        'List projects with technologies used',
        'Include relevant certifications'
      ],
      improvedResume: 'Could not generate improved version. Please try again.',
      overallRating: 6,
      summary: 'Your resume shows good potential with room for improvement.'
    });
  }
}