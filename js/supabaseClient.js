const SUPABASE_URL = "https://rlwdmctzzkibvdboeemy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2RtY3R6emtpYnZkYm9lZW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDc0MzksImV4cCI6MjA5NjUyMzQzOX0.r9ADYuBTPPX-F9i6WQB6fX7z4DdC5U5IR4AFtAStCN0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabaseClient = supabaseClient;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log("Supabase client loaded");