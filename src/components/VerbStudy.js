import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useSettings } from '../SettingsContext';
import { useVerbs } from '../VerbsContext';
import '../styles/VerbStudy.css';

const SWIPE_THRESHOLD = 100;
const FLY_AWAY_DISTANCE = 1500;

const VerbStudy = () => {
  const { isGreekToRussian } = useSettings();
  const { getVisibleVerbs } = useVerbs();
  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [currentVerb, setCurrentVerb] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [swiping, setSwiping] = useState(false);
  const [dragging, setDragging] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const stampLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40, 0], [1, 0, 0]);
  const stampRightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD], [0, 0, 1]);
  const dropZoneLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1, 0.1, 0]);
  const dropZoneRightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0, 0.1, 1]);
  const dropZoneLeftScale = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1.05, 0.95, 0.9]);
  const dropZoneRightScale = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0.9, 0.95, 1.05]);

  const dragRef = useRef({ startX: 0, lastX: 0, lastTime: 0, velocityX: 0 });

  const getNextPhrase = useCallback(async (excludeId) => {
    try {
      setLoading(true);
      const visibleVerbs = getVisibleVerbs();

      if (visibleVerbs.length === 0) {
        setCurrentPhrase(null);
        setCurrentVerb(null);
        setLoading(false);
        return;
      }

      const visibleVerbIds = visibleVerbs.map(v => v.id);
      const { data: phrases, error } = await supabase
        .from('VerbPhrases')
        .select('*, Verbs(*)')
        .in('VerbId', visibleVerbIds);

      if (error) throw error;

      if (!phrases || phrases.length === 0) {
        setCurrentPhrase(null);
        setCurrentVerb(null);
        setLoading(false);
        return;
      }

      const now = new Date();
      const phrasesWithWeights = phrases.map(phrase => {
        if (excludeId && phrase.id === excludeId) {
          return { ...phrase, weight: 0.001 };
        }

        const isNew = !phrase.LastShown || phrase.TimesShown === 0;
        const daysSinceLastShown = isNew
          ? 30
          : Math.max(0, (now - new Date(phrase.LastShown)) / (1000 * 60 * 60 * 24));

        let weight = Math.pow(daysSinceLastShown + 0.5, 2);
        if (isNew) weight *= 3;
        if (phrase.Remembered === false) weight *= 2.5;

        const wrongCount = phrase.NumberOfWrong || 0;
        const correctCount = phrase.NumberOfCorrect || 0;
        const totalAttempts = wrongCount + correctCount;
        if (totalAttempts >= 2) {
          const accuracy = correctCount / totalAttempts;
          if (accuracy >= 0.8) weight *= 0.25;
          else if (accuracy >= 0.6) weight *= 0.5;
          else weight *= 1.5;
        }

        if (!isNew && daysSinceLastShown < 0.004) weight *= 0.01;
        weight *= 0.8 + Math.random() * 0.4;

        return { ...phrase, weight: Math.max(weight, 0.001) };
      });

      const totalWeight = phrasesWithWeights.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedPhrase = phrasesWithWeights[0];
      for (const phrase of phrasesWithWeights) {
        random -= phrase.weight;
        if (random <= 0) { selectedPhrase = phrase; break; }
      }

      setCurrentPhrase(selectedPhrase);
      setCurrentVerb(selectedPhrase.Verbs);
      setShowTranslation(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching phrase:', error);
      setLoading(false);
    }
  }, [getVisibleVerbs]);

  useEffect(() => {
    getNextPhrase(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheck = () => {
    setShowTranslation(true);
  };

  const commitSwipe = useCallback(async (remembered) => {
    if (!currentPhrase || swiping) return;
    setSwiping(true);

    const direction = remembered ? 1 : -1;
    await animate(x, direction * FLY_AWAY_DISTANCE, {
      type: 'tween', duration: 0.4, ease: [0.32, 0, 0.67, 0],
    });

    const now = new Date().toISOString().split('T')[0];
    const phraseUpdates = {
      LastShown: now,
      Remembered: remembered,
      TimesShown: (currentPhrase.TimesShown || 0) + 1,
      NumberOfWrong: remembered ? currentPhrase.NumberOfWrong || 0 : (currentPhrase.NumberOfWrong || 0) + 1,
      NumberOfCorrect: remembered ? (currentPhrase.NumberOfCorrect || 0) + 1 : currentPhrase.NumberOfCorrect || 0,
    };
    if (remembered) phraseUpdates.LastCorrect = now;
    else phraseUpdates.LastWrong = now;

    const verbUpdates = {
      TimesShown: (currentVerb.TimesShown || 0) + 1,
      NumberOfWrong: remembered ? currentVerb.NumberOfWrong || 0 : (currentVerb.NumberOfWrong || 0) + 1,
      NumberOfCorrect: remembered ? (currentVerb.NumberOfCorrect || 0) + 1 : currentVerb.NumberOfCorrect || 0,
    };
    if (remembered) verbUpdates.LastCorrect = now;
    else verbUpdates.LastWrong = now;

    const phraseId = currentPhrase.id;
    supabase.from('VerbPhrases').update(phraseUpdates).eq('id', phraseId).then();
    supabase.from('Verbs').update(verbUpdates).eq('id', currentVerb.id).then();

    setStats(prev => ({
      correct: remembered ? prev.correct + 1 : prev.correct,
      wrong: remembered ? prev.wrong : prev.wrong + 1,
    }));

    x.jump(0);
    setSwiping(false);
    getNextPhrase(phraseId);
  }, [currentPhrase, currentVerb, swiping, x, getNextPhrase]);

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
      x.set(cx - dragRef.current.startX);
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      const offset = x.get();
      const velocity = dragRef.current.velocityX;

      if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
        commitSwipe(offset > 0);
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [showTranslation, swiping, x, commitSwipe]);

  if (loading && !currentPhrase) {
    return (
      <div className="verb-study-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!currentPhrase) {
    return (
      <div className="verb-study-container">
        <div className="no-cards">
          <h2>No verb phrases available</h2>
          <p>Enable some verbs in Settings or add verb phrases to get started!</p>
        </div>
      </div>
    );
  }

  const displayText = isGreekToRussian ? currentPhrase.Greek : currentPhrase.Russian;
  const translationText = isGreekToRussian ? currentPhrase.Russian : currentPhrase.Greek;
  const verbDisplay = isGreekToRussian ? currentVerb.Greek : currentVerb.Russian;

  return (
    <div className="verb-study-container">
      <div className="session-stats">
        <span className="stat-correct">{stats.correct}</span>
        <span className="stat-divider">/</span>
        <span className="stat-wrong">{stats.wrong}</span>
      </div>

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

      <div className="verb-indicator">
        <span className="verb-name">{verbDisplay}</span>
      </div>

      <motion.div
        key={currentPhrase.id}
        className={`card ${dragging ? 'card-dragging' : ''}`}
        style={{ x, rotate }}
        onPointerDown={onPointerDown}
        initial={{ scale: 0.92, opacity: 0, y: 40 }}
        animate={{ scale: dragging ? 1.05 : 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
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

export default VerbStudy;
