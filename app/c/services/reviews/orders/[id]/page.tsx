"use client";

import { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Clock, Copy, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getReviewOrderDetailAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";
import { Button } from "@/components/ui/button";

export default function ReviewOrderDetailPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success("Copied to clipboard");
  };

  const copyImageUrl = async (imageUrl: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a ClipboardItem and write to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      success("Image copied to clipboard");
    } catch (err) {
      // If copying image fails, fallback to copying URL
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
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      const result = await getReviewOrderDetailAction(orderId);

      if (result.success) {
        console.log("=== ORDER DATA ===");
        console.log(JSON.stringify(result.data, null, 2));
        console.log("===================");
        setOrder(result.data);
      } else {
        error(result.error || "Failed to load order");
        router.push("/c/services/reviews/orders");
      }
      setLoading(false);
    };

    loadOrder();
  }, [user, orderId]);

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold flex-1">
          {t("reviews.reviewOrder", "Review Order")}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Order Details Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow space-y-4">
        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.orderType", "Order Type")}
            </h3>
            <p className="font-medium">
              {order.orderType === "COMMENT" ? "Reactions" :
               order.orderType === "REVIEW" ? "Reviews" :
               order.orderType === "COMMENT_WITH_PHOTO" ? "Photo + Reviews" :
               order.orderType?.replace(/_/g, ' ')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.platform", "Platform")}
            </h3>
            <p className="font-medium">{order.reviewType}</p>
          </div>

          {order.orderType === "COMMENT" && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {t("reviews.reaction", "Reaction")}
              </h3>
              <p className={`font-medium text-lg ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                {getReactionEmoji(order.reactionType || 'LIKE')}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.quantity", "Quantity")}
            </h3>
            <p className="font-medium">{order.quantity}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.creditsConsumed", "Credits Consumed")}
            </h3>
            <p className="font-medium">{order.creditsConsumed}</p>
          </div>
        </div>

        {order.facebookUrl && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {t("reviews.facebookUrl", "Facebook URL")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(order.facebookUrl)}
                className="shrink-0 gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <a
              href={order.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#168BB0] hover:underline block"
            >
              {order.facebookUrl}
            </a>
          </div>
        )}

        {/* Multi-URL Orders - Display URLs with their review content */}
        {order.reviewUrls && order.reviewUrls.length > 0 && (
          <div>
            {/* URLs Section */}
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                {t("reviews.urls", "URLs")} ({order.reviewUrls.length})
              </h3>
              <div className="space-y-3">
                {order.reviewUrls.map((urlItem: any, index: number) => (
                  <div key={urlItem.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-900">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        urlItem.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        urlItem.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {urlItem.status}
                      </span>
                      <span className="text-xs text-zinc-500 font-medium">
                        {t("reviews.quantity", "Qty")}: {urlItem.quantity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={urlItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#168BB0] hover:underline break-all flex-1"
                      >
                        {urlItem.url}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(urlItem.url)}
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Review Content for this URL - Display each review separately */}
                    {urlItem.reviewContent && urlItem.reviewContent.trim() && (() => {
                      // Try to parse as JSON array
                      let reviews: string[] = [];
                      try {
                        const parsed = JSON.parse(urlItem.reviewContent);
                        if (Array.isArray(parsed)) {
                          reviews = parsed;
                        } else {
                          reviews = [urlItem.reviewContent];
                        }
                      } catch {
                        // Not JSON, treat as single review
                        reviews = [urlItem.reviewContent];
                      }

                      return reviews.length > 0 ? (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                            {t("reviews.reviewContent", "Review Content")}
                          </h4>
                          <div className="space-y-2">
                            {reviews.map((review, reviewIndex) => (
                              <div key={reviewIndex} className="bg-white dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-medium text-zinc-400">
                                    #{reviewIndex + 1}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(review)}
                                    className="shrink-0 h-6 px-2"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-sm whitespace-pre-wrap mt-1 break-all">
                                  {review}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {urlItem.proofOfCompletion && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={urlItem.proofOfCompletion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#168BB0] hover:underline"
                        >
                          {t("reviews.viewProof", "View Proof")}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyImageUrl(urlItem.proofOfCompletion)}
                          className="shrink-0 h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Content (for REVIEW orders) - OLD SYSTEM, keep for backwards compatibility */}
        {!order.reviewUrls || order.reviewUrls.length === 0 ? (
          <>
            {order.orderType === "REVIEW" && order.content && order.content.trim() && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {t("reviews.reviewContent", "Review Content")}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(order.content)}
                    className="shrink-0 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{order.content}</p>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Comment Text (for COMMENT and COMMENT_WITH_PHOTO orders) */}
        {(order.orderType === "COMMENT" || order.orderType === "COMMENT_WITH_PHOTO") && order.commentText && order.commentText.trim() && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {t("reviews.commentText", "Comment Text")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(order.commentText)}
                className="shrink-0 gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{order.commentText}</p>
            </div>
          </div>
        )}

        {/* Photos (for COMMENT_WITH_PHOTO orders) */}
        {order.orderType === "COMMENT_WITH_PHOTO" && order.photoUrls && order.photoUrls.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {t("reviews.photos", "Photos")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {order.photoUrls.map((url: string, index: number) => {
                // Extract filename from URL or use default
                const filename = `photo-${index + 1}.jpg`;
                return (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
                      onError={(e) => {
                        console.error(`Failed to load photo ${index + 1}:`, url);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Copy button - top right */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyImageUrl(url)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                      title="Copy image"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {/* Download button - bottom right */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadImage(url, filename)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                      title="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {order.reviewInstructions && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {t("reviews.instructions", "Additional Instructions")}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {order.reviewInstructions}
            </p>
          </div>
        )}
      </div>

      {/* Timeline Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
        <h3 className="font-semibold mb-4">
          {t("reviews.timeline", "Timeline")}
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">{t("reviews.created", "Created")}:</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          {order.updatedAt !== order.createdAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("reviews.lastUpdated", "Last Updated")}:</span>
              <span>{formatDateTime(order.updatedAt)}</span>
            </div>
          )}
          {order.completedAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("reviews.completed", "Completed")}:</span>
              <span className="text-green-600 font-medium">
                {formatDateTime(order.completedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Info */}
      {order.status === "PENDING" && (
        <div className="bg-gradient-to-r from-[#168BB0] to-[#1a9dc4] dark:from-[#168BB0]/90 dark:to-[#1a9dc4]/90 rounded-lg p-5 shadow-md border border-[#168BB0]/30">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 dark:bg-white/10 rounded-full p-2 animate-pulse">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-white">
                {t("reviews.pendingInfo", "Your order is pending assignment to an employee. You'll be notified when work begins.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {order.status === "IN_PROGRESS" && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t("reviews.inProgressInfo", "An employee is working on your order. You'll be notified when it's completed.")}
          </p>
        </div>
      )}
    </div>
  );
}
