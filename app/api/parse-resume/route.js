import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(req) {
  let tempPath = null;

  try {
    const formData = await req.formData();
    const file = formData.get('resume');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to a temp file
    tempPath = join(tmpdir(), `resume_${Date.now()}.pdf`);
    await writeFile(tempPath, buffer);

    // Parse using pdf2json
    const PDFParser = (await import('pdf2json')).default;

    const text = await new Promise((resolve, reject) => {
      const parser = new PDFParser(null, true);

      parser.on('pdfParser_dataReady', () => {
        const text = parser.getRawTextContent();
        resolve(text);
      });

      parser.on('pdfParser_dataError', (err) => {
        reject(err);
      });

      parser.loadPDF(tempPath);
    });

    return NextResponse.json({ text });

  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
  } finally {
    // Clean up temp file
    if (tempPath) {
      await unlink(tempPath).catch(() => {});
    }
  }
}