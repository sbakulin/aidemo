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
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  
  const leftHighlight = useTransform(x, [-150, 0], [1, 0]);
  const rightHighlight = useTransform(x, [0, 150], [0, 1]);

  // Smart card selection algorithm with weighted random selection
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

      // Calculate weights for each card using weighted random selection
      const now = new Date();
      const cardsWithWeights = data.map(card => {
        if (currentCard && card.id === currentCard.id) {
          return { ...card, weight: 0 };
        }

        let weight = 1.0; // Base weight (epsilon to ensure all cards have a chance)

        // Calculate days since last shown
        const isNew = !card.LastShown;
        const daysSinceLastShown = isNew
          ? 999
          : (now - new Date(card.LastShown)) / (1000 * 60 * 60 * 24);

        // New cards get highest priority
        if (isNew) {
          weight += 100; // w_new: strong boost for never-shown cards
        }

        // Time-based weight: cards not shown recently get higher priority
        weight += 20 * Math.log(1 + daysSinceLastShown); // w_time

        // Accuracy-based weight: cards with lower accuracy get higher priority
        const wrongCount = card.NumberOfWrong || 0;
        const correctCount = card.NumberOfCorrect || 0;
        const totalAttempts = wrongCount + correctCount;

        if (totalAttempts > 0) {
          const accuracy = correctCount / totalAttempts;
          weight += 30 * (1 - accuracy); // w_err
        } else if (!isNew) {
          weight += 15;
        }

        if (correctCount > 0) {
          weight *= 1 / (1 + Math.sqrt(correctCount) * 0.3);
        }

        // Cards marked as not remembered get extra priority
        if (card.Remembered === false) {
          weight += 20;
        }

        if (daysSinceLastShown < 0.0014) { // ~2 minutes
          weight = 0.1; // Very low weight but not zero
        }

        return { ...card, weight: Math.max(weight, 0.1) }; // Ensure minimum weight
      });

      // Calculate total weight
      const totalWeight = cardsWithWeights.reduce((sum, card) => sum + card.weight, 0);

      let random = Math.random() * totalWeight;
      let selectedCard = cardsWithWeights[0]; // Fallback

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
  };

  useEffect(() => {
    getNextCard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheck = () => {
    setShowTranslation(true);
  };

  const handleSwipe = async (remembered) => {
    if (!currentCard || !showTranslation) return;

    try {
      setIsExiting(true);
      setExitDirection(remembered ? 'right' : 'left');
      
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

      setTimeout(() => {
        setIsExiting(false);
        setExitDirection(null);
        x.set(0);
        getNextCard();
      }, 500);
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

  const cardVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: {
      x: exitDirection === 'right' ? 1000 : -1000,
      opacity: 0,
      rotate: exitDirection === 'right' ? 45 : -45,
      transition: { duration: 0.5, ease: "easeInOut" }
    }
  };

  return (
    <div className="flashcard-container">
      <div className="stats">
        <span className="stat-correct">✓ {stats.correct}</span>
        <span className="stat-wrong">✗ {stats.wrong}</span>
      </div>

      {showTranslation && (
        <>
          <motion.div 
            className="drop-zone drop-zone-left"
            style={{ opacity: leftHighlight }}
          >
            <div className="drop-zone-content">
              <span className="drop-zone-icon">✗</span>
              <span className="drop-zone-text">Didn't remember</span>
            </div>
          </motion.div>
          <motion.div 
            className="drop-zone drop-zone-right"
            style={{ opacity: rightHighlight }}
          >
            <div className="drop-zone-content">
              <span className="drop-zone-icon">✓</span>
              <span className="drop-zone-text">Remembered!</span>
            </div>
          </motion.div>
        </>
      )}

      <motion.div
        className="card"
        style={{ x, rotate }}
        drag={showTranslation ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        dragElastic={0.7}
        variants={cardVariants}
        initial="initial"
        animate={isExiting ? "exit" : "animate"}
        transition={{ duration: 0.3 }}
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
            <span className="hint-icon">←</span>
            <span className="hint-text">Swipe left</span>
          </div>
          <div className="hint hint-right">
            <span className="hint-icon">→</span>
            <span className="hint-text">Swipe right</span>
          </div>
        </div>
      )}

      {!showTranslation && (
        <button className="check-button" onClick={handleCheck}>
          Check Translation
        </button>
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
