import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Admin.css';

const Admin = () => {
  const [greekText, setGreekText] = useState('');
  const [russianText, setRussianText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phrases, setPhrases] = useState([]);
  const [loadingPhrases, setLoadingPhrases] = useState(true);

  useEffect(() => {
    loadPhrases();
  }, []);

  const loadPhrases = async () => {
    try {
      const { data, error } = await supabase
        .from('Greek')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setPhrases(data || []);
    } catch (error) {
      console.error('Error loading phrases:', error);
    } finally {
      setLoadingPhrases(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!greekText.trim() || !russianText.trim()) {
      setMessage('Please fill in both fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('Greek')
        .insert([
          {
            Greek: greekText.trim(),
            Russian: russianText.trim(),
            Remembered: null,
            LastShown: null,
            LastCorrect: null,
            NumberOfWrong: 0,
            NumberOfCorrect: 0,
          },
        ])
        .select();

      if (error) throw error;

      setMessage('Phrase added successfully!');
      setGreekText('');
      setRussianText('');

      // Reload phrases
      await loadPhrases();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding phrase:', error);
      setMessage('Error adding phrase: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this phrase?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('Greek')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPhrases();
      setMessage('Phrase deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting phrase:', error);
      setMessage('Error deleting phrase: ' + error.message);
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm('Reset statistics for this phrase?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('Greek')
        .update({
          Remembered: null,
          LastShown: null,
          LastCorrect: null,
          NumberOfWrong: 0,
          NumberOfCorrect: 0,
        })
        .eq('id', id);

      if (error) throw error;

      await loadPhrases();
      setMessage('Statistics reset successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error resetting phrase:', error);
      setMessage('Error resetting phrase: ' + error.message);
    }
  };

  return (
    <div className="admin-container">
      <h1>Add New Phrases</h1>

      <form onSubmit={handleSubmit} className="phrase-form">
        <div className="form-group">
          <label htmlFor="greek">Greek Text</label>
          <input
            type="text"
            id="greek"
            value={greekText}
            onChange={(e) => setGreekText(e.target.value)}
            placeholder="Enter Greek word or phrase"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="russian">Russian Translation</label>
          <input
            type="text"
            id="russian"
            value={russianText}
            onChange={(e) => setRussianText(e.target.value)}
            placeholder="Enter Russian translation"
            disabled={loading}
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Adding...' : 'Add Phrase'}
        </button>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </form>

      <div className="phrases-list">
        <h2>Existing Phrases ({phrases.length})</h2>

        {loadingPhrases ? (
          <div className="loading">Loading phrases...</div>
        ) : phrases.length === 0 ? (
          <div className="no-phrases">No phrases yet. Add some above!</div>
        ) : (
          <div className="phrases-grid">
            {phrases.map((phrase) => (
              <div key={phrase.id} className="phrase-card">
                <div className="phrase-content">
                  <div className="phrase-text">
                    <strong>Greek:</strong> {phrase.Greek}
                  </div>
                  <div className="phrase-text">
                    <strong>Russian:</strong> {phrase.Russian}
                  </div>
                  <div className="phrase-stats">
                    <span className="stat">✓ {phrase.NumberOfCorrect || 0}</span>
                    <span className="stat">✗ {phrase.NumberOfWrong || 0}</span>
                    {phrase.LastShown && (
                      <span className="stat-date">
                        Last: {new Date(phrase.LastShown).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="phrase-actions">
                  <button
                    onClick={() => handleReset(phrase.id)}
                    className="reset-button"
                    title="Reset statistics"
                  >
                    ↺
                  </button>
                  <button
                    onClick={() => handleDelete(phrase.id)}
                    className="delete-button"
                    title="Delete phrase"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
