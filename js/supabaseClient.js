const SUPABASE_URL = "https://rlwdmctzzkibvdboeemy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2vrFLpQu4AlBTfuQ-KZZoA_mnk-Qwbk";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase URL:", supabaseClient.supabaseUrl);