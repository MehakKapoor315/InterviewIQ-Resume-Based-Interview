'use client';
import { useState, useEffect } from 'react';

export default function ResumeSuggestions({ resumeText, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImproved, setShowImproved] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/improve-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText }),
        });
        const result = await res.json();
        if (result.error) setError(result.error);
        else setData(result);
      } catch {
        setError('Failed to get suggestions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#185FA5', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>InterviewIQ</span>
        <span style={{ background: '#B5D4F4', color: '#0C447C', fontSize: '11px', padding: '4px 12px', borderRadius: '999px', fontWeight: '500' }}>AI Powered</span>
      </nav>
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#042C53', marginBottom: '8px' }}>Analyzing Your Resume...</h2>
        <p style={{ fontSize: '14px', color: '#185FA5' }}>AI is reviewing and improving your resume</p>
      </div>
    </main>
  );

  if (error) return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#185FA5', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>InterviewIQ</span>
        <span style={{ background: '#B5D4F4', color: '#0C447C', fontSize: '11px', padding: '4px 12px', borderRadius: '999px', fontWeight: '500' }}>AI Powered</span>
      </nav>
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <p style={{ color: '#dc2626', marginBottom: '16px' }}>❌ {error}</p>
        <button onClick={onBack} style={{ background: '#185FA5', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
          ← Go Back
        </button>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>

      {/* Navbar */}
      <nav style={{ background: '#185FA5', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>InterviewIQ</span>
        <span style={{ background: '#B5D4F4', color: '#0C447C', fontSize: '11px', padding: '4px 12px', borderRadius: '999px', fontWeight: '500' }}>AI Powered</span>
      </nav>

      {/* Header */}
      <div style={{ background: '#E6F1FB', padding: '28px 32px', borderBottom: '1px solid #B5D4F4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#042C53', marginBottom: '4px' }}>Resume Analysis</h2>
          <p style={{ fontSize: '14px', color: '#185FA5' }}>AI has reviewed your resume and found improvements</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 24px', textAlign: 'center', border: '1px solid #B5D4F4' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#185FA5' }}>{data.overallRating}/10</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Resume Rating</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>

        {/* Summary */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#042C53', marginBottom: '8px' }}>Summary</p>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>{data.summary}</p>
        </div>

        {/* Suggestions */}
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#042C53', marginBottom: '12px' }}>
          Improvement Suggestions
        </h3>
        {data.suggestions.map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex', gap: '12px', alignItems: 'flex-start'
          }}>
            <div style={{
              width: '28px', height: '28px', background: '#E6F1FB',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: '600',
              color: '#185FA5', flexShrink: 0
            }}>
              {i + 1}
            </div>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{s}</p>
          </div>
        ))}

        {/* Show improved resume button */}
        <button
          onClick={() => setShowImproved(!showImproved)}
          style={{
            width: '100%', background: '#185FA5', color: '#fff',
            border: 'none', padding: '14px', borderRadius: '10px',
            fontSize: '14px', fontWeight: '500', cursor: 'pointer',
            marginTop: '4px', marginBottom: '16px'
          }}
        >
          {showImproved ? '🔼 Hide Improved Resume' : '✨ Show AI Improved Resume'}
        </button>

        {/* Improved resume */}
        {showImproved && (
          <div style={{
            background: '#fff', borderRadius: '12px',
            padding: '20px', border: '1px solid #86efac',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', marginBottom: '12px' }}>
              ✅ AI Improved Resume
            </p>
            <pre style={{
              whiteSpace: 'pre-wrap', fontSize: '13px',
              color: '#1e293b', lineHeight: '1.8',
              fontFamily: 'sans-serif', margin: 0
            }}>
              {data.improvedResume}
            </pre>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: 'transparent', color: '#185FA5',
            border: '1px solid #185FA5', padding: '10px 20px',
            borderRadius: '8px', fontSize: '13px',
            fontWeight: '500', cursor: 'pointer'
          }}
        >
          ← Back to Results
        </button>

      </div>
    </main>
  );
}