/**
 * Database Connection Utility
 * Shared utility for connecting to Supabase PostgreSQL database
 * Optimized for serverless with Supabase client
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client for server-side operations
let supabase = null;

/**
 * Get Supabase client (creates if doesn't exist)
 * Uses service role key for full access
 */
function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabase;
}

/**
 * Execute a database query using Supabase client
 * @param {string} table - Table name
 * @param {Object} options - Query options { select, filters, limit, offset, orderBy, isWrite }
 */
async function querySupabase(table, options = {}) {
  const { select = '*', filters = {}, limit, offset, orderBy, isWrite = false } = options;
  const client = getSupabaseClient();

  let query = client.from(table).select(select);

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  });

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
  }

  // Apply pagination
  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 1000) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase query error:', error);
    throw error;
  }

  return { rows: data || [] };
}

/**
 * Execute raw SQL query (for complex queries not supported by Supabase client)
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 */
async function queryRaw(sql, params = []) {
  // For raw SQL, we still need pg, but connect to Supabase DB
  // This is a fallback for complex queries
  const client = getSupabaseClient();
  
  // Supabase doesn't support raw SQL directly, so we use rpc if possible
  // For now, throw error and convert to client queries
  throw new Error('Raw SQL queries need to be converted to Supabase client queries');
}

/**
 * Helper to format API response with optional caching
 */
function createResponse(statusCode, body, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  return {
    statusCode,
    headers: {
      ...defaultHeaders,
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export {
  getSupabaseClient,
  querySupabase,
  queryRaw,
  createResponse
};
