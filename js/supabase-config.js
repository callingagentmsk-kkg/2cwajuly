/* =========================================================
   SUPABASE CONFIGURATION
   -----------------------------------------------------------
   Fill these two values in after you create your Supabase
   project and run supabase/schema.sql in the SQL Editor:

     1. Go to Project Settings -> API
     2. Copy "Project URL"      -> paste into SUPABASE_URL
     3. Copy "anon public" key  -> paste into SUPABASE_ANON_KEY

   Until these are filled in, the website + admin panel will
   automatically run on local fallback demo data (site-data.js,
   batches-data.js, results-data.js) so nothing breaks.
========================================================= */
const SUPABASE_URL = 'https://bvregktzgtxorkzkrepc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cmVna3R6Z3R4b3JremtyZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTYzNTgsImV4cCI6MjA5ODczMjM1OH0.Ti53MHicYnEmM_8vz3XFmtQ0bN9_TvFrb35kTHqqSJQ';

// Shared Supabase client (used by both the public site and the Admin Panel).
// Will be `null` if the values above are not filled in yet.
let supabaseClient = null;
if (typeof window !== 'undefined' && window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase client init failed, falling back to local data.', e);
    supabaseClient = null;
  }
}
const IS_SUPABASE_CONFIGURED = !!supabaseClient;
