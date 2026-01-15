import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './SettingsContext';
import { VerbsProvider } from './VerbsContext';
import Navigation from './components/Navigation';
import Flashcard from './components/Flashcard';
import Settings from './components/Settings';
import Admin from './components/Admin';
import VerbStudy from './components/VerbStudy';
import './App.css';

function App() {
  return (
    <SettingsProvider>
      <VerbsProvider>
        <Router>
          <div className="App">
            <div className="app-container">
              <Routes>
                <Route path="/" element={<Flashcard />} />
                <Route path="/verbs" element={<VerbStudy />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </div>
            <Navigation />
          </div>
        </Router>
      </VerbsProvider>
    </SettingsProvider>
  );
}

export default App;
