import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wwpxoyossxfbdwsvdjon.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cHhveW9zc3hmYmR3c3Zkam9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzIxODEsImV4cCI6MjA2NjM0ODE4MX0.ZfL1VdAedkRIxc7nX4Ukb0pae_YUsi4fOiYMNecdoHg'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
