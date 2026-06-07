import React, { useState } from 'react';
import { Copy, Check, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function Summary({ summary = [], rawText = '' }) {
  const [copied, setCopied] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const handleCopy = () => {
    const textToCopy = summary.map((pt, idx) => `${idx + 1}. ${pt}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="summary-layout">
      {/* Header with Copy Action */}
      <div className="summary-header">
        <h3 style={{ fontSize: '1.4rem' }}>Key Takeaways</h3>
        <button 
          className={`text-btn ${copied ? 'primary-action-btn' : ''}`}
          onClick={handleCopy}
          aria-label="Copy summary to clipboard"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
      </div>

      {/* Bullet Points List */}
      <ul className="summary-list">
        {summary.map((point, idx) => (
          <li 
            key={idx} 
            className="summary-item"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <div className="summary-index">{idx + 1}</div>
            <div className="summary-content">{point}</div>
          </li>
        ))}
      </ul>

      {/* Collapsible Raw Transcribed Text Section */}
      {rawText && (
        <div className="notes-raw-section">
          <button 
            className="text-btn" 
            onClick={() => setShowRawText(!showRawText)}
            style={{ width: '100%', justifyContent: 'space-between', padding: '1rem 1.5rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>View Extracted OCR Text</span>
            </div>
            {showRawText ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showRawText && (
            <div style={{ marginTop: '1rem' }}>
              <h4 className="notes-raw-title">Transcribed Handwriting</h4>
              <pre className="notes-raw-content">{rawText}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
