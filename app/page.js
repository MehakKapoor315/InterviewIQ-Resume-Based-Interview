'use client';
import FaceAnalyzer from './components/FaceAnalyzer';
import ResumeSuggestions from './components/ResumeSuggestions';
import SessionReport from './components/SessionReport';
import { useState, useRef } from 'react';
import Webcam from 'react-webcam';

export default function Home() {
  const [faceStats, setFaceStats] = useState({ eyeContact: 100, posture: 100 });
  const [fillerStats, setFillerStats] = useState([]);
  const [step, setStep] = useState('upload');
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState('');
  const webcamRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Please upload a PDF file only.'); return; }
    setFileName(file.name);
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResumeText(data.text);
    } catch { setError('Failed to parse resume.'); }
    finally { setLoading(false); }
  };

  const generateQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setQuestions(data.questions); setStep('questions'); }
    } catch { setError('Failed to generate questions.'); }
    finally { setLoading(false); }
  };

  const speakQuestion = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto start listening after AI finishes speaking
      startListening();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startListening = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert('Microphone permission denied. Please allow mic access.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Please use Google Chrome for speech recognition.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 3; // ← ADD THIS

      recognition.onresult = (e) => {
        let final = '';
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            // Pick the most confident alternative
            let bestTranscript = '';
            let bestConfidence = 0;
            for (let j = 0; j < e.results[i].length; j++) {
              if (e.results[i][j].confidence > bestConfidence) {
                bestConfidence = e.results[i][j].confidence;
                bestTranscript = e.results[i][j].transcript;
              }
            }
            final += bestTranscript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        if (final) {
          setTranscript(final);
          setAnswer(final);
        } else if (interim) {
          setTranscript(interim);
        }
      };

      recognition.onerror = (e) => {
        if (e.error === 'aborted') {
          // Silently restart on abort — this is normal
          setTimeout(() => {
            try {
              recognition.start();
            } catch (err) {
              // ignore
            }
          }, 300);
          return; // Don't show any error
        } else if (e.error === 'network') {
          alert('Speech recognition needs internet connection.');
          setIsListening(false);
        } else if (e.error === 'not-allowed') {
          alert('Microphone blocked. Please allow mic in Chrome settings.');
          setIsListening(false);
        } else {
          console.log('Mic error:', e.error);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto restart if still supposed to be listening
        if (recognitionRef.current && isListening) {
          try {
            recognition.start();
          } catch (e) {
            console.log('Restart failed:', e);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);

    } catch (err) {
      console.error('Recognition start error:', err);
      alert('Could not start microphone: ' + err.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };
  const detectFillerWords = (text) => {
    const fillers = ['uh', 'um', 'umm', 'uhh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right', 'okay so', 'kind of', 'sort of', 'i mean'];
    const words = text.toLowerCase().split(/\s+/);
    const found = {};

    fillers.forEach(filler => {
      const fillerWords = filler.split(' ');
      if (fillerWords.length === 1) {
        const count = words.filter(w => w.replace(/[^a-z]/g, '') === filler).length;
        if (count > 0) found[filler] = count;
      } else {
        const regex = new RegExp(filler, 'gi');
        const matches = text.match(regex);
        if (matches) found[filler] = matches.length;
      }
    });

    const totalFillers = Object.values(found).reduce((a, b) => a + b, 0);
    const totalWords = words.length;
    const percentage = totalWords > 0 ? Math.round((totalFillers / totalWords) * 100) : 0;

    return { found, totalFillers, totalWords, percentage };
  };

  const submitAnswer = async () => {
    console.log('submitAnswer called, currentQ:', currentQ, 'total:', questions.length);
    if (!answer.trim()) {
      alert('Please speak your answer first!');
      return;
    }
    stopListening();
    setLoading(true);
    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions[currentQ].question,
          answer,
        }),
      });
      const data = await res.json();
      console.log('evaluation data:', JSON.stringify(data));
      const evaluation = data.evaluation || data;
      if (evaluation && evaluation.score !== undefined) {
        const fillerData = detectFillerWords(answer);
        const newEvals = [...evaluations, {
          question: questions[currentQ].question,
          answer,
          evaluation: evaluation,
          fillers: fillerData,
        }];
        setEvaluations(newEvals);
        setFillerStats(prev => [...prev, fillerData]);
        if (currentQ + 1 < questions.length) {
          console.log('Moving to next question');
          setCurrentQ(currentQ + 1);
          setAnswer('');
          setTranscript('');
        } else {
          console.log('Interview done, setting step to done');
          setStep('done');
        }
      } else {
        console.log('Invalid evaluation data:', JSON.stringify(data));
        alert('Could not evaluate answer. Please try again.');
      }
    } catch (err) {
      console.log('Error:', err);
      alert('Failed to evaluate answer.');
    } finally {
      setLoading(false);
    }
  };

  const typeColor = { technical: '#3b82f6', behavioral: '#8b5cf6', project: '#10b981' };

  // UPLOAD STEP
  if (step === 'upload') return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>

      {/* Navbar */}
      <nav style={{
        background: '#185FA5', padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600', letterSpacing: '-0.3px' }}>
          InterviewIQ
        </span>
        <span style={{
          background: '#B5D4F4', color: '#0C447C',
          fontSize: '11px', padding: '4px 12px',
          borderRadius: '999px', fontWeight: '500'
        }}>
          AI Powered
        </span>
      </nav>

      {/* Hero */}
      <div style={{
        background: '#E6F1FB', padding: '52px 32px 44px',
        textAlign: 'center', borderBottom: '1px solid #B5D4F4'
      }}>
        <h1 style={{
          fontSize: '32px', fontWeight: '700',
          color: '#042C53', marginBottom: '12px', lineHeight: '1.2'
        }}>
          Prepare smarter.<br />Interview with confidence.
        </h1>
        <p style={{
          fontSize: '16px', color: '#185FA5',
          maxWidth: '500px', margin: '0 auto', lineHeight: '1.7'
        }}>
          Upload your resume and let AI generate personalized interview questions,
          analyze your responses, and help you land your dream job.
        </p>
      </div>

      {/* Feature cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px', padding: '32px', background: '#fff',
        maxWidth: '900px', margin: '0 auto'
      }}>
        {[
          { icon: '📄', title: 'Resume-based questions', desc: 'AI reads your resume and generates personalized interview questions based on your skills and experience' },
          { icon: '🎥', title: 'Live video interview', desc: 'Real-time camera interview with eye contact tracking, posture analysis and voice recognition' },
          { icon: '📊', title: 'Detailed PDF report', desc: 'Download complete performance report with scores, feedback and resume improvement suggestions' },
        ].map((f, i) => (
          <div key={i} style={{
            background: '#f8fafc', borderRadius: '12px',
            padding: '20px', border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '40px', height: '40px', background: '#E6F1FB',
              borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', marginBottom: '12px'
            }}>
              {f.icon}
            </div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
              {f.title}
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Upload box */}
      <div style={{ padding: '0 32px 32px', background: '#fff', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          border: '2px dashed #85B7EB', borderRadius: '16px',
          padding: '48px 24px', textAlign: 'center', background: '#E6F1FB'
        }}>
          <div style={{
            width: '56px', height: '56px', background: '#fff',
            borderRadius: '14px', border: '1px solid #B5D4F4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '24px'
          }}>
            📤
          </div>
          <p style={{ fontSize: '17px', fontWeight: '600', color: '#042C53', marginBottom: '8px' }}>
            Upload your resume to get started
          </p>
          <p style={{ fontSize: '14px', color: '#185FA5', marginBottom: '24px' }}>
            PDF format only — your resume will be analyzed by AI
          </p>

          <label style={{
            display: 'inline-block', background: '#185FA5', color: '#fff',
            padding: '12px 32px', borderRadius: '8px', fontSize: '15px',
            fontWeight: '500', cursor: 'pointer'
          }}>
            Choose PDF file
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </label>

          {loading && (
            <p style={{ marginTop: '16px', color: '#185FA5', fontSize: '14px' }}>
              ⏳ Parsing your resume...
            </p>
          )}
          {error && (
            <p style={{ marginTop: '16px', color: '#dc2626', fontSize: '14px' }}>
              {error}
            </p>
          )}
        </div>

        {/* Success state */}
        {resumeText && !loading && (
          <div style={{
            marginTop: '20px', padding: '20px 24px',
            background: '#f0fdf4', borderRadius: '12px',
            border: '1px solid #86efac',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', background: '#dcfce7',
                borderRadius: '10px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '18px'
              }}>
                ✅
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#166534', margin: 0 }}>
                  Resume parsed successfully
                </p>
                <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>
                  {fileName}
                </p>
              </div>
            </div>
            <button
              onClick={generateQuestions}
              disabled={loading}
              style={{
                background: loading ? '#ccc' : '#185FA5',
                color: '#fff', border: 'none',
                padding: '12px 28px', borderRadius: '8px',
                fontSize: '15px', fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Generating...' : 'Generate Questions →'}
            </button>
          </div>
        )}
      </div>

      {/* Steps */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0', padding: '24px 32px', background: '#fff',
        borderTop: '1px solid #e2e8f0', maxWidth: '900px', margin: '0 auto'
      }}>
        {['Upload resume', 'Generate questions', 'Start interview', 'Get report'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px', height: '26px', background: '#185FA5',
                color: '#fff', borderRadius: '50%', fontSize: '12px',
                fontWeight: '600', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: '13px', color: '#475569' }}>{s}</span>
            </div>
            {i < 3 && (
              <div style={{ width: '32px', height: '1px', background: '#B5D4F4', margin: '0 12px' }} />
            )}
          </div>
        ))}
      </div>

    </main>
  );

  // QUESTIONS PREVIEW STEP
  if (step === 'questions') {
    const technicalCount = questions.filter(q => q.type === 'technical').length;
    const behavioralCount = questions.filter(q => q.type === 'behavioral').length;
    const projectCount = questions.filter(q => q.type === 'project').length;

    return (
      <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>

        {/* Navbar */}
        <nav style={{
          background: '#185FA5', padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>
            InterviewIQ
          </span>
          <span style={{
            background: '#B5D4F4', color: '#0C447C',
            fontSize: '11px', padding: '4px 12px',
            borderRadius: '999px', fontWeight: '500'
          }}>
            AI Powered
          </span>
        </nav>

        {/* Header */}
        <div style={{
          background: '#E6F1FB', padding: '28px 32px',
          borderBottom: '1px solid #B5D4F4'
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
            Your Interview Questions
          </h2>
          <p style={{ fontSize: '14px', color: '#185FA5' }}>
            AI generated {questions.length} personalized questions based on your resume
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            {[
              { num: technicalCount, label: 'Technical' },
              { num: behavioralCount, label: 'Behavioral' },
              { num: projectCount, label: 'Project' },
              { num: questions.length, label: 'Total' },
            ].map((s, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '8px',
                padding: '10px 20px', border: '1px solid #B5D4F4',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#185FA5' }}>{s.num}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions list */}
        <div style={{ padding: '24px 32px', background: '#fff', maxWidth: '900px', margin: '0 auto' }}>
          {questions.map((q) => {
            const badgeStyle = {
              technical: { background: '#dbeafe', color: '#1d4ed8' },
              behavioral: { background: '#ede9fe', color: '#6d28d9' },
              project: { background: '#dcfce7', color: '#15803d' },
            }[q.type] || { background: '#f1f5f9', color: '#475569' };

            return (
              <div key={q.id} style={{
                background: '#f8fafc', borderRadius: '12px',
                padding: '18px 20px', marginBottom: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex', gap: '16px', alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '32px', height: '32px', background: '#185FA5',
                  color: '#fff', borderRadius: '8px', fontSize: '13px',
                  fontWeight: '600', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  {q.id}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6', marginBottom: '8px' }}>
                    {q.question}
                  </p>
                  <span style={{
                    display: 'inline-block', fontSize: '11px',
                    padding: '3px 10px', borderRadius: '999px',
                    fontWeight: '500', ...badgeStyle
                  }}>
                    {q.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer buttons */}
        <div style={{
          padding: '20px 32px', background: '#fff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          maxWidth: '900px', margin: '0 auto'
        }}>
          <button
            onClick={() => setStep('upload')}
            style={{
              background: 'transparent', color: '#185FA5',
              border: '1px solid #185FA5', padding: '12px 24px',
              borderRadius: '8px', fontSize: '15px',
              fontWeight: '500', cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => setStep('interview')}
            style={{
              background: '#185FA5', color: '#fff',
              border: 'none', padding: '12px 32px',
              borderRadius: '8px', fontSize: '15px',
              fontWeight: '500', cursor: 'pointer'
            }}
          >
            Start Video Interview →
          </button>
        </div>

      </main>
    );
  }

  // INTERVIEW STEP
  if (step === 'interview') return (
    <main style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>🎥 Live Interview</h2>
        <span style={{ color: '#666', fontSize: '14px' }}>
          Question {currentQ + 1} of {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '1.5rem' }}>
        <div style={{
          height: '100%',
          width: `${((currentQ + 1) / questions.length) * 100}%`,
          background: '#6366f1', borderRadius: '4px', transition: 'width 0.4s'
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Left — Camera */}
        <div>
          <Webcam
            ref={webcamRef}
            mirrored={true}
            style={{ width: '100%', borderRadius: '12px', background: '#1f2937' }}
          />
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
            📹 You
          </p>

          <FaceAnalyzer
            webcamRef={webcamRef}
            isInterviewing={true}
            onUpdate={(stats) => setFaceStats(stats)}
          />

          {/* Mic status */}
          <div style={{
            marginTop: '0.75rem', padding: '0.75rem', borderRadius: '10px', textAlign: 'center',
            background: isListening ? '#fef2f2' : '#f9fafb',
            border: `1px solid ${isListening ? '#fca5a5' : '#e5e7eb'}`
          }}>
            {isListening ? (
              <p style={{ margin: 0, color: '#ef4444', fontWeight: 'bold' }}>
                🔴 Listening... speak your answer
              </p>
            ) : (
              <p style={{ margin: 0, color: '#6b7280' }}>
                🎤 Mic is off
              </p>
            )}
          </div>

          {/* Transcript preview */}
          {(transcript || answer) && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0f4ff', borderRadius: '8px', fontSize: '13px', color: '#374151' }}>
              <strong>Your answer:</strong><br />
              {transcript || answer}
              {isListening && (
                <span style={{ color: '#6366f1', marginLeft: '4px' }}>●</span>
              )}
            </div>
          )}
        </div>

        {/* Right — Question + Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Question card */}
          <div style={{ padding: '1.25rem', background: '#f0f4ff', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1' }}>
                QUESTION {currentQ + 1}
              </span>
              <span style={{
                fontSize: '12px', padding: '2px 8px', borderRadius: '999px',
                color: 'white', background: { technical: '#3b82f6', behavioral: '#8b5cf6', project: '#10b981' }[questions[currentQ].type] || '#6b7280'
              }}>
                {questions[currentQ].type}
              </span>
            </div>
            <p style={{ margin: 0, fontWeight: '500', fontSize: '15px', lineHeight: '1.5' }}>
              {questions[currentQ].question}
            </p>
          </div>

          {/* Speak question button */}
          <button onClick={() => speakQuestion(questions[currentQ].question)} disabled={isSpeaking} style={{
            padding: '0.75rem', borderRadius: '8px', border: 'none',
            cursor: isSpeaking ? 'not-allowed' : 'pointer',
            background: isSpeaking ? '#fbbf24' : '#6366f1',
            color: 'white', fontWeight: 'bold', fontSize: '14px'
          }}>
            {isSpeaking ? '🔊 AI is speaking...' : '🔊 Hear Question'}
          </button>

          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking}
            style={{
              padding: '0.75rem', borderRadius: '8px', border: 'none',
              cursor: isSpeaking ? 'not-allowed' : 'pointer',
              background: isListening ? '#ef4444' : '#10b981',
              color: 'white', fontWeight: 'bold', fontSize: '14px'
            }}
          >
            {isListening ? '⏹ Stop Recording' : '🎤 Start Recording Answer'}
          </button>

          {/* Submit button */}
          <button onClick={submitAnswer} disabled={loading || !answer.trim()} style={{
            padding: '0.75rem', borderRadius: '8px', border: 'none',
            cursor: loading || !answer.trim() ? 'not-allowed' : 'pointer',
            background: loading || !answer.trim() ? '#ccc' : '#1f2937',
            color: 'white', fontWeight: 'bold', fontSize: '14px'
          }}>
            {loading ? '⏳ Evaluating answer...' : currentQ + 1 === questions.length ? '✅ Finish Interview' : '➡️ Submit & Next Question'}
          </button>

        </div>
      </div>
    </main>
  );


  // DONE STEP
  if (step === 'done') {
    if (!evaluations || evaluations.length === 0) {
      return (
        <main style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>Loading results...</h2>
        </main>
      );
    }

    const avgScore = Math.round(
      evaluations.reduce((sum, e) => sum + e.evaluation.score, 0) / evaluations.length
    );

    return (
      <main style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>🎉 Interview Complete!</h2>

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
            {avgScore >= 7 ? '🌟 Excellent!' : avgScore >= 5 ? '👍 Good!' : '💪 Keep Practicing!'}
          </p>
        </div>

        {/* Per question results */}
        {/* Analysis Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>

          <div style={{ padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', margin: 0 }}>👁️</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0.25rem 0', color: faceStats.eyeContact >= 70 ? '#10b981' : faceStats.eyeContact >= 50 ? '#f59e0b' : '#ef4444' }}>
              {faceStats.eyeContact}%
            </p>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Eye Contact</p>
          </div>

          <div style={{ padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', margin: 0 }}>🧍</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0.25rem 0', color: faceStats.posture >= 70 ? '#10b981' : faceStats.posture >= 50 ? '#f59e0b' : '#ef4444' }}>
              {faceStats.posture}%
            </p>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Posture</p>
          </div>

          <div style={{ padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', margin: 0 }}>🗣️</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0.25rem 0', color: fillerStats.reduce((sum, f) => sum + f.totalFillers, 0) <= 5 ? '#10b981' : fillerStats.reduce((sum, f) => sum + f.totalFillers, 0) <= 15 ? '#f59e0b' : '#ef4444' }}>
              {fillerStats.reduce((sum, f) => sum + f.totalFillers, 0)}
            </p>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Filler Words</p>
          </div>
        </div>

        {/* Filler word details */}
        {fillerStats.length > 0 && (() => {
          const allFillers = {};
          fillerStats.forEach(f => {
            Object.entries(f.found).forEach(([word, count]) => {
              allFillers[word] = (allFillers[word] || 0) + count;
            });
          });
          const totalFillers = Object.values(allFillers).reduce((a, b) => a + b, 0);

          return totalFillers > 0 ? (
            <div style={{ padding: '1.25rem', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fcd34d', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', color: '#92400e' }}>🗣️ Filler Words Detected</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {Object.entries(allFillers).map(([word, count]) => (
                  <span key={word} style={{ padding: '4px 10px', background: '#fef3c7', borderRadius: '999px', fontSize: '13px', color: '#92400e' }}>
                    "{word}" × {count}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#78350f' }}>
                💡 <strong>Tip:</strong> Instead of saying filler words, take a short pause. It sounds more confident and professional.
              </p>
            </div>
          ) : null;
        })()}
        {evaluations.map((e, i) => (
          <div key={i} style={{
            marginBottom: '1.5rem', padding: '1.5rem',
            background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '14px', flex: 1, marginRight: '1rem' }}>Q{i + 1}. {e.question}</strong>
              <span style={{
                fontSize: '18px', fontWeight: 'bold', minWidth: '50px', textAlign: 'right',
                color: e.evaluation.score >= 7 ? '#10b981' : e.evaluation.score >= 5 ? '#f59e0b' : '#ef4444'
              }}>
                {e.evaluation.score}/10
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0.5rem' }}>
              🗣 <em>{e.answer}</em>
            </p>
            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '0.4rem' }}>💬 {e.evaluation.feedback}</p>
            <p style={{ fontSize: '13px', color: '#10b981', marginBottom: '0.4rem' }}>✅ {e.evaluation.strengths}</p>
            <p style={{ fontSize: '13px', color: '#f59e0b' }}>💡 {e.evaluation.improve}</p>
          </div>
        ))}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => setStep('resume-suggestions')} style={{
            flex: 1, padding: '0.85rem', background: '#10b981',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            📄 Improve Resume
          </button>
          <button onClick={() => setStep('session-report')} style={{
            flex: 1, padding: '0.85rem', background: '#6366f1',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            📊 Download Report
          </button>
          <button onClick={() => {
            setStep('upload'); setQuestions([]); setEvaluations([]);
            setCurrentQ(0); setAnswer(''); setTranscript('');
          }} style={{
            flex: 1, padding: '0.85rem', background: '#1f2937',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            🔄 New Interview
          </button>
        </div>
      </main>
    );
  }
  if (step === 'resume-suggestions') {
    return (
      <ResumeSuggestions
        resumeText={resumeText}
        onBack={() => setStep('done')}
      />
    );
  }
  if (step === 'session-report') {
    return (
      <SessionReport
        evaluations={evaluations}
        resumeText={resumeText}
        faceStats={faceStats}
        fillerStats={fillerStats}
        onBack={() => setStep('done')}
      />
    );
  }
}