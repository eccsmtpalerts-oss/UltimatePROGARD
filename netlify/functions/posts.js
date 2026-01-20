import { querySupabase, getSupabaseClient, createResponse } from './utils/db.js';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    const path = event.path.replace('/.netlify/functions/posts', '');

    // GET /posts - Get all posts
    // GET /posts/:slug - Get post by slug
    if (event.httpMethod === 'GET') {
      if (path && path !== '/') {
        // Get single post by slug - uses indexed slug column
        const slug = path.replace('/', '');
        const result = await querySupabase('posts', {
          select: 'id, title, slug, excerpt, content, date, read_time, category, author, image, featured, created_at, updated_at',
          filters: { slug }
        });

        if (result.rows.length === 0) {
          return createResponse(404, { error: 'Post not found' });
        }

        return createResponse(200, { post: result.rows[0] });
      } else {
        // Get paginated posts list - exclude heavy content field for performance
        const queryParams = event.queryStringParameters || {};
        const page = parseInt(queryParams.page) || 1;
        const limit = Math.min(parseInt(queryParams.limit) || 6, 20); // Max 20 per page
        const offset = (page - 1) * limit;

        const result = await querySupabase('posts', {
          select: 'id, title, slug, excerpt, date, read_time, category, author, image, featured, created_at',
          orderBy: { column: 'created_at', ascending: false },
          limit,
          offset
        });

        // Get total count for pagination
        const { count, error: countError } = await getSupabaseClient()
          .from('posts')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        const total = count;
        const totalPages = Math.ceil(total / limit);

        return createResponse(200, {
          posts: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }, {
          'Cache-Control': 'public, max-age=180' // Cache for 3 minutes
        });
      }
    }

    // POST /posts - Create post
    if (event.httpMethod === 'POST' && path === '') {
      const body = JSON.parse(event.body || '{}');
      const {
        title,
        slug,
        excerpt,
        content,
        date,
        readTime,
        category,
        author,
        image,
        featured
      } = body;

      if (!title || !slug || !content) {
        return createResponse(400, { error: 'Title, slug, and content are required' });
      }

      // Validate that content is not just empty HTML
      const contentText = content.replace(/<[^>]*>/g, '').trim();
      if (!contentText || contentText === '') {
        return createResponse(400, { error: 'Post content cannot be empty' });
      }

      // Normalize slug (trim and lowercase)
      const normalizedSlug = slug.trim().toLowerCase();

      try {
        const { data, error } = await getSupabaseClient()
          .from('posts')
          .insert({
            title: title.trim(),
            slug: normalizedSlug,
            excerpt: excerpt ? excerpt.trim() : null,
            content,
            date: date || new Date().toISOString().split('T')[0],
            read_time: readTime || null,
            category: category ? category.trim() : null,
            author: author || 'Perfect Gardener',
            image: image || null,
            featured: featured || false
          })
          .select('id, title, slug, excerpt, content, date, read_time, category, author, image, featured, created_at, updated_at')
          .single();

        if (error) {
          console.error('Supabase error:', error);
          return createResponse(500, { error: 'Database error', details: error.message });
        }

        return createResponse(201, {
          success: true,
          post: data
        });
      } catch (err) {
        console.error('Function error:', err);
        return createResponse(500, { error: 'Server error', details: err.message });
      }
    }

    // PUT /posts/:id - Update post
    if (event.httpMethod === 'PUT') {
      const path = event.path.replace('/.netlify/functions/posts', '');
      const pathParts = path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id) {
        return createResponse(400, { error: 'Post ID is required' });
      }

      const body = JSON.parse(event.body || '{}');
      const {
        title,
        slug,
        excerpt,
        content,
        date,
        readTime,
        category,
        author,
        image,
        featured
      } = body;

      // Get current post to check if slug is actually changing (optimization)
      const currentPost = await queryDb(
        'SELECT slug FROM posts WHERE id = $1 LIMIT 1',
        [id],
        { isWrite: false, logSlow: false }
      );

      if (currentPost.rows.length === 0) {
        return createResponse(404, { error: 'Post not found' });
      }

      const currentSlug = currentPost.rows[0].slug?.toLowerCase().trim();
      const newSlug = slug ? slug.trim().toLowerCase() : null;

      // Only check for duplicate slug if it's actually changing
      if (slug && newSlug !== currentSlug) {
        const existing = await queryDb(
          'SELECT id FROM posts WHERE LOWER(TRIM(slug)) = $1 AND id != $2 LIMIT 1',
          [newSlug, id],
          { isWrite: false, logSlow: false }
        );
        if (existing.rows.length > 0) {
          return createResponse(409, { 
            error: 'A post with this slug already exists. Please use a different slug.',
            duplicateField: 'slug'
          });
        }
      }

      // Validate content if provided
      if (content !== undefined) {
        const contentText = content.replace(/<[^>]*>/g, '').trim();
        if (!contentText || contentText === '') {
          return createResponse(400, { error: 'Post content cannot be empty' });
        }
      }

      // Update using indexed id column (fast)
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (content !== undefined) updateData.content = content;
      if (date !== undefined) updateData.date = date;
      if (readTime !== undefined) updateData.read_time = readTime;
      if (category !== undefined) updateData.category = category;
      if (author !== undefined) updateData.author = author;
      if (image !== undefined) updateData.image = image;
      if (featured !== undefined) updateData.featured = featured;

      const { data, error } = await getSupabaseClient()
        .from('posts')
        .update(updateData)
        .eq('id', id)
        .select('id, title, slug, excerpt, content, date, read_time, category, author, image, featured, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return createResponse(404, { error: 'Post not found' });
        throw error;
      }

      // Return minimal response for faster network transfer
      return createResponse(200, {
        success: true,
        post: {
          id: data.id,
          title: data.title,
          slug: data.slug,
          updated_at: data.updated_at
        }
      });
    }

    // DELETE /posts/:id - Delete post
    if (event.httpMethod === 'DELETE') {
      const path = event.path.replace('/.netlify/functions/posts', '');
      const pathParts = path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id) {
        return createResponse(400, { error: 'Post ID is required' });
      }

      const { data, error } = await getSupabaseClient()
        .from('posts')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return createResponse(404, { error: 'Post not found' });
        throw error;
      }

      return createResponse(200, { success: true, message: 'Post deleted' });
    }

    return createResponse(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Posts API error:', error);
    return createResponse(500, { error: 'Internal server error', message: error.message });
  }
};
