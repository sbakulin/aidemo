import React from "react";

function Header() {
  return (
    <div className="header">
      <div className="logo">LOGO</div>
      <nav>
        <a href="#prompt">Prompt</a>
        <a href="#history">History</a>
        <a href="#knowledge-base">Knowledge Base</a>
        <a href="#documents">Documents</a>
      </nav>
      <select className="support-dropdown">
        <option value="support">Support</option>
        {/* Add other options if needed */}
      </select>
    </div>
  );
}

export default Header;
