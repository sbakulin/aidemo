import React from "react";

function DocumentList({ documents }) {
  return (
    <div className="document-list-container">
      {documents.map((doc, index) => (
        <div key={index} className="document-item">
          <span className="doc-name">{doc.name} </span>
          <span className="doc-author">{doc.author}</span>
          <span className="doc-disabled">{doc.disabled ? "Disabled" : ""}</span>
          <span className="doc-privacy">
            {doc.private ? "Private" : "Public"}
          </span>
          <button className="delete-button">🗑</button>
        </div>
      ))}
    </div>
  );
}

export default DocumentList;
