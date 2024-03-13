import React, { useState } from "react";
import Header from "./Header";
import SearchBar from "./SearchBar";
import DocumentList from "./DocumentList";
import NewDocumentModal from "./NewDocumentModal";

import "./App.css";

function App() {
  const documents = [
    { name: "Document 1", author: "Author 1" },
    { name: "Document 2", author: "Author 2" },
    // ... add more documents as needed
  ];
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <div className="app-container">
      <Header />
      <SearchBar onNewDocument={() => setModalOpen(true)} />
      <DocumentList documents={documents} />
      <NewDocumentModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

export default App;
