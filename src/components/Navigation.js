import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navigation.css';

const Navigation = () => {
  return (
    <nav className="navigation">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        <span className="nav-icon">📚</span>
        <span className="nav-text">Learn</span>
      </NavLink>
      <NavLink to="/verbs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        <span className="nav-icon">📝</span>
        <span className="nav-text">Verbs</span>
      </NavLink>
      <NavLink to="/themes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        <span className="nav-icon">📖</span>
        <span className="nav-text">Themes</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        <span className="nav-icon">⚙️</span>
        <span className="nav-text">Settings</span>
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        <span className="nav-icon">➕</span>
        <span className="nav-text">Add</span>
      </NavLink>
    </nav>
  );
};

export default Navigation;
