// js/supabase-client.js

// 1. Paste your Project URL here
const supabaseUrl = 'https://hrhuavgjvztlhtkgwwjz.supabase.co';

// 2. Paste your Publishable key here
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyaHVhdmdqdnp0bGh0a2d3d2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNjYzNTEsImV4cCI6MjA4Nzg0MjM1MX0.PViLYSTAHZZidMpNoUjPHDJSCuZeHlCiCcegmFjauPQ';

// 3. Initialize the Supabase client
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase Client Initialized!");