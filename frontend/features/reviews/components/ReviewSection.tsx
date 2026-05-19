'use client';

import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { reviewsApi, type Review } from '../api';
import { useToast } from '@/components/ui/use-toast';

interface ReviewSectionProps {
  doctorId?: number;
  organizationId?: number;
}

export function ReviewSection({ doctorId, organizationId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsLoadingSubmitting] = useState(false);
  const { toast } = useToast();

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const data = await reviewsApi.listReviews({
        doctor_id: doctorId,
        organization_id: organizationId,
      });
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [doctorId, organizationId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: 'Error',
        description: 'Please select a rating.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoadingSubmitting(true);
      await reviewsApi.createReview({
        doctor: doctorId,
        organization: organizationId,
        rating,
        comment,
      });
      toast({
        title: 'Success',
        description: 'Review submitted successfully!',
      });
      setRating(0);
      setComment('');
      loadReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to submit review.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubmitting(false);
    }
  };

  // Reviews List
  const reviewList = Array.isArray(reviews) ? reviews : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Patient Reviews ({reviewList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Review Form */}
          <form onSubmit={handleSubmitReview} className="space-y-4 rounded-lg border p-4 bg-gray-50 dark:bg-slate-900">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Comment</label>
              <Textarea
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Reviews List */}
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center py-4 text-muted-foreground">Loading reviews...</p>
            ) : reviewList.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No reviews yet. Be the first to review!</p>
            ) : (
              reviewList.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user_email}`} />
                        <AvatarFallback>{review.user_email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{review.user_email}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= review.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 pl-13 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                  {review.is_verified_purchase && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Visit
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
