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
    <main style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>📄 Analyzing Your Resume...</h2>
      <p style={{ color: '#666', marginTop: '1rem' }}>AI is reviewing and improving your resume</p>
      <div style={{ marginTop: '2rem', fontSize: '48px' }}>⏳</div>
    </main>
  );

  if (error) return (
    <main style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <p style={{ color: 'red' }}>❌ {error}</p>
      <button onClick={onBack} style={{ marginTop: '1rem', padding: '0.75rem 2rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        ← Go Back
      </button>
    </main>
  );

  return (
    <main style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button onClick={onBack} style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        ← Back to Results
      </button>

      <h2 style={{ marginBottom: '0.5rem' }}>📄 Resume Analysis</h2>

      {/* Overall rating */}
      <div style={{
        padding: '1.5rem', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem',
        background: '#f0f4ff', border: '1px solid #c7d2fe'
      }}>
        <p style={{ fontSize: '48px', fontWeight: 'bold', margin: 0, color: '#6366f1' }}>
          {data.overallRating}/10
        </p>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>Resume Rating</p>
        <p style={{ color: '#374151', marginTop: '0.5rem', fontSize: '14px' }}>{data.summary}</p>
      </div>

      {/* Suggestions */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>💡 Improvement Suggestions</h3>
        {data.suggestions.map((s, i) => (
          <div key={i} style={{
            padding: '1rem', marginBottom: '0.75rem',
            background: '#fffbeb', borderRadius: '8px',
            border: '1px solid #fcd34d',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>{s}</p>
          </div>
        ))}
      </div>

      {/* Improved resume toggle */}
      <button onClick={() => setShowImproved(!showImproved)} style={{
        width: '100%', padding: '0.85rem', background: '#10b981',
        color: 'white', border: 'none', borderRadius: '8px',
        fontSize: '16px', cursor: 'pointer', fontWeight: 'bold',
        marginBottom: '1rem'
      }}>
        {showImproved ? '🔼 Hide Improved Resume' : '✨ Show AI Improved Resume'}
      </button>

      {showImproved && (
        <div style={{
          padding: '1.5rem', background: '#f0fff4',
          borderRadius: '12px', border: '1px solid #86efac'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#16a34a' }}>✅ Improved Resume</h3>
          <pre style={{
            whiteSpace: 'pre-wrap', fontSize: '13px',
            color: '#1f2937', lineHeight: '1.6', fontFamily: 'sans-serif'
          }}>
            {data.improvedResume}
          </pre>
        </div>
      )}
    </main>
  );
}