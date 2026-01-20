
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postStorage, AdminPost } from "@/lib/admin-storage";
import { postsAPI } from "@/lib/api-client";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image?: string;
  slug?: string;
}

interface PostsSectionProps {
  limit?: number;
}

export function PostsSection({ limit = 3 }: PostsSectionProps) {
  console.log('🔍 PostsSection: Component loading...');
  
  // Use infinite scroll for posts, but limit to specified number
  const {
    items,
    isLoading,
  } = useInfiniteScroll({
    queryKey: ['posts'],
    fetchFunction: (page, limit) => postsAPI.getAll(page, limit),
    initialLimit: limit,
  });

  console.log('📝 PostsSection: Infinite scroll items:', { items, isLoading });

  // Get posts from items
  const posts = items.slice(0, limit);
  
  console.log('✅ PostsSection: Final posts array:', posts);

  return (
    <section id="posts" className="py-8 md:py-16 relative overflow-hidden wavy-top wavy-bottom">
      {/* Premium Background Gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, hsl(199 85% 70% / 0.08) 0%, transparent 70%)"
        }}
      />
      
      <div className="section-container">
        {/* Intro Text */}
        <div className="text-center mb-8">
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We write about real gardening experiences and practical advice that we've tested ourselves. These posts cover everything from beginner tips to advanced techniques.
          </p>
        </div>

        {/* Premium Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6">
            <span className="gradient-text">Latest Posts</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Insights and tips from Perfect Gardener to help your garden flourish.
          </p>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-4">
                <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                </div>
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {posts.map((post, index) => {
              const postUrl = post.slug ? `/blog/${post.slug}` : `/posts`;
              return (
                <Link key={post.id} to={postUrl}>
                  <article
                    className={cn(
                      "group glass-card rounded-2xl overflow-hidden animate-fade-in transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] cursor-pointer"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Thumbnail Image */}
                    {post.image && post.image.startsWith("http") &&(
                      <div className="relative w-full aspect-video overflow-hidden bg-muted">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-contain block group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    )}
                    
                    <div className="p-8">
                      <h3 className="font-display font-bold text-xl text-foreground mb-4 line-clamp-2 group-hover:gradient-text transition-all duration-300">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-base mb-6 line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {/* Premium Actions */}
        <div className="flex flex-wrap justify-center gap-4 mt-16">
          <Button asChild variant="gradient" size="lg" className="px-8 py-6 text-lg font-semibold">
            <Link to="/posts" className="group">
              View all posts
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg font-semibold">
            <Link to="/tools">
              Explore Tools
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
