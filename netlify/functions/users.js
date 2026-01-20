import { querySupabase, getSupabaseClient, createResponse } from './utils/db.js';
import bcrypt from 'bcryptjs';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    const path = event.path.replace('/.netlify/functions/users', '');

    // POST /users/login - Login
    if (event.httpMethod === 'POST' && path === '/login') {
      const { username, password } = JSON.parse(event.body || '{}');

      if (!username || !password) {
        return createResponse(400, { error: 'Username and password are required' });
      }

      const result = await querySupabase('users', {
        select: 'id, username, email, password_hash',
        filters: { username }
      });

      if (result.rows.length === 0) {
        return createResponse(401, { error: 'Invalid username or password' });
      }

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return createResponse(401, { error: 'Invalid username or password' });
      }

      // Return user data (without password)
      return createResponse(200, {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    }

    // POST /users - Create user (for initial admin setup)
    if (event.httpMethod === 'POST' && path === '') {
      const { username, email, password } = JSON.parse(event.body || '{}');

      if (!username || !password) {
        return createResponse(400, { error: 'Username and password are required' });
      }

      // Check if user already exists
      const existing = await querySupabase('users', {
        select: 'id',
        filters: { username }
      });

      if (existing.rows.length > 0) {
        return createResponse(409, { error: 'Username already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert user
      const { data, error } = await getSupabaseClient()
        .from('users')
        .insert({
          username,
          email: email || null,
          password_hash: passwordHash
        })
        .select('id, username, email, created_at')
        .single();

      if (error) throw error;

      return createResponse(201, {
        success: true,
        user: data
      });
    }

    // POST /users/reset-password - Reset password
    if (event.httpMethod === 'POST' && path === '/reset-password') {
      const { email, newPassword } = JSON.parse(event.body || '{}');

      if (!email || !newPassword) {
        return createResponse(400, { error: 'Email and new password are required' });
      }

      // Find user by email
      const userResult = await querySupabase('users', {
        select: 'id, username',
        filters: { email }
      });

      if (userResult.rows.length === 0) {
        return createResponse(404, { error: 'User not found with this email' });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const { error } = await getSupabaseClient()
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('email', email);

      if (error) throw error;

      return createResponse(200, {
        success: true,
        message: 'Password reset successfully'
      });
    }

    return createResponse(404, { error: 'Not found' });
  } catch (error) {
    console.error('Users API error:', error);
    return createResponse(500, { error: 'Internal server error', message: error.message });
  }
};
