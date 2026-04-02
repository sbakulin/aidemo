import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useSettings } from '../SettingsContext';
import '../styles/ThemeStudy.css';

const SWIPE_THRESHOLD = 100;
const FLY_AWAY_DISTANCE = 1500;

const ThemeStudy = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isGreekToRussian } = useSettings();

  const [theme, setTheme] = useState(null);
  const [phrases, setPhrases] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [progressId, setProgressId] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const dropZoneLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1, 0.1, 0]);
  const dropZoneRightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0, 0.1, 1]);
  const dropZoneLeftScale = useTransform(x, [-SWIPE_THRESHOLD * 1.2, -40, 0], [1.05, 0.95, 0.9]);
  const dropZoneRightScale = useTransform(x, [0, 40, SWIPE_THRESHOLD * 1.2], [0.9, 0.95, 1.05]);

  const dragRef = useRef({ startX: 0, lastX: 0, lastTime: 0, velocityX: 0 });

  const initStudy = useCallback(async () => {
    try {
      setLoading(true);

      const [themeRes, phrasesRes, progressRes] = await Promise.all([
        supabase.from('Themes').select('*').eq('id', id).single(),
        supabase.from('ThemePhrases').select('*').eq('ThemeId', id).order('OrderIndex'),
        supabase.from('ThemeProgress').select('*').eq('ThemeId', id).single(),
      ]);

      if (themeRes.error) throw themeRes.error;
      setTheme(themeRes.data);

      const phrasesData = phrasesRes.data || [];
      setPhrases(phrasesData);

      if (phrasesData.length === 0) {
        setLoading(false);
        return;
      }

      let startIndex = 0;
      let startRemembered = 0;
      let startTotal = 0;
      let pId = null;

      if (progressRes.data) {
        pId = progressRes.data.id;

        if (progressRes.data.IsCompleted) {
          // Completed before: reset progress
          const { error } = await supabase
            .from('ThemeProgress')
            .update({
              CurrentIndex: 0,
              RememberedCount: 0,
              TotalAnswered: 0,
              IsCompleted: false,
              StartedAt: new Date().toISOString(),
              CompletedAt: null,
            })
            .eq('id', pId);
          if (error) throw error;
        } else {
          // Resume
          startIndex = progressRes.data.CurrentIndex || 0;
          startRemembered = progressRes.data.RememberedCount || 0;
          startTotal = progressRes.data.TotalAnswered || 0;
        }
      } else {
        // Create new progress record
        const { data: newProgress, error } = await supabase
          .from('ThemeProgress')
          .insert({
            ThemeId: id,
            CurrentIndex: 0,
            RememberedCount: 0,
            TotalAnswered: 0,
            IsCompleted: false,
            StartedAt: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        pId = newProgress.id;
      }

      setProgressId(pId);
      setCurrentIndex(startIndex);
      setRememberedCount(startRemembered);
      setTotalAnswered(startTotal);

      if (startIndex < phrasesData.length) {
        setCurrentCard(phrasesData[startIndex]);
        setCompleted(false);
      } else {
        setCompleted(true);
      }

      setShowTranslation(false);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing theme study:', error);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initStudy();
  }, [initStudy]);

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

    const newRemembered = remembered ? rememberedCount + 1 : rememberedCount;
    const newTotal = totalAnswered + 1;
    const newIndex = currentIndex + 1;
    const isLast = newIndex >= phrases.length;

    // Update Supabase progress
    const updates = {
      CurrentIndex: newIndex,
      RememberedCount: newRemembered,
      TotalAnswered: newTotal,
    };
    if (isLast) {
      updates.IsCompleted = true;
      updates.CompletedAt = new Date().toISOString();
    }

    supabase.from('ThemeProgress').update(updates).eq('id', progressId).then();

    setRememberedCount(newRemembered);
    setTotalAnswered(newTotal);
    setCurrentIndex(newIndex);

    setCurrentCard(null);
    x.jump(0);
    setSwiping(false);

    if (isLast) {
      setCompleted(true);
    } else {
      setCurrentCard(phrases[newIndex]);
      setShowTranslation(false);
    }
  }, [currentCard, swiping, x, rememberedCount, totalAnswered, currentIndex, phrases, progressId]);

  // --- Manual pointer/touch drag handlers (same as Flashcard.js) ---
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

  const handleTryAgain = async () => {
    if (progressId) {
      await supabase
        .from('ThemeProgress')
        .update({
          CurrentIndex: 0,
          RememberedCount: 0,
          TotalAnswered: 0,
          IsCompleted: false,
          StartedAt: new Date().toISOString(),
          CompletedAt: null,
        })
        .eq('id', progressId);
    }

    setCurrentIndex(0);
    setRememberedCount(0);
    setTotalAnswered(0);
    setCompleted(false);
    setShowTranslation(false);
    if (phrases.length > 0) {
      setCurrentCard(phrases[0]);
    }
  };

  if (loading) {
    return (
      <div className="theme-study-container">
        <div className="theme-study-loading">Loading...</div>
      </div>
    );
  }

  if (phrases.length === 0) {
    return (
      <div className="theme-study-container">
        <div className="theme-study-loading">No phrases in this theme.</div>
      </div>
    );
  }

  if (completed) {
    const pct = totalAnswered > 0 ? Math.round((rememberedCount / totalAnswered) * 100) : 0;
    return (
      <div className="theme-study-container">
        <div className="theme-summary">
          <div className="theme-summary-title">{theme?.Name || 'Theme'}</div>
          <div className="theme-summary-percentage">{pct}%</div>
          <div className="theme-summary-detail">
            You remembered {rememberedCount} out of {totalAnswered}
          </div>
          <div className="theme-summary-buttons">
            <button
              className="theme-summary-btn theme-summary-btn-primary"
              onClick={handleTryAgain}
            >
              Try again
            </button>
            <button
              className="theme-summary-btn theme-summary-btn-secondary"
              onClick={() => navigate('/themes')}
            >
              Back to themes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayText = currentCard
    ? (isGreekToRussian ? currentCard.Greek : currentCard.Russian)
    : '';
  const translationText = currentCard
    ? (isGreekToRussian ? currentCard.Russian : currentCard.Greek)
    : '';

  return (
    <div className="theme-study-container">
      <div className="theme-progress-bar">
        {currentIndex + 1} / {phrases.length}
      </div>

      {currentCard && showTranslation && (
        <>
          <motion.div
            className="theme-drop-zone theme-drop-zone-left"
            style={{ opacity: dropZoneLeftOpacity, scale: dropZoneLeftScale }}
          >
            <div className="theme-drop-zone-content">
              <span className="theme-drop-zone-label">FORGOT</span>
              <span className="theme-drop-zone-icon">✗</span>
            </div>
          </motion.div>
          <motion.div
            className="theme-drop-zone theme-drop-zone-right"
            style={{ opacity: dropZoneRightOpacity, scale: dropZoneRightScale }}
          >
            <div className="theme-drop-zone-content">
              <span className="theme-drop-zone-label">KNOW</span>
              <span className="theme-drop-zone-icon">✓</span>
            </div>
          </motion.div>
        </>
      )}

      {currentCard && (
        <motion.div
          key={currentCard.id}
          className={`theme-card-study ${dragging ? 'card-dragging' : ''}`}
          style={{ x, rotate }}
          onPointerDown={onPointerDown}
          initial={{ scale: 0.92, opacity: 0, y: 40 }}
          animate={{ scale: dragging ? 1.05 : 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <div className="theme-card-content">
            <div className="theme-card-text theme-main-text">{displayText}</div>
            {showTranslation && (
              <div className="theme-card-text theme-translation-text">{translationText}</div>
            )}
          </div>
        </motion.div>
      )}

      {currentCard && !showTranslation && (
        <button className="theme-check-button" onClick={handleCheck}>
          Check Translation
        </button>
      )}

      {currentCard && showTranslation && (
        <div className="theme-swipe-cta">Drag the card</div>
      )}
    </div>
  );
};

export default ThemeStudy;
