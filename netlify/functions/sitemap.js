import { querySupabase } from './utils/db.js';

export const handler = async () => {
  const BASE_URL = 'https://www.perfectgardener.in';
  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await querySupabase('posts', {
      select: 'slug, updated_at, created_at',
      filters: { slug: { not: null } },
      orderBy: { column: 'created_at', ascending: false }
    });

    const posts = result.rows || [];

    const staticPages = [
      { path: '/', priority: '1.0', freq: 'weekly' },
      { path: '/products', priority: '0.9', freq: 'weekly' },
      { path: '/posts', priority: '0.9', freq: 'weekly' },
      { path: '/about', priority: '0.8', freq: 'monthly' },
      { path: '/contact', priority: '0.8', freq: 'monthly' },
      { path: '/privacy', priority: '0.5', freq: 'yearly' },
      { path: '/tools', priority: '0.8', freq: 'monthly' },
      { path: '/tools/pot-calculator', priority: '0.7', freq: 'monthly' },
      { path: '/tools/bloom-calculator', priority: '0.7', freq: 'monthly' },
      { path: '/tools/budget-planner', priority: '0.7', freq: 'monthly' },
      { path: '/tools/flower-calendar', priority: '0.7', freq: 'monthly' }
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    staticPages.forEach(p => {
      sitemap += `
  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
    });

    // Blog posts
    posts.forEach(post => {
      const lastmod = post.updated_at
        ? post.updated_at.split('T')[0]
        : post.created_at
          ? post.created_at.split('T')[0]
          : today;

      sitemap += `
  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    sitemap += `\n</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=300'
      },
      body: sitemap
    };

  } catch (err) {
    console.error('Sitemap error:', err);

    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      body: fallback
    };
  }
};
