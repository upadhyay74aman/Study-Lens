import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Award, FileText, UploadCloud, RefreshCw, Clock, X } from 'lucide-react';
import UploadZone from './UploadZone';
import FlashcardDeck from './FlashcardDeck';
import QuizMode from './QuizMode';
import MindMap from './MindMap';
import Summary from './Summary';

const LOADING_MESSAGES = [
  "Reading your handwriting...",
  "Extracting text with Gemini Vision...",
  "Generating flashcards...",
  "Writing quiz questions...",
  "Building mind map...",
  "Summarizing key points...",
  "Almost done..."
];

const HISTORY_KEY = 'study_app_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [studyData, setStudyData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('flashcards');
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => {
    let msgInterval, progressInterval;
    if (loading) {
      setLoadingProgress(5);
      setLoadingMsgIdx(0);
      msgInterval = setInterval(() => setLoadingMsgIdx((p) => (p + 1) % LOADING_MESSAGES.length), 2200);
      progressInterval = setInterval(() => {
        setLoadingProgress((p) => p >= 95 ? p : Math.min(95, p + (p < 50 ? Math.random() * 8 + 2 : Math.random() * 2 + 0.5)));
      }, 400);
    }
    return () => { clearInterval(msgInterval); clearInterval(progressInterval); };
  }, [loading]);

  const handleUploadNotes = async (file) => {
    setLoading(true);
    setError(null);
    setStudyData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/process-notes`, { method: 'POST', body: formData });
      if (!response.ok) {
        let errMsg = 'Failed to process notes.';
        try { const errData = await response.json(); errMsg = errData.detail || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success) {
        const id = generateId();
        setStudyData(data);
        setSessionId(id);
        setLoadingProgress(100);

        // Save to history
        const title = data.extracted_text.substring(0, 60).replace(/\n/g, ' ').trim() || 'Untitled notes';
        const entry = { id, title, date: new Date().toISOString(), data };
        const updated = [entry, ...history].slice(0, 10); // Keep last 10
        setHistory(updated);
        saveHistory(updated);

        setTimeout(() => { setLoading(false); setActiveTab('flashcards'); }, 400);
      } else {
        throw new Error("Processing failed");
      }
    } catch (err) {
      setError(err.message || 'Cannot reach backend. Ensure the server is running on port 8000.');
      setLoading(false);
    }
  };

  const loadSession = (entry) => {
    setStudyData(entry.data);
    setSessionId(entry.id);
    setActiveTab('flashcards');
    setError(null);
  };

  const deleteSession = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
    localStorage.removeItem(`sr_${id}`);
    if (sessionId === id) { setStudyData(null); setSessionId(null); }
  };

  const handleReset = () => { setStudyData(null); setError(null); setLoading(false); setSessionId(null); };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">Study<span>Lens</span></h1>
        <p className="header-subtitle">Transform handwritten notes into interactive study materials</p>
      </header>

      <main className="dashboard-card">
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', textAlign: 'center' }}>
            <div className="error-banner" style={{ maxWidth: '420px' }}>
              <span className="error-title">Processing Error</span>
              <p style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>{error}</p>
            </div>
            <button className="text-btn primary-action-btn" onClick={handleReset} style={{ padding: '0.6rem 1.5rem' }}>
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        )}

        {!loading && !error && !studyData && (
          <>
            <UploadZone onUpload={handleUploadNotes} />
            {history.length > 0 && (
              <div className="history-section">
                <div className="history-title">
                  <Clock size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  Recent Sessions
                </div>
                <div className="history-list">
                  {history.map((entry) => (
                    <button key={entry.id} className="history-item" onClick={() => loadSession(entry)}>
                      <span className="history-item-text">{entry.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="history-item-date">{new Date(entry.date).toLocaleDateString()}</span>
                        <button className="history-item-delete" onClick={(e) => { e.stopPropagation(); deleteSession(entry.id); }}>
                          <X size={14} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="loading-wrapper">
            <div className="loader-animation"></div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }}></div>
            </div>
            <h2 className="loading-text">{LOADING_MESSAGES[loadingMsgIdx]}</h2>
            <p className="loading-subtext">This usually takes 15-30 seconds</p>
          </div>
        )}

        {!loading && !error && studyData && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="tabs-container">
              {[
                { key: 'flashcards', icon: Sparkles, label: 'Flashcards' },
                { key: 'quiz', icon: Award, label: 'Quiz' },
                { key: 'mindmap', icon: Brain, label: 'Mind Map' },
                { key: 'summary', icon: FileText, label: 'Summary' },
              ].map(({ key, icon: Icon, label }) => (
                <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                  <Icon size={14} /> {label}
                </button>
              ))}
              <button className="tab-btn" onClick={handleReset} style={{ marginLeft: '0.5rem' }}>
                <UploadCloud size={14} /> New
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'flashcards' && <FlashcardDeck cards={studyData.flashcards} sessionId={sessionId} />}
              {activeTab === 'quiz' && <QuizMode questions={studyData.quiz} />}
              {activeTab === 'mindmap' && <MindMap data={studyData.mindmap} />}
              {activeTab === 'summary' && <Summary summary={studyData.summary} rawText={studyData.extracted_text} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
