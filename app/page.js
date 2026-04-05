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
  const isListeningRef = useRef(false);

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
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);

    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    // Safety timeout — force reset after 30 seconds
    setTimeout(() => {
      setIsSpeaking(false);
    }, 30000);

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
      recognition.maxAlternatives = 3;

      recognition.onresult = (e) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            let bestTranscript = '';
            let bestConfidence = 0;
            for (let j = 0; j < e.results[i].length; j++) {
              if (e.results[i][j].confidence > bestConfidence) {
                bestConfidence = e.results[i][j].confidence;
                bestTranscript = e.results[i][j].transcript;
              }
            }
            finalTranscript += bestTranscript + ' ';
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }

        if (finalTranscript.trim()) {
          setAnswer(prev => prev + finalTranscript);
          setTranscript(''); // clear interim when final comes
        } else if (interimTranscript) {
          setTranscript(interimTranscript); // only show current interim
        }
      };
      recognition.onerror = (e) => {
        if (e.error === 'aborted') {
          setTimeout(() => {
            if (isListeningRef.current) {
              try { recognition.start(); } catch (err) { }
            }
          }, 300);
          return;
        } else if (e.error === 'network') {
          alert('Speech recognition needs internet connection.');
          setIsListening(false);
          isListeningRef.current = false;
        } else if (e.error === 'not-allowed') {
          alert('Microphone blocked. Please allow mic in Chrome settings.');
          setIsListening(false);
          isListeningRef.current = false;
        } else {
          console.log('Mic error:', e.error);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            // Small delay before restart to avoid duplicate capture
            setTimeout(() => {
              if (isListeningRef.current) {
                recognition.start();
              }
            }, 500);
          } catch (e) { }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);

    } catch (err) {
      console.error('Recognition start error:', err);
      alert('Could not start microphone: ' + err.message);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
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
        background: 'linear-gradient(135deg, #E6F1FB 0%, #dbeafe 100%)',
        padding: '60px 32px 52px',
        textAlign: 'center', borderBottom: '1px solid #B5D4F4',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-block', background: '#185FA5',
          color: '#fff', fontSize: '11px', fontWeight: '600',
          padding: '6px 16px', borderRadius: '999px',
          marginBottom: '20px', letterSpacing: '0.5px'
        }}>
          AI POWERED INTERVIEW PREPARATION
        </div>
        <h1 style={{
          fontSize: '36px', fontWeight: '700',
          color: '#042C53', marginBottom: '16px', lineHeight: '1.2'
        }}>
          Prepare smarter.<br />Interview with confidence.
        </h1>
        <p style={{
          fontSize: '16px', color: '#185FA5',
          maxWidth: '520px', margin: '0 auto', lineHeight: '1.8'
        }}>
          Upload your resume and let AI generate personalized interview questions,
          analyze your responses, and help you land your dream job.
        </p>
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: '24px', marginTop: '24px'
        }}>
          {['Resume Parsing', 'Voice Recognition', 'Video Analysis', 'PDF Report'].map((tag, i) => (
            <span key={i} style={{
              fontSize: '12px', color: '#185FA5',
              background: '#fff', padding: '4px 12px',
              borderRadius: '999px', border: '1px solid #B5D4F4',
              fontWeight: '500'
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>


      {/* Feature cards */}
      <style>{`
  .feat-card {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: default;
  }
  .feat-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(24,95,165,0.15);
    border-color: #185FA5;
  }
  .upload-btn {
    display: inline-block;
    background: #185FA5;
    color: #fff;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
  }
  .upload-btn:hover {
    background: #0C447C;
    transform: scale(1.02);
  }
  .upload-btn:active {
    background: #042C53;
    transform: scale(0.98);
  }
`}</style>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px', padding: '32px', background: '#f0f4f8',
        maxWidth: '900px', margin: '0 auto'
      }}>
        {[
          { icon: '📄', title: 'Resume-based questions', desc: 'AI reads your resume and generates personalized interview questions based on your skills and experience' },
          { icon: '🎥', title: 'Live video interview', desc: 'Real-time camera interview with eye contact tracking, posture analysis and voice recognition' },
          { icon: '📊', title: 'Detailed PDF report', desc: 'Download complete performance report with scores, feedback and resume improvement suggestions' },
        ].map((f, i) => (
          <div key={i} className="feat-card">
            <div style={{
              width: '48px', height: '48px', background: '#E6F1FB',
              borderRadius: '12px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '22px', marginBottom: '16px',
              border: '1px solid #B5D4F4'
            }}>
              {f.icon}
            </div>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#042C53', marginBottom: '8px' }}>
              {f.title}
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.7', margin: 0 }}>
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

          <label className="upload-btn">
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
              className={loading ? '' : 'upload-btn'}
              style={{
                color: '#fff', border: 'none',
                padding: '12px 28px', borderRadius: '8px',
                fontSize: '15px', fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#cbd5e1' : undefined
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
        <style>{`
        .upload-btn {
    display: inline-block;
    background: #185FA5;
    color: #fff;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
  }
  .upload-btn:hover {
    background: #0C447C;
    transform: scale(1.02);
  }
  .upload-btn:active {
    background: #042C53;
    transform: scale(0.98);
  }
    .q-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: default;
    }
    .q-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(24,95,165,0.12);
      border-color: #185FA5;
      background: #fff;
    }
  `}</style>

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
              <div key={q.id} className="q-card">
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
            className="upload-btn"
            style={{
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Start Video Interview →
          </button>
        </div>

      </main>
    );
  }

  //INTERVIEW STEP
  if (step === 'interview') return (
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

      {/* Progress bar */}
      <div style={{ height: '4px', background: '#B5D4F4' }}>
        <div style={{
          height: '100%',
          width: `${((currentQ + 1) / questions.length) * 100}%`,
          background: '#185FA5', transition: 'width 0.4s'
        }} />
      </div>

      {/* Progress label */}
      <div style={{
        background: '#E6F1FB', padding: '10px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #B5D4F4'
      }}>
        <span style={{ fontSize: '13px', color: '#185FA5', fontWeight: '500' }}>
          Question {currentQ + 1} of {questions.length}
        </span>
        <span style={{ fontSize: '13px', color: '#185FA5' }}>
          {Math.round(((currentQ + 1) / questions.length) * 100)}% complete
        </span>
      </div>

      {/* Main content grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '20px', padding: '24px 32px',
        maxWidth: '1000px', margin: '0 auto'
      }}>

        {/* LEFT — Camera + Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Camera */}
          <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <Webcam
              ref={webcamRef}
              mirrored={true}
              style={{ width: '100%', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: '10px', left: '10px',
              background: 'rgba(0,0,0,0.5)', color: '#fff',
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px'
            }}>
              You
            </div>
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              background: '#dc2626', color: '#fff',
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%' }} />
              LIVE
            </div>
          </div>

          {/* Face analyzer */}
          <FaceAnalyzer
            webcamRef={webcamRef}
            isInterviewing={true}
            onUpdate={(stats) => setFaceStats(stats)}
          />

          {/* Mic status */}
          <div style={{
            padding: '12px 16px', borderRadius: '10px', textAlign: 'center',
            background: isListening ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${isListening ? '#fca5a5' : '#e2e8f0'}`
          }}>
            {isListening ? (
              <p style={{ margin: 0, color: '#dc2626', fontWeight: '600', fontSize: '13px' }}>
                ● Recording... speak your answer
              </p>
            ) : (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                Mic is off
              </p>
            )}
          </div>

          {/* Transcript */}
          {(answer || transcript) && (
            <div style={{
              padding: '14px 16px', background: '#f8fafc',
              borderRadius: '10px', border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                YOUR ANSWER
              </p>
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                {answer}
                <span style={{ color: '#94a3b8' }}>{transcript}</span>
                {isListening && <span style={{ color: '#185FA5', marginLeft: '4px' }}>●</span>}
              </p>
            </div>
          )}

        </div>
        {/* ← LEFT div closes here */}

        {/* RIGHT — Question + Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Question card */}
          <div style={{
            background: '#fff', borderRadius: '12px',
            padding: '20px', border: '1px solid #e2e8f0', flex: 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Question {currentQ + 1}
              </span>
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: '500',
                background: { technical: '#dbeafe', behavioral: '#ede9fe', project: '#dcfce7' }[questions[currentQ].type] || '#f1f5f9',
                color: { technical: '#1d4ed8', behavioral: '#6d28d9', project: '#15803d' }[questions[currentQ].type] || '#475569'
              }}>
                {questions[currentQ].type}
              </span>
            </div>
            <p style={{ fontSize: '16px', color: '#1e293b', lineHeight: '1.7', fontWeight: '500', margin: 0 }}>
              {questions[currentQ].question}
            </p>

            {/* Hear question button */}
            <button
              onClick={() => speakQuestion(questions[currentQ].question)}
              disabled={isSpeaking}
              style={{
                width: '100%', marginTop: '16px',
                background: isSpeaking ? '#fbbf24' : '#E6F1FB',
                color: isSpeaking ? '#fff' : '#185FA5',
                border: '1px solid #B5D4F4',
                padding: '10px', borderRadius: '8px',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer'
              }}
            >
              {isSpeaking ? '🔊 AI is speaking...' : '🔊 Hear Question'}
            </button>
          </div>

          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={false}
            style={{
              padding: '14px', borderRadius: '10px', border: 'none',
              cursor: 'pointer',
              background: isListening ? '#dc2626' : '#16a34a',
              color: '#fff', fontWeight: '600', fontSize: '15px'
            }}
          >
            {isListening ? '⏹ Stop Recording' : '🎤 Start Recording Answer'}
          </button>

          {/* Submit button */}
          <button
            onClick={() => {
              console.log('Answer at submit:', answer);
              console.log('Answer length:', answer.length);
              submitAnswer();
            }}
            disabled={loading || !answer.trim()}
            style={{
              padding: '14px', borderRadius: '10px', border: 'none',
              cursor: loading || !answer.trim() ? 'not-allowed' : 'pointer',
              background: loading || !answer.trim() ? '#cbd5e1' : '#185FA5',
              color: '#fff', fontWeight: '600', fontSize: '15px'
            }}
          >
            {loading ? '⏳ Evaluating answer...' : currentQ + 1 === questions.length ? '✅ Finish Interview' : '➡️ Submit & Next Question'}
          </button>

          {/* Tips */}
          <div style={{
            padding: '14px 16px', background: '#fffbeb',
            borderRadius: '10px', border: '1px solid #fcd34d'
          }}>
            <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
              💡 <strong>Tips:</strong> Speak clearly, maintain eye contact with camera, avoid filler words like "uh" and "umm"
            </p>
          </div>

        </div>
        {/* ← RIGHT div closes here */}

      </div>
      {/* ← Main grid closes here */}

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

    const totalFillers = fillerStats.reduce((sum, f) => sum + f.totalFillers, 0);
    const allFillers = {};
    fillerStats.forEach(f => {
      Object.entries(f.found || {}).forEach(([word, count]) => {
        allFillers[word] = (allFillers[word] || 0) + count;
      });
    });

    return (
      <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>

        <style>{`
    .metric-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #e2e8f0;
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: default;
    }
    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(24,95,165,0.12);
      border-color: #185FA5;
      background: #fff;
    }
    .q-result-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 10px;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: default;
    }
    .q-result-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(24,95,165,0.12);
      border-color: #185FA5;
      background: #fff;
    }
  `}</style>

        {/* Navbar */}
        <nav style={{
          background: '#185FA5', padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>InterviewIQ</span>
          <span style={{ background: '#B5D4F4', color: '#0C447C', fontSize: '11px', padding: '4px 12px', borderRadius: '999px', fontWeight: '500' }}>
            AI Powered
          </span>
        </nav>

        {/* Hero - Overall Score */}
        <div style={{
          background: '#E6F1FB', padding: '32px',
          borderBottom: '1px solid #B5D4F4', textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#042C53', marginBottom: '6px' }}>
            Interview Complete!
          </h2>
          <p style={{ fontSize: '14px', color: '#185FA5' }}>Here is your complete performance report</p>
          <div style={{
            fontSize: '56px', fontWeight: '700', margin: '12px 0 4px',
            color: avgScore >= 7 ? '#16a34a' : avgScore >= 5 ? '#185FA5' : '#dc2626'
          }}>
            {avgScore}/10
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Overall Score</div>
          <div style={{
            display: 'inline-block', marginTop: '8px',
            background: avgScore >= 7 ? '#dcfce7' : avgScore >= 5 ? '#dbeafe' : '#fee2e2',
            color: avgScore >= 7 ? '#15803d' : avgScore >= 5 ? '#1d4ed8' : '#dc2626',
            fontSize: '13px', padding: '6px 20px', borderRadius: '999px', fontWeight: '500'
          }}>
            {avgScore >= 7 ? '🌟 Excellent Performance!' : avgScore >= 5 ? '👍 Good Performance!' : '💪 Keep Practicing!'}
          </div>
        </div>

        {/* Metrics */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px', padding: '24px 32px', background: '#fff',
          maxWidth: '900px', margin: '0 auto'
        }}>
          {[
            { icon: '👁️', val: `${faceStats.eyeContact}%`, label: 'Eye Contact', color: faceStats.eyeContact >= 70 ? '#16a34a' : faceStats.eyeContact >= 50 ? '#d97706' : '#dc2626' },
            { icon: '🧍', val: `${faceStats.posture}%`, label: 'Posture', color: faceStats.posture >= 70 ? '#16a34a' : faceStats.posture >= 50 ? '#d97706' : '#dc2626' },
            { icon: '🗣️', val: totalFillers, label: 'Filler Words', color: totalFillers <= 5 ? '#16a34a' : totalFillers <= 15 ? '#d97706' : '#dc2626' },
          ].map((m, i) => (
            <div key={i} className="metric-card">
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{m.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: m.color, marginBottom: '2px' }}>{m.val}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Filler words */}
        {totalFillers > 0 && (
          <div style={{ padding: '0 32px 20px', background: '#fff', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{
              background: '#fffbeb', borderRadius: '10px',
              padding: '16px', border: '1px solid #fcd34d'
            }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '10px' }}>
                Filler Words Detected
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {Object.entries(allFillers).map(([word, count]) => (
                  <span key={word} style={{
                    background: '#fef3c7', color: '#92400e',
                    fontSize: '12px', padding: '4px 12px', borderRadius: '999px'
                  }}>
                    "{word}" x{count}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#78350f', margin: 0 }}>
                💡 Tip: Take a short pause instead of using filler words. It sounds more confident and professional.
              </p>
            </div>
          </div>
        )}

        {/* Question breakdown */}
        <div style={{ padding: '0 32px 24px', background: '#fff', maxWidth: '900px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#042C53', marginBottom: '12px' }}>
            Question by Question Breakdown
          </h3>
          {evaluations.map((e, i) => (
            <div key={i} className="q-result-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b', flex: 1, marginRight: '12px' }}>
                  Q{i + 1}. {e.question}
                </strong>
                <span style={{
                  fontSize: '16px', fontWeight: '700', flexShrink: 0,
                  color: e.evaluation.score >= 7 ? '#16a34a' : e.evaluation.score >= 5 ? '#d97706' : '#dc2626'
                }}>
                  {e.evaluation.score}/10
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginBottom: '6px' }}>
                "{e.answer}"
              </p>
              <p style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>💬 {e.evaluation.feedback}</p>
              <p style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>✅ {e.evaluation.strengths}</p>
              <p style={{ fontSize: '12px', color: '#d97706', margin: 0 }}>💡 {e.evaluation.improve}</p>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px', padding: '0 32px 32px',
          background: '#fff', maxWidth: '900px', margin: '0 auto'
        }}>
          <button onClick={() => setStep('resume-suggestions')} style={{
            background: '#16a34a', color: '#fff', border: 'none',
            padding: '12px', borderRadius: '8px',
            fontSize: '13px', fontWeight: '500', cursor: 'pointer'
          }}>
            📄 Improve Resume
          </button>
          <button onClick={() => setStep('session-report')} style={{
            background: '#185FA5', color: '#fff', border: 'none',
            padding: '12px', borderRadius: '8px',
            fontSize: '13px', fontWeight: '500', cursor: 'pointer'
          }}>
            📊 Download Report
          </button>
          <button onClick={() => {
            setStep('upload'); setQuestions([]); setEvaluations([]);
            setCurrentQ(0); setAnswer(''); setTranscript('');
            setFillerStats([]); setFaceStats({ eyeContact: 100, posture: 100 });
          }} style={{
            background: '#1e293b', color: '#fff', border: 'none',
            padding: '12px', borderRadius: '8px',
            fontSize: '13px', fontWeight: '500', cursor: 'pointer'
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