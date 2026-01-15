import React, { useState } from 'react';
import { useSettings } from '../SettingsContext';
import { useVerbs } from '../VerbsContext';
import '../styles/Settings.css';

const Settings = () => {
  const { language, setLanguage } = useSettings();
  const { verbs, loading, toggleVerbVisibility } = useVerbs();
  const [activeTab, setActiveTab] = useState('cards');

  const handleVerbToggle = async (verbId, currentVisibility) => {
    await toggleVerbVisibility(verbId, !currentVisibility);
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          Cards
        </button>
        <button
          className={`tab ${activeTab === 'verbs' ? 'active' : ''}`}
          onClick={() => setActiveTab('verbs')}
        >
          Verbs
        </button>
      </div>

      {activeTab === 'cards' && (
        <>
          <div className="setting-section">
            <h2>Learning Direction</h2>
            <p className="setting-description">
              Choose which language to learn from
            </p>

            <div className="language-options">
              <label className="language-option">
                <input
                  type="radio"
                  name="language"
                  value="greek-to-russian"
                  checked={language === 'greek-to-russian'}
                  onChange={(e) => setLanguage(e.target.value)}
                />
                <span className="option-label">
                  <span className="option-title">Greek → Russian</span>
                  <span className="option-desc">See Greek, guess Russian</span>
                </span>
              </label>

              <label className="language-option">
                <input
                  type="radio"
                  name="language"
                  value="russian-to-greek"
                  checked={language === 'russian-to-greek'}
                  onChange={(e) => setLanguage(e.target.value)}
                />
                <span className="option-label">
                  <span className="option-title">Russian → Greek</span>
                  <span className="option-desc">See Russian, guess Greek</span>
                </span>
              </label>
            </div>
          </div>

          <div className="setting-info">
            <h3>How it works</h3>
            <ul>
              <li>Cards you got wrong appear more frequently</li>
              <li>Newly added phrases get priority</li>
              <li>Cards not seen recently will reappear</li>
              <li>Swipe right if you remembered, left if you didn't</li>
            </ul>
          </div>
        </>
      )}

      {activeTab === 'verbs' && (
        <>
          <div className="setting-section">
            <h2>Select Verbs to Study</h2>
            <p className="setting-description">
              Choose which verbs should appear in Verbs mode
            </p>

            {loading ? (
              <div className="verbs-loading">Loading verbs...</div>
            ) : verbs.length === 0 ? (
              <div className="verbs-empty">
                <p>No verbs available yet.</p>
                <p>Add verbs to the database to see them here.</p>
              </div>
            ) : (
              <div className="verbs-list">
                {verbs.map((verb) => (
                  <label key={verb.id} className="verb-option">
                    <input
                      type="checkbox"
                      checked={verb.IsVisible}
                      onChange={() => handleVerbToggle(verb.id, verb.IsVisible)}
                    />
                    <span className="verb-info">
                      <span className="verb-greek">{verb.Greek}</span>
                      <span className="verb-russian">{verb.Russian}</span>
                    </span>
                    <span className="verb-stats">
                      <span className="verb-stat-correct">✓ {verb.NumberOfCorrect || 0}</span>
                      <span className="verb-stat-wrong">✗ {verb.NumberOfWrong || 0}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="setting-info">
            <h3>How Verbs mode works</h3>
            <ul>
              <li>Phrases you've never seen get priority</li>
              <li>Phrases you didn't remember appear next, oldest first</li>
              <li>Language direction follows your Cards setting</li>
              <li>Each verb has multiple phrases/conjugations</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
