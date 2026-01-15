import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useSettings } from '../SettingsContext';
import { useVerbs } from '../VerbsContext';
import '../styles/VerbStudy.css';

const VerbStudy = () => {
  const { isGreekToRussian } = useSettings();
  const { getVisibleVerbs } = useVerbs();
  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [currentVerb, setCurrentVerb] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);

  const leftHighlight = useTransform(x, [-150, 0], [1, 0]);
  const rightHighlight = useTransform(x, [0, 150], [0, 1]);

  // Card selection algorithm for verbs
  // Priority 1: Never shown phrases (TimesShown = 0 or LastShown = null)
  // Priority 2: Phrases answered "didn't remember" (Remembered = false), oldest first
  const getNextPhrase = useCallback(async () => {
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

      // Get all phrases for visible verbs
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

      // Separate phrases into categories
      const neverShown = phrases.filter(p => !p.LastShown || p.TimesShown === 0);
      const notRemembered = phrases
        .filter(p => p.Remembered === false && p.LastShown)
        .sort((a, b) => new Date(a.LastShown) - new Date(b.LastShown)); // Oldest first
      const others = phrases
        .filter(p => p.LastShown && p.Remembered !== false)
        .sort((a, b) => new Date(a.LastShown) - new Date(b.LastShown)); // Oldest first

      let selectedPhrase;

      // Priority 1: Never shown phrases (random selection among them)
      if (neverShown.length > 0) {
        const randomIndex = Math.floor(Math.random() * neverShown.length);
        selectedPhrase = neverShown[randomIndex];
      }
      // Priority 2: Not remembered phrases, starting with oldest
      else if (notRemembered.length > 0) {
        selectedPhrase = notRemembered[0];
      }
      // Fallback: Other phrases, oldest first
      else if (others.length > 0) {
        selectedPhrase = others[0];
      }
      // Ultimate fallback: just pick any phrase
      else {
        selectedPhrase = phrases[0];
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
    getNextPhrase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheck = () => {
    setShowTranslation(true);
  };

  const handleSwipe = async (remembered) => {
    if (!currentPhrase || !showTranslation) return;

    try {
      setIsExiting(true);
      setExitDirection(remembered ? 'right' : 'left');

      const now = new Date().toISOString().split('T')[0];

      // Update phrase statistics
      const phraseUpdates = {
        LastShown: now,
        Remembered: remembered,
        TimesShown: (currentPhrase.TimesShown || 0) + 1,
        NumberOfWrong: remembered
          ? currentPhrase.NumberOfWrong || 0
          : (currentPhrase.NumberOfWrong || 0) + 1,
        NumberOfCorrect: remembered
          ? (currentPhrase.NumberOfCorrect || 0) + 1
          : currentPhrase.NumberOfCorrect || 0,
      };

      if (remembered) {
        phraseUpdates.LastCorrect = now;
      } else {
        phraseUpdates.LastWrong = now;
      }

      await supabase
        .from('VerbPhrases')
        .update(phraseUpdates)
        .eq('id', currentPhrase.id);

      // Update verb statistics
      const verbUpdates = {
        TimesShown: (currentVerb.TimesShown || 0) + 1,
        NumberOfWrong: remembered
          ? currentVerb.NumberOfWrong || 0
          : (currentVerb.NumberOfWrong || 0) + 1,
        NumberOfCorrect: remembered
          ? (currentVerb.NumberOfCorrect || 0) + 1
          : currentVerb.NumberOfCorrect || 0,
      };

      if (remembered) {
        verbUpdates.LastCorrect = now;
      } else {
        verbUpdates.LastWrong = now;
      }

      await supabase
        .from('Verbs')
        .update(verbUpdates)
        .eq('id', currentVerb.id);

      setStats(prev => ({
        correct: remembered ? prev.correct + 1 : prev.correct,
        wrong: remembered ? prev.wrong : prev.wrong + 1,
      }));

      setTimeout(() => {
        setIsExiting(false);
        setExitDirection(null);
        x.set(0);
        getNextPhrase();
      }, 500);
    } catch (error) {
      console.error('Error updating phrase:', error);
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
    <div className="verb-study-container">
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

      <div className="verb-indicator">
        <span className="verb-label">Verb:</span>
        <span className="verb-name">{verbDisplay}</span>
      </div>

      <motion.div
        key={currentPhrase?.id}
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
          Correct: {currentPhrase.NumberOfCorrect || 0} |
          Wrong: {currentPhrase.NumberOfWrong || 0}
        </small>
      </div>
    </div>
  );
};

export default VerbStudy;
