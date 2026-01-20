CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(20) NOT NULL,
  post_slug VARCHAR(500),
  parent_id UUID,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  author_phone VARCHAR(50),
  rating INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_scope_created_at ON comments(scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_slug_created_at ON comments(post_slug, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
