import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Shuffle, Printer, RotateCcw } from 'lucide-react';

/**
 * SM-2 Spaced Repetition Algorithm
 * quality: 0-5 rating (we use 0=Again, 3=Hard, 4=Good, 5=Easy)
 */
function sm2(card, quality) {
  let { easeFactor = 2.5, interval = 0, repetitions = 0 } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { ...card, easeFactor, interval, repetitions, nextReview: nextReview.toISOString(), lastQuality: quality };
}

export default function FlashcardDeck({ cards = [], sessionId = null }) {
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  // Load SR data from localStorage or init fresh
  useEffect(() => {
    if (!cards || cards.length === 0) return;

    const storageKey = sessionId ? `sr_${sessionId}` : null;
    let srData = {};
    if (storageKey) {
      try { srData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { srData = {}; }
    }

    const initialized = cards.map((card, idx) => ({
      ...card,
      originalIndex: idx,
      easeFactor: srData[idx]?.easeFactor ?? 2.5,
      interval: srData[idx]?.interval ?? 0,
      repetitions: srData[idx]?.repetitions ?? 0,
      nextReview: srData[idx]?.nextReview ?? null,
      lastQuality: srData[idx]?.lastQuality ?? null,
    }));
    setDeck(initialized);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
  }, [cards, sessionId]);

  // Save SR data to localStorage
  const saveSR = useCallback((updatedDeck) => {
    if (!sessionId) return;
    const srData = {};
    updatedDeck.forEach((c) => {
      srData[c.originalIndex] = {
        easeFactor: c.easeFactor,
        interval: c.interval,
        repetitions: c.repetitions,
        nextReview: c.nextReview,
        lastQuality: c.lastQuality,
      };
    });
    localStorage.setItem(`sr_${sessionId}`, JSON.stringify(srData));
  }, [sessionId]);

  const handleSR = (quality) => {
    const updated = [...deck];
    updated[currentIndex] = sm2(updated[currentIndex], quality);
    setDeck(updated);
    saveSR(updated);
    // Auto advance after rating
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % updated.length), 200);
  };

  const handleNext = useCallback(() => {
    if (deck.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % deck.length), 150);
  }, [deck.length]);

  const handlePrev = useCallback(() => {
    if (deck.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length), 150);
  }, [deck.length]);

  const handleShuffle = useCallback(() => {
    if (deck.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setDeck((prev) => {
        if (isShuffled) return [...prev].sort((a, b) => a.originalIndex - b.originalIndex);
        const s = [...prev];
        for (let i = s.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [s[i], s[j]] = [s[j], s[i]];
        }
        return s;
      });
      setIsShuffled((p) => !p);
      setCurrentIndex(0);
    }, 150);
  }, [deck.length, isShuffled]);

  useEffect(() => {
    if (deck.length === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped((p) => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck.length, handleNext, handlePrev]);

  if (!deck || deck.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No flashcards generated.</div>;
  }

  const currentCard = deck[currentIndex];
  const dueCount = deck.filter(c => {
    if (!c.nextReview) return true;
    return new Date(c.nextReview) <= new Date();
  }).length;

  return (
    <div className="flashcards-layout">
      <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <span className="card-label">Question</span>
            <div className="card-text">{currentCard?.question}</div>
            <span className="card-hint">Click to reveal answer</span>
          </div>
          <div className="flashcard-back">
            <span className="card-label">Answer</span>
            <div className="card-text">{currentCard?.answer}</div>
            <span className="card-hint">Rate your recall below</span>
          </div>
        </div>
      </div>

      {/* SR Rating Buttons - only show when flipped */}
      {isFlipped && (
        <div className="sr-buttons">
          <button className="sr-btn sr-again" onClick={(e) => { e.stopPropagation(); handleSR(0); }}>Again</button>
          <button className="sr-btn" onClick={(e) => { e.stopPropagation(); handleSR(3); }}>Hard</button>
          <button className="sr-btn" onClick={(e) => { e.stopPropagation(); handleSR(4); }}>Good</button>
          <button className="sr-btn sr-easy" onClick={(e) => { e.stopPropagation(); handleSR(5); }}>Easy</button>
        </div>
      )}

      {dueCount > 0 && (
        <p className="sr-info">{dueCount} card{dueCount !== 1 ? 's' : ''} due for review</p>
      )}

      <div className="controls-container">
        <div className="action-bar">
          <button className={`text-btn ${isShuffled ? 'primary-action-btn' : ''}`} onClick={handleShuffle}>
            {isShuffled ? <RotateCcw size={16} /> : <Shuffle size={16} />}
            {isShuffled ? 'Reset' : 'Shuffle'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="control-btn" onClick={handlePrev}><ChevronLeft size={20} /></button>
          <span className="card-counter">{currentIndex + 1} / {deck.length}</span>
          <button className="control-btn" onClick={handleNext}><ChevronRight size={20} /></button>
        </div>

        <div className="action-bar">
          <button className="text-btn" onClick={() => window.print()}>
            <Printer size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="printable-flashcards-grid">
        {deck.map((card, idx) => (
          <div key={idx} className="print-card-item">
            <div className="print-card-q">Q: {card.question}</div>
            <div className="print-card-a">A: {card.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
