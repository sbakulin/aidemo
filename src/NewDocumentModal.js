import React, { useState } from 'react';

function NewDocumentModal({ isOpen, onClose }) {
    const [isUpload, setIsUpload] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>New Document</h2>
                <p>You can edit the title and description of a document to make it easier to find and explain its contents.</p>
                
                <div className="switcher">
                    <button className={isUpload ? "active" : ""} onClick={() => setIsUpload(true)}>Upload File</button>
                    <button className={!isUpload ? "active" : ""} onClick={() => setIsUpload(false)}>Text Entry</button>
                </div>

                {isUpload ? (
                    <div className="upload-section">
                        <label>
                            File:
                            <input type="file" />
                        </label>
                    </div>
                ) : (
                    <div className="text-entry-section">
                        {/* Elements for text entry */}
                    </div>
                )}

                <label>
                    Title:
                    <input type="text" placeholder="Enter title" />
                </label>
                <label>
                    Comment:
                    <textarea placeholder="Enter comment"></textarea>
                </label>
                <label>
                    Source Type:
                    <input type="text" placeholder="Enter source type" />
                </label>
                <label>
                    Relevance:
                    <select>
                        {[...Array(10)].map((_, idx) => (
                            <option key={idx} value={idx + 1}>{idx + 1}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Support:
                    <select>
                        <option value="support">Support</option>
                        {/* Add other options if needed */}
                    </select>
                </label>
                <div className="toggle">
                    <label>
                        Enabled:
                        <input type="checkbox" />
                    </label>
                    <p>Description for Enabled</p>
                </div>
                <div className="toggle">
                    <label>
                        Public:
                        <input type="checkbox" />
                    </label>
                    <p>Description for Public</p>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose}>Cancel</button>
                    <button>Save</button>
                </div>
            </div>
        </div>
    );
}

export default NewDocumentModal;
