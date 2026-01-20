import { getSupabaseClient, createResponse } from './utils/db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    const supabase = getSupabaseClient();

    if (event.httpMethod === 'GET') {
      const qp = event.queryStringParameters || {};
      const scope = (qp.scope || '').toString();
      const postSlug = (qp.postSlug || '').toString();
      const limit = Math.min(parseInt(qp.limit || '20', 10) || 20, 100);

      if (!scope) {
        return createResponse(400, { error: 'scope is required' });
      }

      let query = supabase
        .from('comments')
        .select('id, scope, post_slug, parent_id, author_name, rating, content, created_at')
        .eq('scope', scope);

      if (scope === 'post') {
        if (!postSlug) {
          return createResponse(400, { error: 'postSlug is required for post scope' });
        }
        query = query.eq('post_slug', postSlug).order('created_at', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false }).limit(limit);
      }

      const { data, error } = await query;
      if (error) {
        return createResponse(500, { error: 'Database error', details: error.message });
      }

      return createResponse(200, { comments: data || [] });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      const scope = (body.scope || '').toString();
      const postSlug = body.postSlug ? body.postSlug.toString() : null;
      const parentId = body.parentId ? body.parentId.toString() : null;

      const authorName = (body.authorName || '').toString().trim();
      const authorEmail = body.authorEmail ? body.authorEmail.toString().trim() : null;
      const authorPhone = body.authorPhone ? body.authorPhone.toString().trim() : null;
      const content = (body.content || '').toString().trim();
      const rating = body.rating !== undefined && body.rating !== null ? Number(body.rating) : null;

      if (!scope) {
        return createResponse(400, { error: 'scope is required' });
      }
      if (!authorName) {
        return createResponse(400, { error: 'authorName is required' });
      }
      if (!content) {
        return createResponse(400, { error: 'content is required' });
      }
      if (scope === 'post' && !postSlug) {
        return createResponse(400, { error: 'postSlug is required for post scope' });
      }

      const insertPayload = {
        scope,
        post_slug: scope === 'post' ? postSlug : null,
        parent_id: parentId,
        author_name: authorName,
        author_email: authorEmail,
        author_phone: authorPhone,
        rating: scope === 'home' ? rating : null,
        content,
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(insertPayload)
        .select('id, scope, post_slug, parent_id, author_name, rating, content, created_at')
        .single();

      if (error) {
        return createResponse(500, { error: 'Database error', details: error.message });
      }

      return createResponse(201, { success: true, comment: data });
    }

    return createResponse(405, { error: 'Method not allowed' });
  } catch (error) {
    return createResponse(500, { error: 'Internal server error', message: error.message });
  }
};
