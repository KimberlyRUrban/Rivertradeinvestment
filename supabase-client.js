(function (globalScope) {
  const supabaseUrl = globalScope.__SUPABASE_URL__ || 'https://bxyqogteqwmumsoqrzak.supabase.co';
  const supabaseKey = globalScope.__SUPABASE_ANON_KEY__ || 'sb_publishable_Mhb67K8TFH6n9ukhC9T0IA_U9WlzsVJ';

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR-PROJECT') || supabaseKey.includes('YOUR_SUPABASE')) {
    console.warn('Supabase credentials are not configured. The frontend will keep using the local demo flow.');
    globalScope.supabaseClient = null;
    return;
  }

  const { createClient } = globalScope.supabase ? globalScope.supabase : { createClient: null };
  if (!createClient) {
    console.warn('Supabase SDK is not loaded.');
    globalScope.supabaseClient = null;
    return;
  }

  globalScope.supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
