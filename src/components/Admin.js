import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import '../styles/Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('cards');

  // Cards state
  const [greekText, setGreekText] = useState('');
  const [russianText, setRussianText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phrases, setPhrases] = useState([]);
  const [loadingPhrases, setLoadingPhrases] = useState(true);

  // Verbs state
  const [verbs, setVerbs] = useState([]);
  const [loadingVerbs, setLoadingVerbs] = useState(true);
  const [newVerbGreek, setNewVerbGreek] = useState('');
  const [newVerbRussian, setNewVerbRussian] = useState('');
  const [selectedVerbId, setSelectedVerbId] = useState(null);
  const [newPhraseGreek, setNewPhraseGreek] = useState('');
  const [newPhraseRussian, setNewPhraseRussian] = useState('');
  const [expandedVerbs, setExpandedVerbs] = useState({});
  const fileInputRef = useRef(null);

  // Themes state
  const [themes, setThemes] = useState([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [newThemeName, setNewThemeName] = useState('');
  const [expandedThemes, setExpandedThemes] = useState({});
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [editingThemeName, setEditingThemeName] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [newThemePhraseGreek, setNewThemePhraseGreek] = useState('');
  const [newThemePhraseRussian, setNewThemePhraseRussian] = useState('');
  const [editingPhraseId, setEditingPhraseId] = useState(null);
  const [editingPhraseGreek, setEditingPhraseGreek] = useState('');
  const [editingPhraseRussian, setEditingPhraseRussian] = useState('');

  useEffect(() => {
    loadPhrases();
    loadVerbs();
    loadThemes();
  }, []);

  // ============ CARDS FUNCTIONS ============
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
      setMessage('Пожалуйста, заполните оба поля');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
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
      await loadPhrases();
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

  // ============ VERBS FUNCTIONS ============
  const loadVerbs = async () => {
    try {
      setLoadingVerbs(true);
      const { data: verbsData, error: verbsError } = await supabase
        .from('Verbs')
        .select('*')
        .order('Greek');

      if (verbsError) throw verbsError;

      // Load phrases for each verb
      const verbsWithPhrases = await Promise.all(
        (verbsData || []).map(async (verb) => {
          const { data: phrasesData } = await supabase
            .from('VerbPhrases')
            .select('*')
            .eq('VerbId', verb.id)
            .order('id');
          return { ...verb, phrases: phrasesData || [] };
        })
      );

      setVerbs(verbsWithPhrases);
    } catch (error) {
      console.error('Error loading verbs:', error);
    } finally {
      setLoadingVerbs(false);
    }
  };

  const handleAddVerb = async (e) => {
    e.preventDefault();
    if (!newVerbGreek.trim() || !newVerbRussian.trim()) {
      setMessage('Please fill in both verb fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('Verbs')
        .insert([{
          Greek: newVerbGreek.trim(),
          Russian: newVerbRussian.trim(),
          IsVisible: true,
        }]);

      if (error) throw error;

      setNewVerbGreek('');
      setNewVerbRussian('');
      await loadVerbs();
      setMessage('Verb added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding verb:', error);
      setMessage('Error adding verb: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVerb = async (verbId) => {
    if (!window.confirm('Delete this verb and all its phrases?')) return;

    try {
      const { error } = await supabase
        .from('Verbs')
        .delete()
        .eq('id', verbId);

      if (error) throw error;

      await loadVerbs();
      setMessage('Verb deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting verb:', error);
      setMessage('Error deleting verb: ' + error.message);
    }
  };

  const handleAddPhrase = async (e) => {
    e.preventDefault();
    if (!selectedVerbId || !newPhraseGreek.trim() || !newPhraseRussian.trim()) {
      setMessage('Please select a verb and fill in both phrase fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('VerbPhrases')
        .insert([{
          VerbId: selectedVerbId,
          Greek: newPhraseGreek.trim(),
          Russian: newPhraseRussian.trim(),
        }]);

      if (error) throw error;

      setNewPhraseGreek('');
      setNewPhraseRussian('');
      await loadVerbs();
      setMessage('Phrase added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding phrase:', error);
      setMessage('Error adding phrase: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhrase = async (phraseId) => {
    if (!window.confirm('Delete this phrase?')) return;

    try {
      const { error } = await supabase
        .from('VerbPhrases')
        .delete()
        .eq('id', phraseId);

      if (error) throw error;

      await loadVerbs();
      setMessage('Phrase deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting phrase:', error);
      setMessage('Error deleting phrase: ' + error.message);
    }
  };

  const toggleVerbExpanded = (verbId) => {
    setExpandedVerbs(prev => ({
      ...prev,
      [verbId]: !prev[verbId]
    }));
  };

  // ============ THEMES FUNCTIONS ============
  const loadThemes = async () => {
    try {
      setLoadingThemes(true);
      const { data: themesData, error: themesError } = await supabase
        .from('Themes')
        .select('*')
        .order('OrderIndex');

      if (themesError) throw themesError;

      const themesWithPhrases = await Promise.all(
        (themesData || []).map(async (theme) => {
          const { data: phrasesData } = await supabase
            .from('ThemePhrases')
            .select('*')
            .eq('ThemeId', theme.id)
            .order('OrderIndex');
          return { ...theme, phrases: phrasesData || [] };
        })
      );

      setThemes(themesWithPhrases);
    } catch (error) {
      console.error('Error loading themes:', error);
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleAddTheme = async (e) => {
    e.preventDefault();
    if (!newThemeName.trim()) {
      setMessage('Please enter a theme name');
      return;
    }

    setLoading(true);
    try {
      const maxOrder = themes.length > 0
        ? Math.max(...themes.map(t => t.OrderIndex || 0)) + 1
        : 0;

      const { error } = await supabase
        .from('Themes')
        .insert([{ Name: newThemeName.trim(), OrderIndex: maxOrder }]);

      if (error) throw error;

      setNewThemeName('');
      await loadThemes();
      setMessage('Theme added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding theme:', error);
      setMessage('Error adding theme: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheme = async (themeId) => {
    if (!window.confirm('Delete this theme and all its phrases?')) return;

    try {
      // Delete progress and phrases first (in case no cascade)
      await supabase.from('ThemeProgress').delete().eq('ThemeId', themeId);
      await supabase.from('ThemePhrases').delete().eq('ThemeId', themeId);
      const { error } = await supabase.from('Themes').delete().eq('id', themeId);

      if (error) throw error;

      await loadThemes();
      setMessage('Theme deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting theme:', error);
      setMessage('Error deleting theme: ' + error.message);
    }
  };

  const handleSaveThemeName = async (themeId) => {
    if (!editingThemeName.trim()) return;

    try {
      const { error } = await supabase
        .from('Themes')
        .update({ Name: editingThemeName.trim() })
        .eq('id', themeId);

      if (error) throw error;

      setEditingThemeId(null);
      await loadThemes();
      setMessage('Theme name updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating theme:', error);
      setMessage('Error updating theme: ' + error.message);
    }
  };

  const handleAddThemePhrase = async (e) => {
    e.preventDefault();
    if (!selectedThemeId || !newThemePhraseGreek.trim() || !newThemePhraseRussian.trim()) {
      setMessage('Please select a theme and fill in both fields');
      return;
    }

    setLoading(true);
    try {
      const theme = themes.find(t => t.id === selectedThemeId);
      const maxOrder = theme && theme.phrases.length > 0
        ? Math.max(...theme.phrases.map(p => p.OrderIndex || 0)) + 1
        : 0;

      const { error } = await supabase
        .from('ThemePhrases')
        .insert([{
          ThemeId: selectedThemeId,
          Greek: newThemePhraseGreek.trim(),
          Russian: newThemePhraseRussian.trim(),
          OrderIndex: maxOrder,
        }]);

      if (error) throw error;

      setNewThemePhraseGreek('');
      setNewThemePhraseRussian('');
      await loadThemes();
      setMessage('Phrase added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding theme phrase:', error);
      setMessage('Error adding phrase: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteThemePhrase = async (phraseId) => {
    if (!window.confirm('Delete this phrase?')) return;

    try {
      const { error } = await supabase
        .from('ThemePhrases')
        .delete()
        .eq('id', phraseId);

      if (error) throw error;

      await loadThemes();
      setMessage('Phrase deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting phrase:', error);
      setMessage('Error deleting phrase: ' + error.message);
    }
  };

  const handleSaveThemePhrase = async (phraseId) => {
    if (!editingPhraseGreek.trim() || !editingPhraseRussian.trim()) return;

    try {
      const { error } = await supabase
        .from('ThemePhrases')
        .update({
          Greek: editingPhraseGreek.trim(),
          Russian: editingPhraseRussian.trim(),
        })
        .eq('id', phraseId);

      if (error) throw error;

      setEditingPhraseId(null);
      await loadThemes();
      setMessage('Phrase updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating phrase:', error);
      setMessage('Error updating phrase: ' + error.message);
    }
  };

  const toggleThemeExpanded = (themeId) => {
    setExpandedThemes(prev => ({
      ...prev,
      [themeId]: !prev[themeId]
    }));
  };

  // ============ IMPORT FUNCTIONS ============
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('Importing verbs...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('No data found in the Excel file');
      }

      // Validate structure
      const firstRow = jsonData[0];
      if (!firstRow.VerbGreek || !firstRow.VerbRussian) {
        throw new Error('Invalid file structure. Required columns: VerbGreek, VerbRussian, PhraseGreek, PhraseRussian');
      }

      // Confirm deletion of existing data
      if (!window.confirm('This will DELETE all existing verbs and phrases and import new ones. Continue?')) {
        setMessage('');
        setLoading(false);
        e.target.value = '';
        return;
      }

      // Delete all existing verb phrases and verbs
      await supabase.from('VerbPhrases').delete().neq('id', 0);
      await supabase.from('Verbs').delete().neq('id', 0);

      // Group data by verb
      const verbsMap = new Map();
      jsonData.forEach(row => {
        const verbKey = `${row.VerbGreek}|${row.VerbRussian}`;
        if (!verbsMap.has(verbKey)) {
          verbsMap.set(verbKey, {
            Greek: row.VerbGreek,
            Russian: row.VerbRussian,
            phrases: []
          });
        }
        if (row.PhraseGreek && row.PhraseRussian) {
          verbsMap.get(verbKey).phrases.push({
            Greek: row.PhraseGreek,
            Russian: row.PhraseRussian
          });
        }
      });

      // Insert verbs and phrases
      for (const verbData of verbsMap.values()) {
        const { data: insertedVerb, error: verbError } = await supabase
          .from('Verbs')
          .insert([{
            Greek: verbData.Greek,
            Russian: verbData.Russian,
            IsVisible: true,
          }])
          .select()
          .single();

        if (verbError) throw verbError;

        if (verbData.phrases.length > 0) {
          const phrasesToInsert = verbData.phrases.map(phrase => ({
            VerbId: insertedVerb.id,
            Greek: phrase.Greek,
            Russian: phrase.Russian,
          }));

          const { error: phrasesError } = await supabase
            .from('VerbPhrases')
            .insert(phrasesToInsert);

          if (phrasesError) throw phrasesError;
        }
      }

      await loadVerbs();
      setMessage(`Import successful! Imported ${verbsMap.size} verbs.`);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error importing file:', error);
      setMessage('Error importing file: ' + error.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { VerbGreek: 'Πηγαίνω', VerbRussian: 'Идти/Ходить', PhraseGreek: 'Πηγαίνω στο σχολείο.', PhraseRussian: 'Я иду в школу.' },
      { VerbGreek: 'Πηγαίνω', VerbRussian: 'Идти/Ходить', PhraseGreek: 'Θα πας στο σχολείο;', PhraseRussian: 'Ты пойдёшь в школу?' },
      { VerbGreek: 'Πηγαίνω', VerbRussian: 'Идти/Ходить', PhraseGreek: 'Πηγαίνουν στη δουλειά.', PhraseRussian: 'Они ходят на работу.' },
      { VerbGreek: 'Τρώω', VerbRussian: 'Есть/Кушать', PhraseGreek: 'Τρώω πρωινό.', PhraseRussian: 'Я ем завтрак.' },
      { VerbGreek: 'Τρώω', VerbRussian: 'Есть/Кушать', PhraseGreek: 'Θα φας μαζί μας;', PhraseRussian: 'Ты будешь есть с нами?' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Verbs');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // VerbGreek
      { wch: 15 }, // VerbRussian
      { wch: 35 }, // PhraseGreek
      { wch: 35 }, // PhraseRussian
    ];

    XLSX.writeFile(workbook, 'verbs_template.xlsx');
  };

  return (
    <div className="admin-container">
      <h1>Manage Content</h1>

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
        <button
          className={`tab ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          Themes
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* ============ CARDS TAB ============ */}
      {activeTab === 'cards' && (
        <>
          <form onSubmit={handleSubmit} className="phrase-form">
            <h3>Add New Phrase</h3>
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
        </>
      )}

      {/* ============ VERBS TAB ============ */}
      {activeTab === 'verbs' && (
        <>
          <div className="import-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
            <button onClick={handleImportClick} className="import-button" disabled={loading}>
              Import from Excel
            </button>
            <button onClick={handleDownloadTemplate} className="template-button">
              Download Template
            </button>
          </div>

          <form onSubmit={handleAddVerb} className="phrase-form">
            <h3>Add New Verb</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="verbGreek">Greek</label>
                <input
                  type="text"
                  id="verbGreek"
                  value={newVerbGreek}
                  onChange={(e) => setNewVerbGreek(e.target.value)}
                  placeholder="e.g., Πηγαίνω"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="verbRussian">Russian</label>
                <input
                  type="text"
                  id="verbRussian"
                  value={newVerbRussian}
                  onChange={(e) => setNewVerbRussian(e.target.value)}
                  placeholder="e.g., Идти/Ходить"
                  disabled={loading}
                />
              </div>
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Adding...' : 'Add Verb'}
            </button>
          </form>

          <form onSubmit={handleAddPhrase} className="phrase-form">
            <h3>Add Phrase to Verb</h3>
            <div className="form-group">
              <label htmlFor="selectVerb">Select Verb</label>
              <select
                id="selectVerb"
                value={selectedVerbId || ''}
                onChange={(e) => setSelectedVerbId(e.target.value ? Number(e.target.value) : null)}
                disabled={loading}
              >
                <option value="">-- Select a verb --</option>
                {verbs.map(verb => (
                  <option key={verb.id} value={verb.id}>
                    {verb.Greek} - {verb.Russian}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phraseGreek">Greek Phrase</label>
                <input
                  type="text"
                  id="phraseGreek"
                  value={newPhraseGreek}
                  onChange={(e) => setNewPhraseGreek(e.target.value)}
                  placeholder="e.g., Πηγαίνω στο σχολείο."
                  disabled={loading || !selectedVerbId}
                />
              </div>
              <div className="form-group">
                <label htmlFor="phraseRussian">Russian Translation</label>
                <input
                  type="text"
                  id="phraseRussian"
                  value={newPhraseRussian}
                  onChange={(e) => setNewPhraseRussian(e.target.value)}
                  placeholder="e.g., Я иду в школу."
                  disabled={loading || !selectedVerbId}
                />
              </div>
            </div>
            <button type="submit" className="submit-button" disabled={loading || !selectedVerbId}>
              {loading ? 'Adding...' : 'Add Phrase'}
            </button>
          </form>

          <div className="verbs-list-admin">
            <h2>Existing Verbs ({verbs.length})</h2>

            {loadingVerbs ? (
              <div className="loading">Loading verbs...</div>
            ) : verbs.length === 0 ? (
              <div className="no-phrases">No verbs yet. Add some above or import from Excel!</div>
            ) : (
              <div className="verbs-accordion">
                {verbs.map((verb) => (
                  <div key={verb.id} className="verb-item">
                    <div className="verb-header" onClick={() => toggleVerbExpanded(verb.id)}>
                      <div className="verb-title">
                        <span className="verb-expand-icon">
                          {expandedVerbs[verb.id] ? '▼' : '▶'}
                        </span>
                        <span className="verb-name">{verb.Greek}</span>
                        <span className="verb-translation">{verb.Russian}</span>
                        <span className="verb-count">({verb.phrases?.length || 0} phrases)</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVerb(verb.id);
                        }}
                        className="delete-button"
                        title="Delete verb"
                      >
                        ✗
                      </button>
                    </div>
                    {expandedVerbs[verb.id] && (
                      <div className="verb-phrases">
                        {verb.phrases?.length === 0 ? (
                          <div className="no-phrases-small">No phrases for this verb</div>
                        ) : (
                          verb.phrases?.map((phrase) => (
                            <div key={phrase.id} className="phrase-item">
                              <div className="phrase-item-content">
                                <div className="phrase-item-greek">{phrase.Greek}</div>
                                <div className="phrase-item-russian">{phrase.Russian}</div>
                              </div>
                              <button
                                onClick={() => handleDeletePhrase(phrase.id)}
                                className="delete-button-small"
                                title="Delete phrase"
                              >
                                ✗
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {/* ============ THEMES TAB ============ */}
      {activeTab === 'themes' && (
        <>
          <form onSubmit={handleAddTheme} className="phrase-form">
            <h3>Add New Theme</h3>
            <div className="form-group">
              <label htmlFor="themeName">Theme Name</label>
              <input
                type="text"
                id="themeName"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="e.g., Моя семья"
                disabled={loading}
              />
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Adding...' : 'Add Theme'}
            </button>
          </form>

          <form onSubmit={handleAddThemePhrase} className="phrase-form">
            <h3>Add Phrase to Theme</h3>
            <div className="form-group">
              <label htmlFor="selectTheme">Select Theme</label>
              <select
                id="selectTheme"
                value={selectedThemeId || ''}
                onChange={(e) => setSelectedThemeId(e.target.value ? Number(e.target.value) : null)}
                disabled={loading}
              >
                <option value="">-- Select a theme --</option>
                {themes.map(theme => (
                  <option key={theme.id} value={theme.id}>
                    {theme.Name} ({theme.phrases?.length || 0} phrases)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="themePhraseGreek">Greek</label>
                <input
                  type="text"
                  id="themePhraseGreek"
                  value={newThemePhraseGreek}
                  onChange={(e) => setNewThemePhraseGreek(e.target.value)}
                  placeholder="Greek phrase"
                  disabled={loading || !selectedThemeId}
                />
              </div>
              <div className="form-group">
                <label htmlFor="themePhraseRussian">Russian</label>
                <input
                  type="text"
                  id="themePhraseRussian"
                  value={newThemePhraseRussian}
                  onChange={(e) => setNewThemePhraseRussian(e.target.value)}
                  placeholder="Russian translation"
                  disabled={loading || !selectedThemeId}
                />
              </div>
            </div>
            <button type="submit" className="submit-button" disabled={loading || !selectedThemeId}>
              {loading ? 'Adding...' : 'Add Phrase'}
            </button>
          </form>

          <div className="verbs-list-admin">
            <h2>Existing Themes ({themes.length})</h2>

            {loadingThemes ? (
              <div className="loading">Loading themes...</div>
            ) : themes.length === 0 ? (
              <div className="no-phrases">No themes yet. Add some above!</div>
            ) : (
              <div className="verbs-accordion">
                {themes.map((theme) => (
                  <div key={theme.id} className="verb-item">
                    <div className="verb-header" onClick={() => toggleThemeExpanded(theme.id)}>
                      <div className="verb-title">
                        <span className="verb-expand-icon">
                          {expandedThemes[theme.id] ? '▼' : '▶'}
                        </span>
                        {editingThemeId === theme.id ? (
                          <input
                            className="theme-name-edit-input"
                            value={editingThemeName}
                            onChange={(e) => setEditingThemeName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveThemeName(theme.id);
                              if (e.key === 'Escape') setEditingThemeId(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="verb-name">{theme.Name}</span>
                        )}
                        <span className="verb-count">({theme.phrases?.length || 0} phrases)</span>
                      </div>
                      <div className="theme-header-actions" onClick={(e) => e.stopPropagation()}>
                        {editingThemeId === theme.id ? (
                          <>
                            <button
                              onClick={() => handleSaveThemeName(theme.id)}
                              className="save-button-small"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingThemeId(null)}
                              className="delete-button-small"
                              title="Cancel"
                            >
                              ✗
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingThemeId(theme.id);
                                setEditingThemeName(theme.Name);
                              }}
                              className="edit-button-small"
                              title="Edit name"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteTheme(theme.id)}
                              className="delete-button-small"
                              title="Delete theme"
                            >
                              ✗
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {expandedThemes[theme.id] && (
                      <div className="verb-phrases">
                        {theme.phrases?.length === 0 ? (
                          <div className="no-phrases-small">No phrases in this theme</div>
                        ) : (
                          theme.phrases?.map((phrase) => (
                            <div key={phrase.id} className="phrase-item">
                              {editingPhraseId === phrase.id ? (
                                <div className="phrase-edit-row">
                                  <input
                                    className="phrase-edit-input"
                                    value={editingPhraseGreek}
                                    onChange={(e) => setEditingPhraseGreek(e.target.value)}
                                    placeholder="Greek"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveThemePhrase(phrase.id);
                                      if (e.key === 'Escape') setEditingPhraseId(null);
                                    }}
                                  />
                                  <input
                                    className="phrase-edit-input"
                                    value={editingPhraseRussian}
                                    onChange={(e) => setEditingPhraseRussian(e.target.value)}
                                    placeholder="Russian"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveThemePhrase(phrase.id);
                                      if (e.key === 'Escape') setEditingPhraseId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveThemePhrase(phrase.id)}
                                    className="save-button-small"
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEditingPhraseId(null)}
                                    className="delete-button-small"
                                    title="Cancel"
                                  >
                                    ✗
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="phrase-item-content">
                                    <div className="phrase-item-greek">{phrase.Greek}</div>
                                    <div className="phrase-item-russian">{phrase.Russian}</div>
                                  </div>
                                  <div className="theme-header-actions">
                                    <button
                                      onClick={() => {
                                        setEditingPhraseId(phrase.id);
                                        setEditingPhraseGreek(phrase.Greek);
                                        setEditingPhraseRussian(phrase.Russian);
                                      }}
                                      className="edit-button-small"
                                      title="Edit phrase"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() => handleDeleteThemePhrase(phrase.id)}
                                      className="delete-button-small"
                                      title="Delete phrase"
                                    >
                                      ✗
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;
