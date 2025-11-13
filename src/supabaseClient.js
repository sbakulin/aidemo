import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('REACT_APP_SUPABASE_URL is not defined. Please check your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('REACT_APP_SUPABASE_ANON_KEY is not defined. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
