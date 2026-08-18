"use client";

import { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Clock, Copy, Download, Package, ChevronDown, ChevronUp, Link as LinkIcon, FileText, ImageIcon, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getReviewOrderDetailAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ReviewOrderDetailPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  // Collapsible states
  const [showUrls, setShowUrls] = useState(true);
  const [showReviews, setShowReviews] = useState(true);
  const [showOrderDetails, setShowOrderDetails] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success("Copied to clipboard");
  };

  const copyImageUrl = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      success("Image copied to clipboard");
    } catch (err) {
      copyToClipboard(imageUrl);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string = "image.jpg") => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success("Image downloaded");
    } catch (err) {
      window.open(imageUrl, '_blank');
    }
  };

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      const result = await getReviewOrderDetailAction(orderId);

      if (result.success) {
        setOrder(result.data);
      } else {
        error(result.error || "Failed to load order");
        router.push("/c/services/reviews/orders");
      }
      setLoading(false);
    };

    loadOrder();
  }, [user, orderId, error, router]);

  if (loading) return <LoadingScreen />;
  if (!order) return (
    <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
      <div className="text-center">
        <p className="text-sm text-zinc-400">Order not found</p>
        <button
          onClick={() => router.push("/c/services/reviews/orders")}
          className="mt-4 px-4 py-2 bg-[#168BB0] text-white rounded-lg text-sm"
        >
          Back to Orders
        </button>
      </div>
    </div>
  );

  const hasUrls = order.reviewUrls && order.reviewUrls.length > 0;
  const hasReviews = (order.orderType === "REVIEW" && order.content) ||
                    (order.reviewUrls && order.reviewUrls.some((u: any) => u.reviewContent));
  const hasPhotos = order.orderType === "COMMENT_WITH_PHOTO" && order.photoUrls && order.photoUrls.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
          >
            ←
          </button>
          <h1 className="text-xl font-bold flex-1 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#168BB0]" />
            {order.businessName || t("reviews.reviewOrder", "Review Order")}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* URLs Section - FIRST, Prominently Displayed */}
      {hasUrls ? (
        <Card className="p-3 border-2 border-blue-200 dark:border-blue-800">
          <button
            onClick={() => setShowUrls(!showUrls)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-base">URLs ({order.reviewUrls.length})</span>
            </div>
            {showUrls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showUrls && (
            <div className="grid grid-cols-1 gap-2">
              {order.reviewUrls.map((urlItem: any, index: number) => (
                <div key={urlItem.id} className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 text-xs group relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">#{index + 1}</span>
                    <span className="text-zinc-500 font-medium">×{urlItem.quantity}</span>
                    {urlItem.reactionType && (
                      <span className="text-lg">{urlItem.reactionType === "LIKE" ? "👍" :
                            urlItem.reactionType === "LOVE" ? "❤️" :
                            urlItem.reactionType === "CARE" ? "🤗" :
                            urlItem.reactionType === "WOW" ? "😮" :
                            urlItem.reactionType}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={urlItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#168BB0] hover:underline truncate flex-1 font-medium"
                    >
                      {urlItem.url}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(urlItem.url)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-white dark:bg-zinc-800"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : order.facebookUrl ? (
        <Card className="p-3 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-base">Facebook URL</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
            <a
              href={order.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#168BB0] hover:underline truncate flex-1 text-sm font-medium"
            >
              {order.facebookUrl}
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(order.facebookUrl)}
              className="h-6 w-6 p-0 bg-white dark:bg-zinc-800"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Order Details - Compact, Collapsible */}
      <Card className="p-3">
        <button
          onClick={() => setShowOrderDetails(!showOrderDetails)}
          className="w-full flex items-center justify-between mb-2 hover:opacity-70"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <span className="font-semibold text-sm">Order Details</span>
          </div>
          {showOrderDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showOrderDetails && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-zinc-500">Type</p>
              <p className="font-medium">
                {order.orderType === "COMMENT" ? "Reactions" :
                 order.orderType === "REVIEW" ? "Reviews" :
                 order.orderType === "COMMENT_WITH_PHOTO" ? "Photo+" :
                 order.orderType?.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Platform</p>
              <p className="font-medium">{order.reviewType}</p>
            </div>
            <div>
              <p className="text-zinc-500">Qty</p>
              <p className="font-medium">{order.quantity}</p>
            </div>
            <div>
              <p className="text-zinc-500">Credits</p>
              <p className="font-medium">{order.creditsConsumed}</p>
            </div>
            {order.orderType === "COMMENT" && order.reactionType && (
              <div>
                <p className="text-zinc-500">Reaction</p>
                <p className={`font-medium text-lg ${getReactionBadgeClasses(order.reactionType)}`}>
                  {getReactionEmoji(order.reactionType)}
                </p>
              </div>
            )}
            <div>
              <p className="text-zinc-500">Created</p>
              <p className="font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
            {order.completedAt && (
              <div>
                <p className="text-zinc-500">Completed</p>
                <p className="font-medium text-green-600 dark:text-green-400">{formatDateTime(order.completedAt)}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Reviews Section - Compact Grid */}
      {hasUrls && order.reviewUrls.some((u: any) => u.reviewContent) ? (
        <Card className="p-3">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-sm">Reviews</span>
            </div>
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReviews && (
            <div className="space-y-2">
              {order.reviewUrls.map((urlItem: any, urlIndex: number) => {
                if (!urlItem.reviewContent) return null;
                let reviews: string[] = [];
                try {
                  const parsed = JSON.parse(urlItem.reviewContent);
                  if (Array.isArray(parsed)) {
                    reviews = parsed;
                  } else {
                    reviews = [urlItem.reviewContent];
                  }
                } catch {
                  reviews = [urlItem.reviewContent];
                }

                return (
                  <div key={urlItem.id} className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-zinc-500">URL #{urlIndex + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {reviews.map((review, reviewIndex) => (
                        <div key={reviewIndex} className="p-2 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 group relative">
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-zinc-500">#{reviewIndex + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(review)}
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 whitespace-pre-wrap">
                            {review}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : order.orderType === "REVIEW" && order.content ? (
        <Card className="p-3">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-sm">Review Content</span>
            </div>
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReviews && (
            <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-xs group relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(order.content)}
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 absolute top-2 right-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap pr-8">
                {order.content}
              </p>
            </div>
          )}
        </Card>
      ) : null}

      {/* Comment Text */}
      {(order.orderType === "COMMENT" || order.orderType === "COMMENT_WITH_PHOTO") && order.commentText && order.commentText.trim() && (
        <Card className="p-3">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-sm">Comment Text</span>
            </div>
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReviews && (
            <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-xs group relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(order.commentText)}
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 absolute top-2 right-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap pr-8">
                {order.commentText}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Photos Section - Compact Grid */}
      {hasPhotos && (
        <Card className="p-3">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-sm">Photos ({order.photoUrls.length})</span>
            </div>
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReviews && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {order.photoUrls.map((url: string, index: number) => {
                const filename = `photo-${index + 1}.jpg`;
                return (
                  <div key={index} className="relative group">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded border border-zinc-300 dark:border-zinc-700 hover:opacity-80 transition-opacity"
                      />
                    </a>
                    <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                      #{index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyImageUrl(url)}
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadImage(url, filename)}
                      className="absolute bottom-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Instructions - Compact */}
      {order.reviewInstructions && (
        <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">Instructions</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.reviewInstructions}</p>
        </Card>
      )}
    </div>
  );
}
