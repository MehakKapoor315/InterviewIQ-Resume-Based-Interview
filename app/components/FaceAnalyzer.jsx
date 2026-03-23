'use client';
import { useEffect, useRef, useState } from 'react';

export default function FaceAnalyzer({ webcamRef, isInterviewing, onUpdate }) {
  const [eyeContact, setEyeContact] = useState(null);
  const [posture, setPosture] = useState(null);
  const [status, setStatus] = useState('Loading...');
  const intervalRef = useRef(null);
  const statsRef = useRef({
    lookingCount: 0,
    totalCount: 0,
    goodPostureCount: 0,
    faceDetectedCount: 0,
  });

  useEffect(() => {
    if (!isInterviewing) return;

    const loadAndAnalyze = async () => {
      try {
        const faceapi = await import('face-api.js');
        setStatus('Loading models...');

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);

        setStatus('Analyzing...');

        intervalRef.current = setInterval(async () => {
          if (!webcamRef.current?.video) return;
          const video = webcamRef.current.video;
          if (video.readyState !== 4) return;

          try {
            const options = new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.4,
            });

            const detection = await faceapi
              .detectSingleFace(video, options)
              .withFaceLandmarks();

            statsRef.current.totalCount++;

            if (detection) {
              statsRef.current.faceDetectedCount++;
              const box = detection.detection.box;
              const landmarks = detection.landmarks;
              const videoWidth = video.videoWidth;
              const videoHeight = video.videoHeight;

              // ── Eye Contact Detection ──
              const leftEye = landmarks.getLeftEye();
              const rightEye = landmarks.getRightEye();
              const nose = landmarks.getNose();

              const leftEyeCenter = {
                x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
                y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length,
              };
              const rightEyeCenter = {
                x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
                y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length,
              };

              const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
              const eyeMidY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
              const noseTip = nose[6];

              // Strict eye contact — nose must be close to eye midpoint
              const horizontalDeviation = Math.abs(noseTip.x - eyeMidX) / box.width;
              const verticalDeviation = (noseTip.y - eyeMidY) / box.height;

              // Stricter thresholds for eye contact
              const isLooking = horizontalDeviation < 0.20 && verticalDeviation < 0.55;
              if (isLooking) statsRef.current.lookingCount++;

              // ── Posture Detection ──
              const faceSizeRatio = box.height / videoHeight;
              const faceTopRatio = (box.y + box.height / 2) / videoHeight;
              const faceCenterX = (box.x + box.width / 2) / videoWidth;
              const horizontalCenter = Math.abs(faceCenterX - 0.5);

              // More lenient posture check
              const isGoodPosture =
                faceSizeRatio > 0.10 &&       // very lenient face size
                faceTopRatio < 0.70 &&         // face can be lower
                horizontalCenter < 0.45;       // face can be more to sides

              if (isGoodPosture) statsRef.current.goodPostureCount++;

              // Calculate scores
              const eyeScore = Math.round(
                (statsRef.current.lookingCount / statsRef.current.totalCount) * 100
              );
              const postureScore = Math.round(
                (statsRef.current.goodPostureCount / statsRef.current.totalCount) * 100
              );

              setEyeContact(eyeScore);
              setPosture(postureScore);
              setStatus('Face detected');

              if (onUpdate) onUpdate({ eyeContact: eyeScore, posture: postureScore });

            } else {
              setStatus('Face not detected');
              const eyeScore = Math.round(
                (statsRef.current.lookingCount / statsRef.current.totalCount) * 100
              );
              const postureScore = Math.round(
                (statsRef.current.goodPostureCount / statsRef.current.totalCount) * 100
              );
              if (onUpdate) onUpdate({ eyeContact: eyeScore, posture: postureScore });
            }

          } catch (err) {
            // silent fail
          }
        }, 800);

      } catch (err) {
        console.log('Face API error:', err);
        setStatus('Face detection unavailable');
      }
    };

    loadAndAnalyze();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isInterviewing]);

  const getColor = (score) => {
    if (score === null) return '#9ca3af';
    return score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  };

  const getLabel = (score) => {
    if (score === null) return '...';
    return score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
  };

  if (!isInterviewing) return null;

  return (
    <div style={{
      marginTop: '0.75rem', padding: '0.75rem',
      background: '#f9fafb', borderRadius: '10px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>
          Live Analysis
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
          {status}
        </p>
      </div>

      {/* Eye contact bar */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
          <span>👁️ Eye Contact</span>
          <span style={{ color: getColor(eyeContact) }}>
            {eyeContact !== null ? `${eyeContact}%` : '...'} {getLabel(eyeContact)}
          </span>
        </div>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px' }}>
          <div style={{
            height: '100%',
            width: `${eyeContact !== null ? eyeContact : 0}%`,
            background: getColor(eyeContact),
            borderRadius: '3px',
            transition: 'width 0.5s'
          }} />
        </div>
      </div>

      {/* Posture bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
          <span>🧍 Posture</span>
          <span style={{ color: getColor(posture) }}>
            {posture !== null ? `${posture}%` : '...'} {getLabel(posture)}
          </span>
        </div>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px' }}>
          <div style={{
            height: '100%',
            width: `${posture !== null ? posture : 0}%`,
            background: getColor(posture),
            borderRadius: '3px',
            transition: 'width 0.5s'
          }} />
        </div>
      </div>

      {status === 'Face not detected' && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '11px', color: '#ef4444' }}>
          Keep your face visible and centered in camera
        </p>
      )}
    </div>
  );
}