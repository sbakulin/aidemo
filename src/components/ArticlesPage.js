import React, { useState, useEffect } from 'react';
import '../styles/ArticlesPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [newArticle, setNewArticle] = useState({ title: '', url: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [comment, setComment] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/articles`);
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const handleAddArticle = async (e) => {
    e.preventDefault();
    try {
      if (pdfFile) {
        const formData = new FormData();
        formData.append('title', newArticle.title);
        formData.append('pdf', pdfFile);

        const response = await fetch(`${API_URL}/api/articles/upload-pdf`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setArticles([...articles, data]);
      } else {
        const response = await fetch(`${API_URL}/api/articles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newArticle),
        });
        const data = await response.json();
        setArticles([...articles, data]);
      }
      setShowAddModal(false);
      setNewArticle({ title: '', url: '' });
      setPdfFile(null);
    } catch (error) {
      console.error('Error adding article:', error);
    }
  };

  const handleUpdateStatus = async (articleId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      setArticles(articles.map(a => a.id === articleId ? data : a));
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle(data);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddComment = async (articleId) => {
    if (!comment.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment }),
      });
      await response.json();
      setComment('');
      const updatedArticle = await fetch(`${API_URL}/api/articles/${articleId}`).then(r => r.json());
      setSelectedArticle(updatedArticle);
      setArticles(articles.map(a => a.id === articleId ? updatedArticle : a));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await uploadAudioComment(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const uploadAudioComment = async (audioBlob) => {
    if (!selectedArticle) return;
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'comment.webm');

      const response = await fetch(`${API_URL}/api/articles/${selectedArticle.id}/comments/audio`, {
        method: 'POST',
        body: formData,
      });
      await response.json();
      const updatedArticle = await fetch(`${API_URL}/api/articles/${selectedArticle.id}`).then(r => r.json());
      setSelectedArticle(updatedArticle);
      setArticles(articles.map(a => a.id === selectedArticle.id ? updatedArticle : a));
    } catch (error) {
      console.error('Error uploading audio comment:', error);
    }
  };

  const searchArticlesForCitation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/articles/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching articles:', error);
    }
  };

  const handleAddCitation = async (targetArticleId) => {
    if (!selectedArticle) return;
    try {
      await fetch(`${API_URL}/api/articles/${selectedArticle.id}/citations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_article_id: targetArticleId }),
      });
      const updatedArticle = await fetch(`${API_URL}/api/articles/${selectedArticle.id}`).then(r => r.json());
      setSelectedArticle(updatedArticle);
      setArticles(articles.map(a => a.id === selectedArticle.id ? updatedArticle : a));
      setShowCitationModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding citation:', error);
    }
  };

  return (
    <div className="articles-page">
      <div className="articles-list">
        <div className="list-header">
          <h2>Articles</h2>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Article
          </button>
        </div>

        <div className="articles-grid">
          {articles.map(article => (
            <div
              key={article.id}
              className={`article-card ${selectedArticle?.id === article.id ? 'selected' : ''}`}
              onClick={() => setSelectedArticle(article)}
            >
              <h3>{article.title}</h3>
              <div className="article-meta">
                <span className={`status-badge ${article.status}`}>
                  {article.status === 'to_read' ? 'To Read' : 'Read'}
                </span>
                {article.pdf_s3_key && <span className="badge">PDF</span>}
                {article.url && <span className="badge">URL</span>}
              </div>
              <div className="article-stats">
                <span>{article.comments?.length || 0} comments</span>
                <span>{article.citations?.length || 0} citations</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedArticle && (
        <div className="article-details">
          <div className="details-header">
            <h2>{selectedArticle.title}</h2>
            <select
              value={selectedArticle.status}
              onChange={(e) => handleUpdateStatus(selectedArticle.id, e.target.value)}
              className="status-select"
            >
              <option value="to_read">To Read</option>
              <option value="read">Read</option>
            </select>
          </div>

          {selectedArticle.url && (
            <div className="article-url">
              <strong>URL:</strong> <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">{selectedArticle.url}</a>
            </div>
          )}

          {selectedArticle.pdf_text && (
            <div className="article-text">
              <h3>Extracted Text</h3>
              <p>{selectedArticle.pdf_text.substring(0, 500)}...</p>
            </div>
          )}

          <div className="citations-section">
            <div className="section-header">
              <h3>Citations</h3>
              <button onClick={() => setShowCitationModal(true)} className="btn-secondary">
                Add Citation
              </button>
            </div>
            {selectedArticle.citations?.map(citation => {
              const targetArticle = articles.find(a => a.id === citation.target_article_id);
              return (
                <div key={citation.id} className="citation-item">
                  Cites: {targetArticle?.title || 'Unknown'}
                </div>
              );
            })}
          </div>

          <div className="comments-section">
            <h3>Comments</h3>
            {selectedArticle.comments?.map(comment => (
              <div key={comment.id} className="comment-item">
                {comment.text && <p>{comment.text}</p>}
                {comment.audio_transcription && (
                  <div className="audio-transcription">
                    <span className="audio-icon">🎤</span>
                    <p>{comment.audio_transcription}</p>
                  </div>
                )}
              </div>
            ))}

            <div className="add-comment">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows="3"
              />
              <div className="comment-actions">
                <button onClick={() => handleAddComment(selectedArticle.id)} className="btn-primary">
                  Add Comment
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`btn-secondary ${isRecording ? 'recording' : ''}`}
                >
                  {isRecording ? '⏹ Stop Recording' : '🎤 Record Audio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Article</h2>
            <form onSubmit={handleAddArticle}>
              <input
                type="text"
                placeholder="Title"
                value={newArticle.title}
                onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                required
              />
              <input
                type="url"
                placeholder="URL (optional)"
                value={newArticle.url}
                onChange={(e) => setNewArticle({ ...newArticle, url: e.target.value })}
              />
              <div className="file-input">
                <label>PDF File (optional):</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files[0])}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Add</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCitationModal && (
        <div className="modal-overlay" onClick={() => setShowCitationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Citation</h2>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchArticlesForCitation(e.target.value);
              }}
            />
            <div className="search-results">
              {searchResults.map(article => (
                <div
                  key={article.id}
                  className="search-result-item"
                  onClick={() => handleAddCitation(article.id)}
                >
                  {article.title}
                </div>
              ))}
            </div>
            <button onClick={() => setShowCitationModal(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticlesPage;
