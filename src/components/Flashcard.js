import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useSettings } from '../SettingsContext';
import '../styles/Flashcard.css';

const SWIPE_THRESHOLD = 120;
const FLY_AWAY_DISTANCE = 1500;

const Flashcard = () => {
  const { isGreekToRussian } = useSettings();
  const [currentCard, setCurrentCard] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [swiping, setSwiping] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const stampLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40, 0], [1, 0, 0]);
  const stampRightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD], [0, 0, 1]);
  const dropZoneLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1, 0.1, 0]);
  const dropZoneRightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0, 0.1, 1]);
  const dropZoneLeftScale = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1.05, 0.95, 0.9]);
  const dropZoneRightScale = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0.9, 0.95, 1.05]);

  const getNextCard = useCallback(async (excludeId) => {
    try {
      setLoading(true);
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

      const now = new Date();
      const cardsWithWeights = data.map(card => {
        if (excludeId && card.id === excludeId) {
          return { ...card, weight: 0.001 };
        }

        const isNew = !card.LastShown;
        const daysSinceLastShown = isNew
          ? 30
          : Math.max(0, (now - new Date(card.LastShown)) / (1000 * 60 * 60 * 24));

        // Time is the dominant factor — ensures full deck rotation
        let weight = Math.pow(daysSinceLastShown + 0.5, 2);

        // Never-shown cards: moderate boost (not overwhelming)
        if (isNew) {
          weight *= 3;
        }

        // Last answer was wrong: boost
        if (card.Remembered === false) {
          weight *= 2.5;
        }

        // Accuracy-based adjustment
        const wrongCount = card.NumberOfWrong || 0;
        const correctCount = card.NumberOfCorrect || 0;
        const totalAttempts = wrongCount + correctCount;
        if (totalAttempts >= 2) {
          const accuracy = correctCount / totalAttempts;
          if (accuracy >= 0.8) {
            weight *= 0.25; // Well-known cards: much less likely but still possible
          } else if (accuracy >= 0.6) {
            weight *= 0.5;
          } else {
            weight *= 1.5; // Struggling cards: mild boost
          }
        }

        // Very recently shown (< 5 min): heavy penalty to avoid repeats
        if (!isNew && daysSinceLastShown < 0.004) {
          weight *= 0.01;
        }

        // Random jitter for variety
        weight *= 0.8 + Math.random() * 0.4;

        return { ...card, weight: Math.max(weight, 0.001) };
      });

      const totalWeight = cardsWithWeights.reduce((sum, c) => sum + c.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedCard = cardsWithWeights[0];
      for (const card of cardsWithWeights) {
        random -= card.weight;
        if (random <= 0) {
          selectedCard = card;
          break;
        }
      }

      setCurrentCard(selectedCard);
      setShowTranslation(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching card:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getNextCard(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheck = () => {
    setShowTranslation(true);
  };

  const commitSwipe = useCallback(async (remembered) => {
    if (!currentCard || swiping) return;
    setSwiping(true);

    const direction = remembered ? 1 : -1;
    await animate(x, direction * FLY_AWAY_DISTANCE, {
      type: 'tween',
      duration: 0.4,
      ease: [0.32, 0, 0.67, 0],
    });

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
    if (remembered) updates.LastCorrect = now;

    const cardId = currentCard.id;
    supabase.from('Greek').update(updates).eq('id', cardId).then();

    setStats(prev => ({
      correct: remembered ? prev.correct + 1 : prev.correct,
      wrong: remembered ? prev.wrong : prev.wrong + 1,
    }));

    x.jump(0);
    setSwiping(false);
    getNextCard(cardId);
  }, [currentCard, swiping, x, getNextCard]);

  const handleDragEnd = useCallback((event, info) => {
    if (!showTranslation) {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
      return;
    }

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Accept swipe if dragged far enough OR if velocity is high enough
    if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
      const remembered = offset > 0 || velocity > 500;
      commitSwipe(remembered);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 });
    }
  }, [showTranslation, x, commitSwipe]);

  if (loading && !currentCard) {
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
      <div className="session-stats">
        <span className="stat-correct">{stats.correct}</span>
        <span className="stat-divider">/</span>
        <span className="stat-wrong">{stats.wrong}</span>
      </div>

      {/* Drop zones — always visible when translation shown */}
      {showTranslation && (
        <>
          <motion.div
            className="drop-zone drop-zone-left"
            style={{ opacity: dropZoneLeftOpacity, scale: dropZoneLeftScale }}
          >
            <div className="drop-zone-content">
              <span className="drop-zone-icon">✗</span>
            </div>
          </motion.div>
          <motion.div
            className="drop-zone drop-zone-right"
            style={{ opacity: dropZoneRightOpacity, scale: dropZoneRightScale }}
          >
            <div className="drop-zone-content">
              <span className="drop-zone-icon">✓</span>
            </div>
          </motion.div>
        </>
      )}

      <motion.div
        key={currentCard.id}
        className="card"
        style={{ x, rotate }}
        drag={showTranslation ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.92, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {/* On-card stamps */}
        {showTranslation && (
          <>
            <motion.div className="card-stamp stamp-forgot" style={{ opacity: stampLeftOpacity }}>
              FORGOT
            </motion.div>
            <motion.div className="card-stamp stamp-remember" style={{ opacity: stampRightOpacity }}>
              KNOW
            </motion.div>
          </>
        )}

        <div className="card-content">
          <div className="card-text main-text">{displayText}</div>
          {showTranslation && (
            <div className="card-text translation-text">{translationText}</div>
          )}
        </div>
      </motion.div>

      {!showTranslation && (
        <button className="check-button" onClick={handleCheck}>
          Check Translation
        </button>
      )}

      {showTranslation && (
        <div className="swipe-cta">Drag the card</div>
      )}
    </div>
  );
};

export default Flashcard;
