// Test frontend environment variables
console.log('=== FRONTEND ENV CHECK ===');
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING');
