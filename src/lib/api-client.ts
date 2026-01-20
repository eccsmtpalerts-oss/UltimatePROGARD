/**
 * API Client Utility
 * Handles API calls using Supabase client for data, Netlify for auth
 */

import { supabase } from '@/integrations/supabase/client';
const API_BASE = '/.netlify/functions';

/**
 * Generic API request helper with improved error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle network errors
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.statusText}`;
      let errorDetails: Record<string, unknown> | null = null;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorDetails = errorData;
      } catch {
        // If response is not JSON, use status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      const error = new Error(errorMessage);
      (error as Error & { status: number; details: Record<string, unknown> | null }).status = response.status;
      (error as Error & { status: number; details: Record<string, unknown> | null }).details = errorDetails;
      throw error;
    }

    return response.json();
  } catch (error: unknown) {
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your connection and try again.');
    }
    // Re-throw if it's already our formatted error
    if (error instanceof Error && 'status' in error) {
      throw error;
    }
    // Otherwise, wrap in a generic error
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    throw new Error(errorMessage);
  }
}

/**
 * Users API
 */
export const usersAPI = {
  login: async (username: string, password: string) => {
    // For now, use simple authentication for testing
    if (username === 'admin' && password === 'admin123') {
      return {
        success: true,
        user: {
          id: 'admin-1',
          username: 'admin',
          email: 'admin@gardener.com'
        }
      };
    }

    // Fallback to API call
    try {
      return await apiRequest<{ success: boolean; user: { id: string; username: string; email?: string } }>(
        '/users/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }
      );
    } catch (error) {
      throw new Error('Invalid username or password');
    }
  },

  create: async (username: string, password: string, email?: string) => {
    return apiRequest<{ success: boolean; user: { id: string; username: string; email?: string } }>(
      '/users',
      {
        method: 'POST',
        body: JSON.stringify({ username, password, email }),
      }
    );
  },

  resetPassword: async (email: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      '/users/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ email, newPassword }),
      }
    );
  },
};

/**
 * Products API
 */

