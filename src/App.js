import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './SettingsContext';
import Navigation from './components/Navigation';
import Flashcard from './components/Flashcard';
import Settings from './components/Settings';
import Admin from './components/Admin';
import './App.css';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <div className="App">
          <div className="app-container">
            <Routes>
              <Route path="/" element={<Flashcard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
          <Navigation />
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;
