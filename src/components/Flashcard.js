import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useSettings } from '../SettingsContext';
import '../styles/Flashcard.css';

const Flashcard = () => {
  const { isGreekToRussian } = useSettings();
  const [currentCard, setCurrentCard] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Smart card selection algorithm
  const getNextCard = async () => {
    try {
      setLoading(true);

      // Get all cards with their statistics
      const { data, error } = await supabase
        .from('Greek')
        .select('*')
        .order('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        setCurrentCard(null);
        setLoading(false);
        return;
      }

      // Calculate priority scores for each card
      const now = new Date();
      const cardsWithScores = data.map(card => {
        let score = 100; // Base score

        // Recently added cards get higher priority
        const daysSinceLastShown = card.LastShown
          ? (now - new Date(card.LastShown)) / (1000 * 60 * 60 * 24)
          : 999;

        // Cards never shown get highest priority
        if (!card.LastShown) {
          score += 500;
        } else if (daysSinceLastShown > 7) {
          score += 200;
        } else if (daysSinceLastShown > 3) {
          score += 100;
        } else if (daysSinceLastShown < 0.1) {
          // Shown very recently, reduce priority
          score -= 50;
        }

        // Wrong answers increase priority
        const wrongCount = card.NumberOfWrong || 0;
        const correctCount = card.NumberOfCorrect || 0;
        const totalAttempts = wrongCount + correctCount;

        if (totalAttempts > 0) {
          const errorRate = wrongCount / totalAttempts;
          score += errorRate * 300; // High error rate = high priority
        }

        // Cards that were never correct get extra priority
        if (correctCount === 0 && totalAttempts > 0) {
          score += 150;
        }

        // Cards marked as not remembered get priority
        if (card.Remembered === false) {
          score += 100;
        }

        // Add some randomness to avoid predictability
        score += Math.random() * 50;

        return { ...card, score };
      });

      // Sort by score (highest first) and pick the top card
      cardsWithScores.sort((a, b) => b.score - a.score);
      const selectedCard = cardsWithScores[0];

      setCurrentCard(selectedCard);
      setShowTranslation(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching card:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    getNextCard();
  }, []);

  const handleCheck = () => {
    setShowTranslation(true);
  };

  const handleSwipe = async (remembered) => {
    if (!currentCard || !showTranslation) return;

    try {
      const now = new Date().toISOString().split('T')[0];
      const updates = {
        LastShown: now,
        Remembered: remembered,
        NumberOfWrong: remembered
          ? currentCard.NumberOfWrong || 0
          : (currentCard.NumberOfWrong || 0) + 1,
        NumberOfCorrect: remembered
          ? (currentCard.NumberOfCorrect || 0) + 1
          : currentCard.NumberOfCorrect || 0,
      };

      if (remembered) {
        updates.LastCorrect = now;
      }

      await supabase
        .from('Greek')
        .update(updates)
        .eq('id', currentCard.id);

      setStats(prev => ({
        correct: remembered ? prev.correct + 1 : prev.correct,
        wrong: remembered ? prev.wrong : prev.wrong + 1,
      }));

      // Reset position and get next card
      x.set(0);
      setTimeout(() => {
        getNextCard();
      }, 300);
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const handleDragEnd = (event, info) => {
    if (!showTranslation) {
      x.set(0);
      return;
    }

    const swipeThreshold = 100;
    if (Math.abs(info.offset.x) > swipeThreshold) {
      const remembered = info.offset.x > 0;
      handleSwipe(remembered);
    } else {
      x.set(0);
    }
  };

  if (loading) {
    return (
      <div className="flashcard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flashcard-container">
        <div className="no-cards">
          <h2>No cards available</h2>
          <p>Add some phrases in the Admin section to get started!</p>
        </div>
      </div>
    );
  }

  const displayText = isGreekToRussian ? currentCard.Greek : currentCard.Russian;
  const translationText = isGreekToRussian ? currentCard.Russian : currentCard.Greek;

  return (
    <div className="flashcard-container">
      <div className="stats">
        <span className="stat-correct">✓ {stats.correct}</span>
        <span className="stat-wrong">✗ {stats.wrong}</span>
      </div>

      <motion.div
        className="card"
        style={{ x, rotate, opacity }}
        drag={showTranslation ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        dragElastic={0.7}
      >
        <div className="card-content">
          <div className="card-text main-text">
            {displayText}
          </div>

          {showTranslation && (
            <div className="card-text translation-text">
              {translationText}
            </div>
          )}
        </div>
      </motion.div>

      {showTranslation && (
        <div className="swipe-hints">
          <div className="hint hint-left">
            <span className="hint-icon">✗</span>
            <span className="hint-text">Didn't remember</span>
          </div>
          <div className="hint hint-right">
            <span className="hint-icon">✓</span>
            <span className="hint-text">Remembered!</span>
          </div>
        </div>
      )}

      {!showTranslation ? (
        <button className="check-button" onClick={handleCheck}>
          Check Translation
        </button>
      ) : (
        <div className="manual-buttons">
          <button
            className="manual-button wrong-button"
            onClick={() => handleSwipe(false)}
          >
            ✗ Didn't Remember
          </button>
          <button
            className="manual-button correct-button"
            onClick={() => handleSwipe(true)}
          >
            ✓ Remembered
          </button>
        </div>
      )}

      <div className="card-stats">
        <small>
          Correct: {currentCard.NumberOfCorrect || 0} |
          Wrong: {currentCard.NumberOfWrong || 0}
        </small>
      </div>
    </div>
  );
};

export default Flashcard;
