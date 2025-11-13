import React from 'react';
import { useSettings } from '../SettingsContext';
import '../styles/Settings.css';

const Settings = () => {
  const { language, setLanguage } = useSettings();

  return (
    <div className="settings-container">
      <h1>Settings</h1>

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
    </div>
  );
};

export default Settings;
