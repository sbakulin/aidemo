import React from "react";

function DocumentItem({ title, description }) {
  return (
    <div className="document-item">
      <div className="document-info">
        <span className="document-title">{title}</span>
        <span className="document-description">{description}</span>
      </div>
      <button className="open-button">Open</button>
    </div>
  );
}

export default DocumentItem;
