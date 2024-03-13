import React from "react";

function SearchBar({ onNewDocument }) {
  return (
    <div className="search-bar">
      <input type="text" placeholder="Search..." />
      <select className="document-dropdown">
        <option value="documents">Documents</option>
        {/* Add other options if needed */}
      </select>
      <button className="new-document-button" onClick={onNewDocument}>
        New Document
      </button>{" "}
    </div>
  );
}

export default SearchBar;
