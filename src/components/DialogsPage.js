import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DialogsPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function DialogsPage() {
  const [dialogs, setDialogs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDialogTitle, setNewDialogTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDialogs();
  }, []);

  const fetchDialogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dialogs`);
      const data = await response.json();
      setDialogs(data);
    } catch (error) {
      console.error('Error fetching dialogs:', error);
    }
  };

  const handleAddDialog = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/dialogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDialogTitle }),
      });
      const data = await response.json();
      setDialogs([...dialogs, data]);
      setShowAddModal(false);
      setNewDialogTitle('');
      navigate(`/dialogs/${data.id}`);
    } catch (error) {
      console.error('Error adding dialog:', error);
    }
  };

  const handleDeleteDialog = async (dialogId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this dialog?')) return;
    
    try {
      await fetch(`${API_URL}/api/dialogs/${dialogId}`, {
        method: 'DELETE',
      });
      setDialogs(dialogs.filter(d => d.id !== dialogId));
    } catch (error) {
      console.error('Error deleting dialog:', error);
    }
  };

  const handleExportDialog = async (dialogId, e) => {
    e.stopPropagation();
    try {
      const dialog = dialogs.find(d => d.id === dialogId);
      const response = await fetch(`${API_URL}/api/export/word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${dialog.title} - Research Summary`,
          dialog_id: dialogId,
        }),
      });
      const data = await response.json();
      
      if (data.result && data.result.download_url) {
        window.open(data.result.download_url, '_blank');
      } else {
        alert('Document generation in progress. Check back in a moment.');
      }
    } catch (error) {
      console.error('Error exporting dialog:', error);
      alert('Error exporting dialog');
    }
  };

  return (
    <div className="dialogs-page">
      <div className="page-header">
        <h2>Research Dialogs</h2>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          New Dialog
        </button>
      </div>

      <div className="dialogs-grid">
        {dialogs.map(dialog => (
          <div
            key={dialog.id}
            className="dialog-card"
            onClick={() => navigate(`/dialogs/${dialog.id}`)}
          >
            <h3>{dialog.title}</h3>
            <div className="dialog-meta">
              <span>Created: {new Date(dialog.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(dialog.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="dialog-actions">
              <button
                onClick={(e) => handleExportDialog(dialog.id, e)}
                className="btn-secondary"
              >
                📄 Export to Word
              </button>
              <button
                onClick={(e) => handleDeleteDialog(dialog.id, e)}
                className="btn-danger"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Dialog</h2>
            <form onSubmit={handleAddDialog}>
              <input
                type="text"
                placeholder="Dialog title"
                value={newDialogTitle}
                onChange={(e) => setNewDialogTitle(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DialogsPage;
