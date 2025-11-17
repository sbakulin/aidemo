import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRAGQuery = async (e) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery }),
      });
      const data = await response.json();
      setRagResults(data);
    } catch (error) {
      console.error('Error with RAG query:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="search-page">
      <div className="search-section">
        <h2>Text Search</h2>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles and messages..."
            className="search-input"
          />
          <button type="submit" className="btn-primary" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults && (
          <div className="search-results">
            <h3>Articles ({searchResults.articles?.length || 0})</h3>
            <div className="results-list">
              {searchResults.articles?.map(article => (
                <div key={article.id} className="result-item" onClick={() => navigate('/')}>
                  <h4>{article.title}</h4>
                  <div className="result-meta">
                    <span className={`status-badge ${article.status}`}>
                      {article.status === 'to_read' ? 'To Read' : 'Read'}
                    </span>
                    {article.url && <span className="badge">URL</span>}
                    {article.pdf_s3_key && <span className="badge">PDF</span>}
                  </div>
                </div>
              ))}
            </div>

            <h3>Messages ({searchResults.messages?.length || 0})</h3>
            <div className="results-list">
              {searchResults.messages?.map(message => (
                <div key={message.id} className="result-item" onClick={() => navigate(`/dialogs/${message.dialog_id}`)}>
                  {message.text && <p>{message.text.substring(0, 200)}...</p>}
                  {message.audio_transcription && (
                    <p className="audio-result">
                      🎤 {message.audio_transcription.substring(0, 200)}...
                    </p>
                  )}
                  <div className="result-meta">
                    <span>{new Date(message.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rag-section">
        <h2>RAG Query</h2>
        <p className="section-description">
          Ask questions about your research using semantic search and AI-powered retrieval.
        </p>
        <form onSubmit={handleRAGQuery} className="search-form">
          <textarea
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Ask a question about your research..."
            rows="3"
            className="search-input"
          />
          <button type="submit" className="btn-primary" disabled={isSearching}>
            {isSearching ? 'Processing...' : 'Query'}
          </button>
        </form>

        {ragResults && (
          <div className="rag-results">
            <h3>Relevant Contexts</h3>
            {ragResults.contexts?.map((context, index) => (
              <div key={index} className="context-item">
                <h4>{context.title}</h4>
                <div className="context-meta">
                  <span>Type: {context.type}</span>
                  <span>Relevance: {(context.score * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
            {ragResults.note && (
              <p className="rag-note">{ragResults.note}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
