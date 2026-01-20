import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Reply, Send } from "lucide-react";
import { commentsAPI } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface CommentSectionProps {
  postSlug: string;
}

export function CommentSection({ postSlug }: CommentSectionProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Array<{
    id: string;
    author: string;
    content: string;
    date: string;
    parentId?: string;
  }>>([]);
  const [newComment, setNewComment] = useState({ author: "", content: "" });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadComments = async () => {
      try {
        const rows = await commentsAPI.getPostComments(postSlug);
        if (!mounted) return;
        setComments(
          rows.map((r) => ({
            id: r.id,
            author: r.author_name,
            content: r.content,
            date: r.created_at,
            parentId: r.parent_id || undefined,
          }))
        );
      } catch (error) {
        console.error('❌ Failed to load post comments:', error);
      }
    };

    loadComments();
    return () => {
      mounted = false;
    };
  }, [postSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.author.trim() || !newComment.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await commentsAPI.createPostComment({
        postSlug,
        authorName: newComment.author,
        content: newComment.content,
      });

      setNewComment({ author: "", content: "" });

      const rows = await commentsAPI.getPostComments(postSlug);
      setComments(
        rows.map((r) => ({
          id: r.id,
          author: r.author_name,
          content: r.content,
          date: r.created_at,
          parentId: r.parent_id || undefined,
        }))
      );

      toast({
        title: "Comment Added",
        description: "Your comment has been posted!",
      });
    } catch (error: unknown) {
      console.error('❌ Failed to submit post comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to post comment.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply.",
        variant: "destructive",
      });
      return;
    }

    try {
      await commentsAPI.createPostComment({
        postSlug,
        parentId,
        authorName: "Guest",
        content: replyContent,
      });

      setReplyContent("");
      setReplyingTo(null);

      const rows = await commentsAPI.getPostComments(postSlug);
      setComments(
        rows.map((r) => ({
          id: r.id,
          author: r.author_name,
          content: r.content,
          date: r.created_at,
          parentId: r.parent_id || undefined,
        }))
      );

      toast({
        title: "Reply Added",
        description: "Your reply has been posted!",
      });
    } catch (error: unknown) {
      console.error('❌ Failed to submit reply:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to post reply.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const displayedComments = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<string, typeof comments>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Comment Form */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-display font-bold">Leave a Comment</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Your Name"
              value={newComment.author}
              onChange={(e) => setNewComment({ ...newComment, author: e.target.value })}
              required
              className="bg-background"
            />
            <Textarea
              placeholder="Write your comment here..."
              value={newComment.content}
              onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
              required
              rows={4}
              className="bg-background resize-none"
            />
            <div className="flex justify-center">
              <Button type="submit" className="w-full sm:w-auto">
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      {comments.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-display font-bold mb-4">
              Comments ({comments.length})
            </h3>
            
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
              {displayedComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={repliesByParent[comment.id] || []}
                  onReply={() => setReplyingTo(comment.id)}
                  isReplying={replyingTo === comment.id}
                  replyContent={replyContent}
                  onReplyChange={setReplyContent}
                  onReplySubmit={() => handleReply(comment.id)}
                  onCancelReply={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {comments.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: {
    id: string;
    author: string;
    content: string;
    date: string;
    parentId?: string;
  };
  replies: Array<{
    id: string;
    author: string;
    content: string;
    date: string;
    parentId?: string;
  }>;
  onReply: () => void;
  isReplying: boolean;
  replyContent: string;
  onReplyChange: (value: string) => void;
  onReplySubmit: () => void;
  onCancelReply: () => void;
}

function CommentItem({
  comment,
  replies,
  onReply,
  isReplying,
  replyContent,
  onReplyChange,
  onReplySubmit,
  onCancelReply,
}: CommentItemProps) {
  return (
    <div className="border-b border-border pb-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-semibold text-sm">
            {comment.author.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{comment.author}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.date), { addSuffix: true })}
            </span>
          </div>
          <p className="text-foreground/90 mb-2 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          
          {/* Reply Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReply}
            className="h-8 text-xs"
          >
            <Reply className="w-3 h-3 mr-1" />
            Reply
          </Button>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3 ml-4 space-y-2">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => onReplyChange(e.target.value)}
                rows={2}
                className="bg-background resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onReplySubmit}>
                  <Send className="w-3 h-3 mr-1" />
                  Post Reply
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelReply}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-3 ml-4 space-y-3 border-l-2 border-primary/20 pl-4">
              {replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-foreground font-semibold text-xs">
                      {reply.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">{reply.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.date), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

