import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useSettings } from '../SettingsContext';
import '../styles/Flashcard.css';

const SWIPE_THRESHOLD = 100;
const FLY_AWAY_DISTANCE = 1500;

const Flashcard = () => {
  const { isGreekToRussian } = useSettings();
  const [currentCard, setCurrentCard] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [swiping, setSwiping] = useState(false);
  const [dragging, setDragging] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const dropZoneLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1, 0.1, 0]);
  const dropZoneRightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0, 0.1, 1]);
  const dropZoneLeftScale = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1.05, 0.95, 0.9]);
  const dropZoneRightScale = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0.9, 0.95, 1.05]);

  // Manual drag state
  const dragRef = useRef({ startX: 0, lastX: 0, lastTime: 0, velocityX: 0 });

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

        let weight = Math.pow(daysSinceLastShown + 0.5, 2);
        if (isNew) weight *= 3;
        if (card.Remembered === false) weight *= 2.5;

        const wrongCount = card.NumberOfWrong || 0;
        const correctCount = card.NumberOfCorrect || 0;
        const totalAttempts = wrongCount + correctCount;
        if (totalAttempts >= 2) {
          const accuracy = correctCount / totalAttempts;
          if (accuracy >= 0.8) weight *= 0.25;
          else if (accuracy >= 0.6) weight *= 0.5;
          else weight *= 1.5;
        }

        if (!isNew && daysSinceLastShown < 0.004) weight *= 0.01;
        weight *= 0.8 + Math.random() * 0.4;

        return { ...card, weight: Math.max(weight, 0.001) };
      });

      const totalWeight = cardsWithWeights.reduce((sum, c) => sum + c.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedCard = cardsWithWeights[0];
      for (const card of cardsWithWeights) {
        random -= card.weight;
        if (random <= 0) { selectedCard = card; break; }
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
      type: 'tween', duration: 0.4, ease: [0.32, 0, 0.67, 0],
    });

    const now = new Date().toISOString().split('T')[0];
    const updates = {
      LastShown: now,
      Remembered: remembered,
      NumberOfWrong: remembered ? currentCard.NumberOfWrong || 0 : (currentCard.NumberOfWrong || 0) + 1,
      NumberOfCorrect: remembered ? (currentCard.NumberOfCorrect || 0) + 1 : currentCard.NumberOfCorrect || 0,
    };
    if (remembered) updates.LastCorrect = now;

    const cardId = currentCard.id;
    supabase.from('Greek').update(updates).eq('id', cardId).then();

    setStats(prev => ({
      correct: remembered ? prev.correct + 1 : prev.correct,
      wrong: remembered ? prev.wrong : prev.wrong + 1,
    }));

    setCurrentCard(null);
    x.jump(0);
    setSwiping(false);
    getNextCard(cardId);
  }, [currentCard, swiping, x, getNextCard]);

  // --- Manual pointer/touch drag handlers ---
  const onPointerDown = useCallback((e) => {
    if (!showTranslation || swiping) return;
    e.preventDefault();
    setDragging(true);
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    dragRef.current = { startX: clientX, lastX: clientX, lastTime: Date.now(), velocityX: 0 };

    const onMove = (ev) => {
      const cx = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
      const now = Date.now();
      const dt = now - dragRef.current.lastTime;
      if (dt > 0) {
        dragRef.current.velocityX = (cx - dragRef.current.lastX) / dt * 1000;
      }
      dragRef.current.lastX = cx;
      dragRef.current.lastTime = now;
      const dx = cx - dragRef.current.startX;
      x.set(dx);
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      const offset = x.get();
      const velocity = dragRef.current.velocityX;

      if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
        const remembered = offset > 0;
        commitSwipe(remembered);
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [showTranslation, swiping, x, commitSwipe]);

  if (loading && !currentCard) {
    return (
      <div className="flashcard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!currentCard && !loading) {
    return (
      <div className="flashcard-container">
        <div className="no-cards">
          <h2>No cards available</h2>
          <p>Add some phrases in the Admin section to get started!</p>
        </div>
      </div>
    );
  }

  const displayText = currentCard ? (isGreekToRussian ? currentCard.Greek : currentCard.Russian) : '';
  const translationText = currentCard ? (isGreekToRussian ? currentCard.Russian : currentCard.Greek) : '';

  return (
    <div className="flashcard-container">
      <div className="session-stats">
        <span className="stat-correct">{stats.correct}</span>
        <span className="stat-divider">/</span>
        <span className="stat-wrong">{stats.wrong}</span>
      </div>

      {currentCard && (
        <motion.div
          key={currentCard.id}
          className={`card ${dragging ? 'card-dragging' : ''}`}
          style={{ x, rotate }}
          onPointerDown={onPointerDown}
          initial={{ scale: 0.92, opacity: 0, y: 40 }}
          animate={{ scale: dragging ? 1.05 : 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <div className="card-content">
            <div className="card-text main-text">{displayText}</div>
            {showTranslation && (
              <div className="card-text translation-text">{translationText}</div>
            )}
          </div>
        </motion.div>
      )}

      {currentCard && !showTranslation && (
        <button className="check-button" onClick={handleCheck}>
          Check Translation
        </button>
      )}

      {currentCard && showTranslation && (
        <div className="swipe-cta">Drag the card</div>
      )}

      <div className="version-tag">v3.3</div>
    </div>
  );
};

export default Flashcard;
