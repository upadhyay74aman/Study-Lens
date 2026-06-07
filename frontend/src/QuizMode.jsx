import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';

export default function QuizMode({ questions = [] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  if (!questions || questions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>No quiz questions generated.</div>;
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;

  const handleOptionSelect = (optionIdx) => {
    if (isSubmitted) return; // Prevent changing answer
    setSelectedOptionIdx(optionIdx);
  };

  const handleSubmit = () => {
    if (selectedOptionIdx === null || isSubmitted) return;
    
    setIsSubmitted(true);
    if (selectedOptionIdx === currentQuestion.correct_answer_index) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptionIdx(null);
      setIsSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOptionIdx(null);
    setIsSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  // Score styling content
  const getScoreFeedback = () => {
    const percentage = (score / totalQuestions) * 100;
    if (percentage === 100) {
      return {
        emoji: '🥳',
        title: 'Perfect Score!',
        comment: 'Absolutely amazing! You have completely mastered the material in these notes.',
      };
    } else if (percentage >= 80) {
      return {
        emoji: '😎',
        title: 'Great Job!',
        comment: 'Fantastic work! You have a really solid grasp of the concepts here.',
      };
    } else if (percentage >= 60) {
      return {
        emoji: '👍',
        title: 'Good Effort!',
        comment: 'Well done! A little more review of the flashcards and you will hit 100%.',
      };
    } else if (percentage >= 40) {
      return {
        emoji: '📚',
        title: 'Keep Practicing',
        comment: 'You are getting there! Review the summary points and try the quiz again.',
      };
    } else {
      return {
        emoji: '🧠',
        title: 'Need More Study',
        comment: 'Don\'t worry! Go back to the flashcards, look at the mind map, and try again.',
      };
    }
  };

  if (quizFinished) {
    const feedback = getScoreFeedback();
    return (
      <div className="quiz-layout">
        <div className="score-card">
          <div className="score-emoji">{feedback.emoji}</div>
          <h2 className="score-title">{feedback.title}</h2>
          <div className="score-value">{score} / {totalQuestions}</div>
          <p className="score-comment">{feedback.comment}</p>
          <button 
            className="text-btn primary-action-btn" 
            onClick={handleRestart}
            style={{ marginTop: '1.5rem', padding: '0.85rem 2rem' }}
          >
            <RotateCcw size={18} />
            Try Quiz Again
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = ((currentIdx) / totalQuestions) * 100;

  return (
    <div className="quiz-layout">
      {/* Quiz Progress Header */}
      <div className="quiz-header">
        <span className="quiz-question-number">
          Question {currentIdx + 1} of {totalQuestions}
        </span>
        <span className="quiz-score-tracker">
          Score: {score}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Question and Options Card */}
      <div className="quiz-question-card">
        <h3 className="quiz-question-text">{currentQuestion.question}</h3>
        
        <div className="quiz-options-list">
          {currentQuestion.options.map((option, idx) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            const isSelected = selectedOptionIdx === idx;
            const isCorrectAnswer = idx === currentQuestion.correct_answer_index;
            
            let optionClass = '';
            if (isSubmitted) {
              optionClass = 'disabled ';
              if (isCorrectAnswer) {
                optionClass += 'correct';
              } else if (isSelected) {
                optionClass += 'incorrect';
              }
            } else if (isSelected) {
              optionClass = 'correct'; // Use primary highlights for selected state before submit
            }

            return (
              <button
                key={idx}
                className={`quiz-option-item ${optionClass}`}
                onClick={() => handleOptionSelect(idx)}
                disabled={isSubmitted}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="option-badge">{letter}</span>
                  <span>{option}</span>
                </div>

                {isSubmitted && isCorrectAnswer && (
                  <span className="quiz-feedback" style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={18} />
                  </span>
                )}
                {isSubmitted && isSelected && !isCorrectAnswer && (
                  <span className="quiz-feedback" style={{ color: 'var(--danger)' }}>
                    <XCircle size={18} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / Submission control */}
      <div className="quiz-footer">
        {!isSubmitted ? (
          <button
            className="text-btn primary-action-btn"
            disabled={selectedOptionIdx === null}
            onClick={handleSubmit}
            style={{ padding: '0.85rem 2rem' }}
          >
            Check Answer
          </button>
        ) : (
          <button
            className="text-btn primary-action-btn"
            onClick={handleNext}
            style={{ padding: '0.85rem 2rem' }}
          >
            {currentIdx + 1 === totalQuestions ? 'Finish Quiz' : 'Next Question'}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
