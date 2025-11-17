import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/DialogView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function DialogView() {
  const { dialogId } = useParams();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);

  useEffect(() => {
    fetchDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogId]);

  const fetchDialog = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dialogs/${dialogId}`);
      const data = await response.json();
      setDialog(data.dialog);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching dialog:', error);
    }
  };

  const handleAddMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() && selectedImages.length === 0) return;

    try {
      const formData = new FormData();
      if (messageText.trim()) {
        formData.append('text', messageText);
      }
      
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch(`${API_URL}/api/dialogs/${dialogId}/messages/multimodal`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setMessages([...messages, data]);
      setMessageText('');
      setSelectedImages([]);
    } catch (error) {
      console.error('Error adding message:', error);
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
        await uploadAudioMessage(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
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

  const uploadAudioMessage = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'message.webm');

      const response = await fetch(`${API_URL}/api/dialogs/${dialogId}/messages/multimodal`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setMessages([...messages, data]);
    } catch (error) {
      console.error('Error uploading audio message:', error);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages([...selectedImages, ...files]);
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  if (!dialog) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dialog-view">
      <div className="dialog-header">
        <button onClick={() => navigate('/dialogs')} className="btn-back">
          ← Back
        </button>
        <h2>{dialog.title}</h2>
      </div>

      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className="message">
            <div className="message-time">
              {new Date(message.created_at).toLocaleString()}
            </div>
            
            {message.text && (
              <div className="message-text">
                {message.text}
              </div>
            )}
            
            {message.audio_transcription && (
              <div className="message-audio">
                <span className="audio-icon">🎤</span>
                <div className="audio-transcription">
                  {message.audio_transcription}
                </div>
              </div>
            )}
            
            {message.image_s3_keys && message.image_s3_keys.length > 0 && (
              <div className="message-images">
                <span className="image-count">
                  📎 {message.image_s3_keys.length} image(s) attached
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="message-input-container">
        <form onSubmit={handleAddMessage} className="message-form">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Add your notes, thoughts, or observations..."
            rows="4"
          />
          
          {selectedImages.length > 0 && (
            <div className="selected-images">
              {selectedImages.map((image, index) => (
                <div key={index} className="selected-image">
                  <span>{image.name}</span>
                  <button type="button" onClick={() => removeImage(index)}>×</button>
                </div>
              ))}
            </div>
          )}
          
          <div className="message-actions">
            <button type="submit" className="btn-primary">
              Add Message
            </button>
            
            <label className="btn-secondary file-button">
              📎 Attach Images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </label>
            
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`btn-secondary ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? '⏹ Stop Recording' : '🎤 Record Audio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DialogView;
