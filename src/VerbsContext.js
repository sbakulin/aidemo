import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from './supabaseClient';

const VerbsContext = createContext();

export const useVerbs = () => {
  const context = useContext(VerbsContext);
  if (!context) {
    throw new Error('useVerbs must be used within a VerbsProvider');
  }
  return context;
};

export const VerbsProvider = ({ children }) => {
  const [verbs, setVerbs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all verbs from database
  const fetchVerbs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('Verbs')
        .select('*')
        .order('Greek');

      if (error) throw error;
      setVerbs(data || []);
    } catch (error) {
      console.error('Error fetching verbs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle verb visibility
  const toggleVerbVisibility = async (verbId, isVisible) => {
    try {
      const { error } = await supabase
        .from('Verbs')
        .update({ IsVisible: isVisible })
        .eq('id', verbId);

      if (error) throw error;

      // Update local state
      setVerbs(prev =>
        prev.map(verb =>
          verb.id === verbId ? { ...verb, IsVisible: isVisible } : verb
        )
      );
    } catch (error) {
      console.error('Error toggling verb visibility:', error);
    }
  };

  // Get visible verbs
  const getVisibleVerbs = () => {
    return verbs.filter(verb => verb.IsVisible);
  };

  useEffect(() => {
    fetchVerbs();
  }, [fetchVerbs]);

  const value = {
    verbs,
    loading,
    fetchVerbs,
    toggleVerbVisibility,
    getVisibleVerbs,
  };

  return (
    <VerbsContext.Provider value={value}>
      {children}
    </VerbsContext.Provider>
  );
};
