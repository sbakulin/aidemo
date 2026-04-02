import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/ThemeList.css';

const ThemeList = () => {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const { data: themesData, error: themesError } = await supabase
          .from('Themes')
          .select('*')
          .order('OrderIndex');

        if (themesError) throw themesError;
        if (!themesData || themesData.length === 0) {
          setThemes([]);
          setLoading(false);
          return;
        }

        const themeIds = themesData.map(t => t.id);

        const [progressRes, countRes] = await Promise.all([
          supabase
            .from('ThemeProgress')
            .select('*')
            .in('ThemeId', themeIds),
          supabase
            .from('ThemePhrases')
            .select('ThemeId')
            .in('ThemeId', themeIds),
        ]);

        const progressMap = {};
        if (progressRes.data) {
          progressRes.data.forEach(p => {
            progressMap[p.ThemeId] = p;
          });
        }

        const countMap = {};
        if (countRes.data) {
          countRes.data.forEach(row => {
            countMap[row.ThemeId] = (countMap[row.ThemeId] || 0) + 1;
          });
        }

        const enriched = themesData.map(theme => ({
          ...theme,
          progress: progressMap[theme.id] || null,
          phraseCount: countMap[theme.id] || 0,
        }));

        setThemes(enriched);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching themes:', error);
        setLoading(false);
      }
    };

    fetchThemes();
  }, []);

  const renderProgress = (theme) => {
    const { progress, phraseCount } = theme;
    if (!progress) return null;

    if (!progress.IsCompleted) {
      return (
        <span className="theme-card-progress theme-progress-in-progress">
          {progress.CurrentIndex}/{phraseCount} ▸
        </span>
      );
    }

    const pct = progress.TotalAnswered > 0
      ? Math.round((progress.RememberedCount / progress.TotalAnswered) * 100)
      : 0;

    let colorClass = 'theme-progress-red';
    if (pct >= 70) colorClass = 'theme-progress-green';
    else if (pct >= 40) colorClass = 'theme-progress-yellow';

    return (
      <span className={`theme-card-progress ${colorClass}`}>
        {pct}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="theme-list-container">
        <div className="theme-list-loading">Loading...</div>
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="theme-list-container">
        <div className="theme-list-empty">
          <h2>No themes yet</h2>
          <p>Themes will appear here once they are added.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-list-container">
      <div className="theme-list-header">
        <h1>Themes</h1>
      </div>
      <div className="theme-list">
        {themes.map(theme => (
          <div
            key={theme.id}
            className="theme-card"
            onClick={() => navigate(`/themes/${theme.id}`)}
          >
            <span className="theme-card-name">{theme.Name}</span>
            {renderProgress(theme)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemeList;
