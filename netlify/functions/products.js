import { querySupabase, getSupabaseClient, createResponse } from './utils/db.js';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    // GET /products - Get paginated products list
    if (event.httpMethod === 'GET') {
      // Parse query parameters for pagination
      const queryParams = event.queryStringParameters || {};
      const page = parseInt(queryParams.page) || 1;
      const limit = Math.min(parseInt(queryParams.limit) || 12, 50); // Max 50 per page
      const offset = (page - 1) * limit;

      // For list view, exclude heavy fields like description
      const result = await querySupabase('products', {
        select: 'id, name, price, image, images, link, category, source, sub_category, created_at',
        orderBy: { column: 'created_at', ascending: false },
        limit,
        offset
      });

      // Get total count for pagination info
      const { count, error: countError } = await getSupabaseClient()
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const total = count;
      const totalPages = Math.ceil(total / limit);

      // Convert JSONB arrays to JavaScript arrays
      const products = result.rows.map(row => ({
        ...row,
        images: row.images || (row.image ? [row.image] : []),
        subCategory: row.sub_category
      }));

      return createResponse(200, {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }, {
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      });
    }

    // POST /products - Create product
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const {
        name,
        price,
        image,
        images,
        link,
        category,
        description,
        source,
        subCategory
      } = body;

      if (!name || !price) {
        return createResponse(400, { error: 'Name and price are required' });
      }

      // Normalize name (trim and case-insensitive check)
      const normalizedName = name.trim();
      
      // Check for duplicate product name (case-insensitive) - optimized query
      // Skip for now

      // Use images array if provided, otherwise use single image
      const imagesArray = images && images.length > 0 ? images : (image ? [image] : []);
      const primaryImage = imagesArray.length > 0 ? imagesArray[0] : null;

      try {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .insert({
            name: normalizedName,
            price: price.trim(),
            image: primaryImage,
            images: imagesArray,
            link: link ? link.trim() : null,
            category: category ? category.trim() : null,
            description: description ? description.trim() : null,
            source: source ? source.trim() : null,
            sub_category: subCategory ? subCategory.trim() : null
          })
          .select('id, name, price, image, images, link, category, description, source, sub_category, created_at, updated_at')
          .single();

        if (error) {
          console.error('Supabase error:', error);
          return createResponse(500, { error: 'Database error', details: error.message });
        }

        const product = data;
        return createResponse(201, {
          success: true,
          product: {
            ...product,
            images: product.images || (product.image ? [product.image] : []),
            subCategory: product.sub_category
          }
        });
      } catch (err) {
        console.error('Function error:', err);
        return createResponse(500, { error: 'Server error', details: err.message });
      }
    }

    // PUT /products/:id - Update product
    if (event.httpMethod === 'PUT') {
      const path = event.path.replace('/.netlify/functions/products', '');
      const pathParts = path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id) {
        return createResponse(400, { error: 'Product ID is required' });
      }

      const body = JSON.parse(event.body || '{}');
      const {
        name,
        price,
        image,
        images,
        link,
        category,
        description,
        source,
        subCategory
      } = body;

      // Check for duplicate name if name is being updated (case-insensitive, excluding current product) - optimized query
      // Skip for now

      // Use images array if provided, otherwise use single image
      const imagesArray = images && images.length > 0 ? images : (image ? [image] : []);
      const primaryImage = imagesArray.length > 0 ? imagesArray[0] : null;

      const updateData = {};
      if (name !== undefined) updateData.name = name ? name.trim() : null;
      if (price !== undefined) updateData.price = price ? price.trim() : null;
      if (primaryImage !== undefined) updateData.image = primaryImage;
      if (imagesArray.length > 0) updateData.images = imagesArray;
      if (link !== undefined) updateData.link = link ? link.trim() : null;
      if (category !== undefined) updateData.category = category ? category.trim() : null;
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (source !== undefined) updateData.source = source ? source.trim() : null;
      if (subCategory !== undefined) updateData.sub_category = subCategory ? subCategory.trim() : null;

      const { data, error } = await getSupabaseClient()
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select('id, name, price, image, images, link, category, description, source, sub_category, created_at, updated_at')
        .single();

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') return createResponse(404, { error: 'Product not found' });
        return createResponse(500, { error: 'Database error', details: error.message });
      }

      const product = data;
      return createResponse(200, {
        success: true,
        product: {
          ...product,
          images: product.images || (product.image ? [product.image] : []),
          subCategory: product.sub_category
        }
      });
    }

    // DELETE /products/:id - Delete product
    if (event.httpMethod === 'DELETE') {
      const path = event.path.replace('/.netlify/functions/products', '');
      const pathParts = path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id) {
        return createResponse(400, { error: 'Product ID is required' });
      }

      const { data, error } = await getSupabaseClient()
        .from('products')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') return createResponse(404, { error: 'Product not found' });
        return createResponse(500, { error: 'Database error', details: error.message });
      }

      return createResponse(200, { success: true, message: 'Product deleted' });
    }

    return createResponse(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Products API error:', error);
    return createResponse(500, { error: 'Internal server error', message: error.message });
  }
};
