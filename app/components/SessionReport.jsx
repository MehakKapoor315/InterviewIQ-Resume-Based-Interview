'use client';
import { useState } from 'react';

export default function SessionReport({ evaluations, resumeText, onBack, faceStats, fillerStats, user, onLogout, onSetPassword }) {
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
      doc.setTextColor(24, 95, 165);
      doc.text('InterviewIQ - Session Report', pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(new Date().toLocaleDateString('en-IN', { dateStyle: 'full' }), pageWidth / 2, y, { align: 'center' });
      y += 14;

      // Overall score box
      doc.setFillColor(230, 241, 251);
      doc.roundedRect(15, y, pageWidth - 30, 28, 4, 4, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 95, 165);
      doc.text(`Overall Score: ${avgScore}/10`, pageWidth / 2, y + 10, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        avgScore >= 7 ? 'Excellent Performance!' : avgScore >= 5 ? 'Good Performance!' : 'Needs Improvement',
        pageWidth / 2, y + 20, { align: 'center' }
      );
      y += 36;

      // Communication analysis
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 44, 83);
      doc.text('Communication Analysis', 15, y);
      y += 8;

      const boxWidth = (pageWidth - 40) / 3;

      // Eye contact
      doc.setFillColor(240, 255, 248);
      doc.roundedRect(15, y, boxWidth, 22, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('Eye Contact', 15 + boxWidth / 2, y + 7, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${eyeContact}%`, 15 + boxWidth / 2, y + 17, { align: 'center' });

      // Posture
      doc.setFillColor(240, 248, 255);
      doc.roundedRect(15 + boxWidth + 5, y, boxWidth, 22, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('Posture', 15 + boxWidth + 5 + boxWidth / 2, y + 7, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${posture}%`, 15 + boxWidth + 5 + boxWidth / 2, y + 17, { align: 'center' });

      // Filler words
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(15 + (boxWidth + 5) * 2, y, boxWidth, 22, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text('Filler Words', 15 + (boxWidth + 5) * 2 + boxWidth / 2, y + 7, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${totalFillers}`, 15 + (boxWidth + 5) * 2 + boxWidth / 2, y + 17, { align: 'center' });
      y += 30;

      // Filler details
      if (Object.keys(fillerDetails).length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 53, 15);
        const fillerText = 'Detected: ' + Object.entries(fillerDetails).map(([w, c]) => `"${w}" x${c}`).join(', ');
        const fillerLines = doc.splitTextToSize(fillerText, pageWidth - 30);
        doc.text(fillerLines, 15, y);
        y += fillerLines.length * 5 + 3;
        doc.setFont('helvetica', 'italic');
        doc.text('Tip: Take a short pause instead of using filler words.', 15, y);
        y += 10;
      }

      // Questions
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 44, 83);
      doc.text('Interview Questions & Answers', 15, y);
      y += 8;

      evaluations.forEach((e, i) => {
        if (y > 240) { doc.addPage(); y = 20; }

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, y, pageWidth - 30, 8, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);

        const qText = `Q${i + 1}. ${e.question}`;
        const qLines = doc.splitTextToSize(qText, pageWidth - 50);
        doc.text(qLines, 18, y + 6);

        const scoreColor = e.evaluation.score >= 7 ? [16, 185, 129] : e.evaluation.score >= 5 ? [245, 158, 11] : [239, 68, 68];
        doc.setTextColor(...scoreColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`${e.evaluation.score}/10`, pageWidth - 15, y + 6, { align: 'right' });
        y += qLines.length * 6 + 6;

        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        const aLines = doc.splitTextToSize(`Answer: ${e.answer}`, pageWidth - 40);
        doc.text(aLines, 18, y);
        y += aLines.length * 5 + 3;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const fLines = doc.splitTextToSize(`Feedback: ${e.evaluation.feedback}`, pageWidth - 40);
        doc.text(fLines, 18, y);
        y += fLines.length * 5 + 3;

        doc.setTextColor(16, 185, 129);
        const sLines = doc.splitTextToSize(`Strengths: ${e.evaluation.strengths}`, pageWidth - 40);
        doc.text(sLines, 18, y);
        y += sLines.length * 5 + 3;

        doc.setTextColor(245, 158, 11);
        const iLines = doc.splitTextToSize(`Improve: ${e.evaluation.improve}`, pageWidth - 40);
        doc.text(iLines, 18, y);
        y += iLines.length * 5 + 8;

        doc.setDrawColor(220, 220, 220);
        doc.line(15, y, pageWidth - 15, y);
        y += 6;
      });

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by InterviewIQ - AI Powered Interview Assistant', pageWidth / 2, 285, { align: 'center' });

      doc.save('interviewiq-report.pdf');
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>

      {/* Navbar */}
      <nav style={{ background: '#185FA5', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>InterviewIQ</span>
          <span style={{ background: '#B5D4F4', color: '#0C447C', fontSize: '11px', padding: '4px 12px', borderRadius: '999px', fontWeight: '500' }}>AI Powered</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>Hi, {user.name}</span>}
          {user && user.authMethod === 'google' && (
            <button
              onClick={onSetPassword}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid #B5D4F4',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Set Password
            </button>
          )}
          <button onClick={onLogout} style={{ background: 'transparent', color: '#fff', border: '1px solid #B5D4F4', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      {/* Header */}
      <div style={{ background: '#E6F1FB', padding: '28px 32px', borderBottom: '1px solid #B5D4F4' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#042C53', marginBottom: '4px' }}>Session Report</h2>
        <p style={{ fontSize: '14px', color: '#185FA5' }}>Your complete interview performance summary — download as PDF</p>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>

        {/* Score + Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

          {/* Overall score */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Overall Score</p>
            <div style={{ fontSize: '40px', fontWeight: '700', color: avgScore >= 7 ? '#16a34a' : avgScore >= 5 ? '#185FA5' : '#dc2626' }}>
              {avgScore}/10
            </div>
            <div style={{
              display: 'inline-block', marginTop: '8px',
              background: avgScore >= 7 ? '#dcfce7' : avgScore >= 5 ? '#dbeafe' : '#fee2e2',
              color: avgScore >= 7 ? '#15803d' : avgScore >= 5 ? '#1d4ed8' : '#dc2626',
              fontSize: '12px', padding: '4px 14px', borderRadius: '999px', fontWeight: '500'
            }}>
              {avgScore >= 7 ? 'Excellent Performance!' : avgScore >= 5 ? 'Good Performance!' : 'Keep Practicing!'}
            </div>
          </div>

          {/* Communication metrics */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Communication Analysis</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {[
                { icon: '👁️', val: `${eyeContact}%`, label: 'Eye Contact', color: eyeContact >= 70 ? '#16a34a' : eyeContact >= 50 ? '#d97706' : '#dc2626' },
                { icon: '🧍', val: `${posture}%`, label: 'Posture', color: posture >= 70 ? '#16a34a' : posture >= 50 ? '#d97706' : '#dc2626' },
                { icon: '🗣️', val: totalFillers, label: 'Fillers', color: totalFillers <= 5 ? '#16a34a' : totalFillers <= 15 ? '#d97706' : '#dc2626' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px' }}>{m.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: m.color, margin: '2px 0' }}>{m.val}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question summary */}
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#042C53', marginBottom: '12px' }}>
          Question Summary
        </h3>
        {evaluations.map((e, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '8px',
            border: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <p style={{ fontSize: '13px', color: '#1e293b', flex: 1, marginRight: '12px', margin: 0 }}>
              Q{i + 1}. {e.question.slice(0, 80)}{e.question.length > 80 ? '...' : ''}
            </p>
            <span style={{
              fontSize: '15px', fontWeight: '700', flexShrink: 0,
              color: e.evaluation.score >= 7 ? '#16a34a' : e.evaluation.score >= 5 ? '#d97706' : '#dc2626'
            }}>
              {e.evaluation.score}/10
            </span>
          </div>
        ))}

        {/* Download button */}
        <button
          onClick={generatePDF}
          disabled={generating}
          style={{
            width: '100%', background: generating ? '#cbd5e1' : '#185FA5',
            color: '#fff', border: 'none', padding: '14px',
            borderRadius: '10px', fontSize: '15px', fontWeight: '600',
            cursor: generating ? 'not-allowed' : 'pointer', marginTop: '16px'
          }}
        >
          {generating ? '⏳ Generating PDF...' : '⬇️ Download PDF Report'}
        </button>

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            width: '100%', background: 'transparent', color: '#185FA5',
            border: '1px solid #185FA5', padding: '12px',
            borderRadius: '10px', fontSize: '14px', fontWeight: '500',
            cursor: 'pointer', marginTop: '10px'
          }}
        >
          ← Back to Results
        </button>

      </div>
    </main>
  );
}