import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ArticlesPage from './components/ArticlesPage';
import DialogsPage from './components/DialogsPage';
import DialogView from './components/DialogView';
import SearchPage from './components/SearchPage';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">Scientific Research Manager</h1>
            <div className="nav-links">
              <Link to="/" className="nav-link">Articles</Link>
              <Link to="/dialogs" className="nav-link">Dialogs</Link>
              <Link to="/search" className="nav-link">Search</Link>
            </div>
          </div>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<ArticlesPage />} />
            <Route path="/dialogs" element={<DialogsPage />} />
            <Route path="/dialogs/:dialogId" element={<DialogView />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
