'use client';
import { useState } from 'react';

export default function SessionReport({ evaluations, resumeText, onBack, faceStats, fillerStats }) {
  const [generating, setGenerating] = useState(false);

  const avgScore = Math.round(
    evaluations.reduce((sum, e) => sum + e.evaluation.score, 0) / evaluations.length
  );

  const eyeContact = faceStats?.eyeContact || 0;
  const posture = faceStats?.posture || 0;
  const totalFillers = fillerStats?.reduce((sum, f) => sum + f.totalFillers, 0) || 0;
  const fillerDetails = {};
  fillerStats?.forEach(f => {
    Object.entries(f.found || {}).forEach(([word, count]) => {
      fillerDetails[word] = (fillerDetails[word] || 0) + count;
    });
  });
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('AI Interview Report', pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(new Date().toLocaleDateString('en-IN', { dateStyle: 'full' }), pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Face & filler stats section
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Performance Analysis', 15, y);
      y += 8;

      // Three boxes side by side
      const boxWidth = (pageWidth - 40) / 3;

      // Eye contact box
      doc.setFillColor(240, 255, 248);
      doc.roundedRect(15, y, boxWidth, 22, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(' Eye Contact', 15 + boxWidth / 2, y + 7, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${eyeContact}%`, 15 + boxWidth / 2, y + 17, { align: 'center' });

      // Posture box
      doc.setFillColor(240, 248, 255);
      doc.roundedRect(15 + boxWidth + 5, y, boxWidth, 22, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(' Posture', 15 + boxWidth + 5 + boxWidth / 2, y + 7, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${posture}%`, 15 + boxWidth + 5 + boxWidth / 2, y + 17, { align: 'center' });

      // Filler words box
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(15 + (boxWidth + 5) * 2, y, boxWidth, 22, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(' Filler Words', 15 + (boxWidth + 5) * 2 + boxWidth / 2, y + 7, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${totalFillers}`, 15 + (boxWidth + 5) * 2 + boxWidth / 2, y + 17, { align: 'center' });
      y += 30;

      // Filler word details
      if (Object.keys(fillerDetails).length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 53, 15);
        const fillerText = 'Detected: ' + Object.entries(fillerDetails).map(([w, c]) => `"${w}" x${c}`).join(', ');
        const fillerLines = doc.splitTextToSize(fillerText, pageWidth - 30);
        doc.text(fillerLines, 15, y);
        y += fillerLines.length * 5 + 3;

        doc.setTextColor(120, 53, 15);
        doc.setFont('helvetica', 'italic');
        doc.text('Tip: Take a short pause instead of using filler words.', 15, y);
        y += 8;
      }
      y += 5;
      // Overall score box
      doc.setFillColor(240, 244, 255);
      doc.roundedRect(15, y, pageWidth - 30, 25, 4, 4, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(`Overall Score: ${avgScore}/10`, pageWidth / 2, y + 10, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        avgScore >= 7 ? 'Excellent Performance!' : avgScore >= 5 ? 'Good Performance!' : 'Needs Improvement',
        pageWidth / 2, y + 18, { align: 'center' }
      );
      y += 32;

      // Questions and answers
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Interview Questions & Answers', 15, y);
      y += 8;

      evaluations.forEach((e, i) => {
        // Check if we need a new page
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        // Question box
        doc.setFillColor(248, 249, 255);
        doc.roundedRect(15, y, pageWidth - 30, 8, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);

        const qText = `Q${i + 1}. ${e.question}`;
        const qLines = doc.splitTextToSize(qText, pageWidth - 40);
        doc.text(qLines, 18, y + 6);
        y += qLines.length * 6 + 6;

        // Score
        const scoreColor = e.evaluation.score >= 7 ? [16, 185, 129] : e.evaluation.score >= 5 ? [245, 158, 11] : [239, 68, 68];
        doc.setTextColor(...scoreColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`Score: ${e.evaluation.score}/10`, pageWidth - 15, y - qLines.length * 6 - 2, { align: 'right' });

        // Answer
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        const aLines = doc.splitTextToSize(`Your answer: ${e.answer}`, pageWidth - 40);
        doc.text(aLines, 18, y);
        y += aLines.length * 5 + 3;

        // Feedback
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const fLines = doc.splitTextToSize(`Feedback: ${e.evaluation.feedback}`, pageWidth - 40);
        doc.text(fLines, 18, y);
        y += fLines.length * 5 + 3;

        // Strengths
        doc.setTextColor(16, 185, 129);
        const sLines = doc.splitTextToSize(`Strengths: ${e.evaluation.strengths}`, pageWidth - 40);
        doc.text(sLines, 18, y);
        y += sLines.length * 5 + 3;

        // Improve
        doc.setTextColor(245, 158, 11);
        const iLines = doc.splitTextToSize(`Improve: ${e.evaluation.improve}`, pageWidth - 40);
        doc.text(iLines, 18, y);
        y += iLines.length * 5 + 8;

        // Divider
        doc.setDrawColor(220, 220, 220);
        doc.line(15, y, pageWidth - 15, y);
        y += 6;
      });

      // Footer
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by AI Interview Assistant', pageWidth / 2, 285, { align: 'center' });

      doc.save('interview-report.pdf');
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button onClick={onBack} style={{
        marginBottom: '1.5rem', padding: '0.5rem 1rem',
        background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer'
      }}>
        ← Back
      </button>

      <h2 style={{ marginBottom: '0.5rem' }}>📊 Session Report</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Your complete interview performance summary</p>

      {/* Overall score */}
      <div style={{
        padding: '1.5rem', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem',
        background: avgScore >= 7 ? '#f0fff4' : avgScore >= 5 ? '#fffbeb' : '#f0f4ff',
        border: `1px solid ${avgScore >= 7 ? '#86efac' : avgScore >= 5 ? '#fcd34d' : '#c7d2fe'}`
      }}>
        <p style={{ fontSize: '48px', fontWeight: 'bold', margin: 0, color: avgScore >= 7 ? '#16a34a' : avgScore >= 5 ? '#d97706' : '#6366f1' }}>
          {avgScore}/10
        </p>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>Overall Score</p>
        <p style={{ color: '#374151', fontWeight: 'bold', marginTop: '0.25rem' }}>
          {avgScore >= 7 ? '🌟 Excellent Performance!' : avgScore >= 5 ? '👍 Good Performance!' : '💪 Keep Practicing!'}
        </p>
      </div>

      {/* Summary table */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📋 Question Summary</h3>
        {evaluations.map((e, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.85rem 1rem', marginBottom: '0.5rem',
            background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '14px', color: '#374151', flex: 1, marginRight: '1rem' }}>
              Q{i + 1}. {e.question.slice(0, 60)}...
            </span>
            <span style={{
              fontWeight: 'bold', fontSize: '16px', minWidth: '50px', textAlign: 'right',
              color: e.evaluation.score >= 7 ? '#10b981' : e.evaluation.score >= 5 ? '#f59e0b' : '#ef4444'
            }}>
              {e.evaluation.score}/10
            </span>
          </div>
        ))}
      </div>

      {/* Download PDF button */}
      <button onClick={generatePDF} disabled={generating} style={{
        width: '100%', padding: '1rem', background: generating ? '#ccc' : '#6366f1',
        color: 'white', border: 'none', borderRadius: '8px',
        fontSize: '18px', cursor: generating ? 'not-allowed' : 'pointer',
        fontWeight: 'bold', marginBottom: '1rem'
      }}>
        {generating ? '⏳ Generating PDF...' : '⬇️ Download PDF Report'}
      </button>

      <button onClick={onBack} style={{
        width: '100%', padding: '0.85rem', background: '#f3f4f6',
        color: '#374151', border: 'none', borderRadius: '8px',
        fontSize: '16px', cursor: 'pointer', fontWeight: 'bold'
      }}>
        ← Back to Results
      </button>
    </main>
  );
}