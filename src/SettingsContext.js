import React, { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'greek-to-russian';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const value = {
    language,
    setLanguage,
    isGreekToRussian: language === 'greek-to-russian',
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
