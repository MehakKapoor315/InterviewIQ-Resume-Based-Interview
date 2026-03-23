'use client';
import { useState } from 'react';

export default function ResumeUpload({ onParsed }) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file only.');
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        onParsed(data.text); // pass text up to parent
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Upload Your Resume</h2>
      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        style={{ marginBottom: '1rem', display: 'block' }}
      />
      {loading && <p>Parsing resume...</p>}
      {fileName && !loading && <p>✓ Loaded: {fileName}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}