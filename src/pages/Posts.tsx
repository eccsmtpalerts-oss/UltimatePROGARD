
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, Filter, Search, Sparkles, X } from "lucide-react";
import { BackToTop } from "@/components/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postsAPI } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { filterWithAutoCorrect } from "@/lib/search-utils";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readTime: string;
  category: string;
  author: string;
  image?: string;
  featured?: boolean;
  slug?: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const Posts = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [suggestedTerm, setSuggestedTerm] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        setIsLoading(true);
        const res = await postsAPI.getAll(1, 1000);
        const normalized = (res.data || []).map((p: any): Post => ({
          id: String(p.id),
          title: String(p.title || ""),
          excerpt: String(p.excerpt || ""),
          content: String(p.content || ""),
          date: String(p.date || new Date().toISOString().split("T")[0]),
          readTime: String(p.readTime || p.read_time || "5 min read"),
          category: String(p.category || "Uncategorized"),
          author: String(p.author || "Perfect Gardener"),
          image: p.image || undefined,
          featured: Boolean(p.featured),
          slug: p.slug || undefined,
        }));

        if (!cancelled) {
          setAllPosts(normalized);
        }
      } catch (e) {
        if (!cancelled) {
          setAllPosts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();
    const interval = setInterval(loadPosts, 300000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(allPosts.map((p) => p.category).filter(Boolean)))];
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    const byCategory = allPosts.filter((post) => selectedCategory === "All" || post.category === selectedCategory);

    if (!searchQuery.trim()) {
      setSuggestedTerm(null);
      setShowSuggestion(false);
      return byCategory;
    }

    const { filtered, suggestedTerm: suggestion } = filterWithAutoCorrect(
      byCategory,
      searchQuery,
      (post) => `${post.title} ${post.excerpt || ""}`,
      0.5
    );

    setSuggestedTerm(suggestion);
    setShowSuggestion(Boolean(suggestion && suggestion.toLowerCase() !== searchQuery.toLowerCase()));
    return filtered as Post[];
  }, [allPosts, searchQuery, selectedCategory]);

  const featuredPosts = filteredPosts.filter((p) => p.featured);
  const regularPosts = filteredPosts.filter((p) => !p.featured);
  const hasActiveFilters = searchQuery || selectedCategory !== "All";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" className="pt-20">
        <section className="py-8 md:py-12 bg-gradient-to-br from-primary/10 to-accent/5 border-b border-border">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">Gardening Blog</h1>
            <p className="text-muted-foreground max-w-2xl">Tips, guides, and insights to help you grow a beautiful garden.</p>
          </div>
        </section>

        <section className="py-6 bg-muted/30 border-b border-border sticky top-16 z-40">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
                {showSuggestion && suggestedTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50">
                    <Alert className="bg-primary/10 border-primary/20">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <AlertDescription className="text-sm">
                        Did you mean <strong>{suggestedTerm}</strong>?{" "}
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary underline"
                          onClick={() => {
                            setSearchQuery(suggestedTerm);
                            setShowSuggestion(false);
                          }}
                        >
                          Use this instead
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <Button variant="outline" className="md:hidden" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                Categories
              </Button>

              <div className="hidden md:flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="md:hidden mt-4 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowFilters(false);
                    }}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {filteredPosts.length} articles</p>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  {selectedCategory !== "All" && <Badge variant="secondary">{selectedCategory}</Badge>}
                  {searchQuery && <Badge variant="secondary">"{searchQuery}"</Badge>}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-6 pb-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
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
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-12">
                {featuredPosts.length > 0 && selectedCategory === "All" && !searchQuery && (
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                      ⭐ Featured Articles
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                      {featuredPosts.map((post, index) => (
                        <PostCard key={post.id} post={post} index={index} featured />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  {featuredPosts.length > 0 && selectedCategory === "All" && !searchQuery && (
                    <h2 className="text-xl font-display font-bold text-foreground mb-6">All Articles</h2>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {(selectedCategory === "All" && !searchQuery ? regularPosts : filteredPosts).map((post, index) => (
                      <PostCard key={post.id} post={post} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-muted/50 rounded-xl">
                <p className="text-xl font-medium text-foreground mb-2">No articles found</p>
                <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
                <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
              </div>
            )}
          </div>
        </section>

        <section className="py-12 bg-muted/30 border-t border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-display font-bold text-foreground mb-3">Ready to Start Gardening?</h2>
            <p className="text-muted-foreground mb-6">Check out our free gardening tools to plan your garden.</p>
            <Button asChild size="lg">
              <Link to="/tools" className="group">
                Explore Tools
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

interface PostCardProps {
  post: Post;
  index: number;
  featured?: boolean;
}

const PostCard = ({ post, index, featured }: PostCardProps) => {
  const postUrl = post.slug ? `/blog/${post.slug}` : `/posts`;

  return (
    <Link to={postUrl}>
      <article
        className={cn(
          "group bg-card rounded-xl border overflow-hidden card-hover animate-fade-in flex flex-col cursor-pointer transition-all hover:shadow-lg",
          featured ? "border-primary/30" : "border-border"
        )}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {post.image && (
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

        <div className="p-6 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={featured ? "default" : "secondary"} className="text-xs">{post.category}</Badge>
            {featured && <span className="text-xs text-primary font-medium">Featured</span>}
          </div>

          <h3 className="font-display font-semibold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-grow">{post.excerpt}</p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default Posts;
