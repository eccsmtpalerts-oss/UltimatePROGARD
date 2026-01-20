// Test frontend environment variables
console.log('=== FRONTEND ENV CHECK ===');
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING');

// Test backend environment variables (for Netlify functions)
console.log('\n=== BACKEND ENV CHECK ===');
console.log('SUPABASE_URL:', process.env?.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env?.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
console.log('RESEND_API_KEY:', process.env?.RESEND_API_KEY ? 'SET' : 'MISSING');