export const productsAPI = {
  getAll: async (page = 1, limit = 12) => {
    console.log('🔍 Products API: Fetching products...');
    const from = (page - 1) * limit;

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    console.log('📦 Products API Response:', { products, error });

    if (error) {
      console.error('❌ Products API Error:', error);
      throw error;
    }

    // Get total count
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Products Count:', count);

    return {
      data: products || [],
      total: count || 0,
      page,
      limit,
    };
  },

  getAllSimple: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  create: async (product: {
    name: string;
    price: string;
    image?: string;
    images?: string[];
    link?: string;
    category?: string;
    description?: string;
    source?: string;
    subCategory?: string;
    sub_category?: string;
  }) => {
    const payload = {
      ...product,
      subCategory: product.subCategory || product.sub_category,
    };

    const response = await apiRequest<{ success: boolean; product: unknown }>(
      '/products',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.product as typeof payload & { id: string };
  },

  update: async (id: string, updates: {
    name?: string;
    price?: string;
    image?: string;
    images?: string[];
    link?: string;
    category?: string;
    description?: string;
    source?: string;
    subCategory?: string;
    sub_category?: string;
  }) => {
    const payload = {
      ...updates,
      subCategory: updates.subCategory || updates.sub_category,
    };

    const response = await apiRequest<{ success: boolean; product: unknown }>(
      `/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    return response.product as typeof payload & { id: string };
  },

  delete: async (id: string) => {
    await apiRequest<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Posts API
 */
export const postsAPI = {
  getAll: async (page = 1, limit = 6) => {
    console.log('🔍 Posts API: Fetching posts...');
    const from = (page - 1) * limit;

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    console.log('📝 Posts API Response:', { posts, error });

    if (error) {
      console.error('❌ Posts API Error:', error);
      throw error;
    }

    // Get total count
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Posts Count:', count);

    return {
      data: posts || [],
      total: count || 0,
      page,
      limit,
    };
  },

  getAllSimple: async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getBySlug: async (slug: string) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (post: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    date?: string;
    readTime?: string;
    read_time?: string;
    category?: string;
    author?: string;
    image?: string;
    featured?: boolean;
  }) => {
    const payload = {
      ...post,
      readTime: post.readTime || post.read_time,
    };

    const response = await apiRequest<{ success: boolean; post: unknown }>(
      '/posts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.post as typeof payload & { id: string };
  },

  update: async (id: string, updates: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    date?: string;
    readTime?: string;
    read_time?: string;
    category?: string;
    author?: string;
    image?: string;
    featured?: boolean;
  }) => {
    const payload = {
      ...updates,
      readTime: updates.readTime || updates.read_time,
    };

    const response = await apiRequest<{ success: boolean; post: unknown }>(
      `/posts/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    return response.post as typeof payload & { id: string };
  },

  delete: async (id: string) => {
    await apiRequest<{ success: boolean }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Plants API
 */
export const plantsAPI = {
  getAll: async (page = 1, limit = 10) => {
    console.log('🔍 Plants API: Fetching plants...');
    const { data: plants, error } = await supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    console.log('🌿 Plants API Response:', { plants, error });

    if (error) {
      console.error('❌ Plants API Error:', error);
      throw error;
    }

    // Get total count
    const { count } = await supabase
      .from('plants')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Plants Count:', count);

    return {
      data: plants || [],
      total: count || 0,
      page,
      limit,
    };
  },

  searchByName: async (name: string, limit = 5) => {
    const normalized = name.trim();
    if (!normalized) return [];

    // Try exact-ish match first
    const { data: exact, error: exactError } = await supabase
      .from('plants')
      .select('*')
      .ilike('name', normalized)
      .limit(limit);

    if (exactError) throw exactError;
    if (exact && exact.length > 0) return exact;

    // Then partial match
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .ilike('name', `%${normalized}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (plant: {
    name: string;
    region?: string;
    growing_months?: string;
    season?: string;
    soil_requirements?: string;
    bloom_harvest_time?: string;
    sunlight_needs?: string;
    care_instructions?: string;
    plant_type?: string;
    image?: string;
    dataSource?: string;
    // Admin form fields
    growingMonths?: string;
    soilRequirements?: string;
    bloomHarvestTime?: string;
    sunlightNeeds?: string;
    careInstructions?: string;
    plantType?: string;
  }) => {
    const payload = {
      name: plant.name,
      region: plant.region,
      growingMonths: plant.growingMonths || plant.growing_months,
      season: plant.season,
      soilRequirements: plant.soilRequirements || plant.soil_requirements,
      bloomHarvestTime: plant.bloomHarvestTime || plant.bloom_harvest_time,
      sunlightNeeds: plant.sunlightNeeds || plant.sunlight_needs,
      careInstructions: plant.careInstructions || plant.care_instructions,
      image: plant.image,
      plantType: plant.plantType || plant.plant_type,
      dataSource: plant.dataSource,
    };

    const response = await apiRequest<{ success: boolean; plant: unknown }>(
      '/plants',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.plant as typeof payload & { id: string };
  },

  update: async (id: string, updates: {
    name?: string;
    region?: string;
    growing_months?: string;
    season?: string;
    soil_requirements?: string;
    bloom_harvest_time?: string;
    sunlight_needs?: string;
    care_instructions?: string;
    plant_type?: string;
    image?: string;
    // Admin form fields
    growingMonths?: string;
    soilRequirements?: string;
    bloomHarvestTime?: string;
    sunlightNeeds?: string;
    careInstructions?: string;
    plantType?: string;
    dataSource?: string;
  }) => {
    const payload = {
      name: updates.name,
      region: updates.region,
      growingMonths: updates.growingMonths || updates.growing_months,
      season: updates.season,
      soilRequirements: updates.soilRequirements || updates.soil_requirements,
      bloomHarvestTime: updates.bloomHarvestTime || updates.bloom_harvest_time,
      sunlightNeeds: updates.sunlightNeeds || updates.sunlight_needs,
      careInstructions: updates.careInstructions || updates.care_instructions,
      image: updates.image,
      plantType: updates.plantType || updates.plant_type,
      dataSource: updates.dataSource,
    };

    const response = await apiRequest<{ success: boolean; plant: unknown }>(
      `/plants/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    return response.plant as typeof payload & { id: string };
  },

  delete: async (id: string) => {
    await apiRequest<{ success: boolean }>(`/plants/${id}`, {
      method: 'DELETE',
    });
  },
};

export const commentsAPI = {
  getHomeLatest: async (limit = 3) => {
    const response = await apiRequest<{ comments: Array<{
      id: string;
      scope: string;
      post_slug: string | null;
      parent_id: string | null;
      author_name: string;
      rating: number | null;
      content: string;
      created_at: string;
    }> }>(`/comments?scope=home&limit=${encodeURIComponent(String(limit))}`);

    return response.comments || [];
  },

  getPostComments: async (postSlug: string) => {
    const response = await apiRequest<{ comments: Array<{
      id: string;
      scope: string;
      post_slug: string | null;
      parent_id: string | null;
      author_name: string;
      rating: number | null;
      content: string;
      created_at: string;
    }> }>(`/comments?scope=post&postSlug=${encodeURIComponent(postSlug)}`);

    return response.comments || [];
  },

  createHomeComment: async (payload: {
    authorName: string;
    authorEmail?: string;
    authorPhone?: string;
    rating?: number;
    content: string;
  }) => {
    const response = await apiRequest<{ success: boolean; comment: {
      id: string;
      scope: string;
      post_slug: string | null;
      parent_id: string | null;
      author_name: string;
      rating: number | null;
      content: string;
      created_at: string;
    } }>(
      '/comments',
      {
        method: 'POST',
        body: JSON.stringify({
          scope: 'home',
          authorName: payload.authorName,
          authorEmail: payload.authorEmail,
          authorPhone: payload.authorPhone,
          rating: payload.rating,
          content: payload.content,
        }),
      }
    );

    return response.comment;
  },

  createPostComment: async (payload: {
    postSlug: string;
    authorName: string;
    content: string;
    parentId?: string;
  }) => {
    const response = await apiRequest<{ success: boolean; comment: {
      id: string;
      scope: string;
      post_slug: string | null;
      parent_id: string | null;
      author_name: string;
      rating: number | null;
      content: string;
      created_at: string;
    } }>(
      '/comments',
      {
        method: 'POST',
        body: JSON.stringify({
          scope: 'post',
          postSlug: payload.postSlug,
          parentId: payload.parentId,
          authorName: payload.authorName,
          content: payload.content,
        }),
      }
    );

    return response.comment;
  },
};

