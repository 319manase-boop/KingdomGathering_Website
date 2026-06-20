const SUPABASE_URL = "https://rlwdmctzzkibvdboeemy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2vrFLpQu4AlBTfuQ-KZZoA_mnk-Qwbk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabaseClient = supabaseClient;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log("Supabase client loaded");