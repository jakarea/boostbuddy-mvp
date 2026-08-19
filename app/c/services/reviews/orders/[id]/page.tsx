"use client";

import { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Copy, Download, Package, Check, Link as LinkIcon, FileText, ImageIcon, MessageSquare, Coins, ArrowLeft, UserCheck, Clock, AlertCircle } from "lucide-react";
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
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Track "done" state for each item
  const [doneUrls, setDoneUrls] = useState<Set<string>>(new Set());
  const [doneReviews, setDoneReviews] = useState<Set<number>>(new Set());
  const [donePhotos, setDonePhotos] = useState<Set<number>>(new Set());

  const copyToClipboard = (text: string, label: string = "Text") => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  const copyImageUrl = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopiedItem("Image");
      setTimeout(() => setCopiedItem(null), 1500);
    } catch (err) {
      copyToClipboard(imageUrl, "Image URL");
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

  const toggleUrlDone = (urlId: string) => {
    setDoneUrls(prev => {
      const next = new Set(prev);
      if (next.has(urlId)) {
        next.delete(urlId);
      } else {
        next.add(urlId);
      }
      return next;
    });
  };

  const toggleReviewDone = (index: number) => {
    setDoneReviews(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const togglePhotoDone = (index: number) => {
    setDonePhotos(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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
    <>
      {/* CSS for fade animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Copied notification */}
        {copiedItem && (
          <div className="fixed top-20 right-4 z-50" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <Check className="h-3.5 w-3.5" />
              {copiedItem} copied!
            </div>
          </div>
        )}

        {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Order Info Header */}
      <Card className="p-5 bg-gradient-to-r from-zinc-50 to-blue-50 dark:from-zinc-900 dark:to-blue-900/20">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Order ID</p>
            <button
              onClick={() => copyToClipboard(order.id, "Order ID")}
              className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100 break-all hover:text-[#168BB0] dark:hover:text-[#45B0D2] transition-colors flex items-center gap-1"
              title="Click to copy"
            >
              {order.id}
              <Copy className="h-3 w-3 opacity-50" />
            </button>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Type</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {order.orderType === "COMMENT" ? "Reactions" :
               order.orderType === "REVIEW" ? "Reviews" :
               order.orderType === "COMMENT_WITH_PHOTO" ? "Photo + Reviews" :
               order.orderType?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Credits</p>
            <p className="text-sm font-bold text-[#168BB0]">{order.creditsConsumed}</p>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Created</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Assigned Employee</p>
            <div className="flex items-center gap-1.5">
              {order.employees ? (
                <>
                  <UserCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{order.employees.name}</p>
                </>
              ) : order.status === 'PENDING' ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-zinc-500 italic">Unassigned</p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-zinc-400">—</p>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Status</p>
            {/* For CLIENT: display PENDING as "In Progress" */}
            <StatusBadge status={order.status === "PENDING" ? "IN_PROGRESS" : order.status} type="order" />
          </div>
        </div>
      </Card>

      {/* URLs Section */}
      {hasUrls ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-lg">URLs ({order.reviewUrls.length})</h3>
          </div>
          <div className="space-y-2">
            {order.reviewUrls.map((urlItem: any, index: number) => {
              const isDone = doneUrls.has(urlItem.id);
              return (
                <div
                  key={urlItem.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isDone
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <span className="font-medium text-zinc-500 text-sm w-8">#{index + 1}</span>
                  <a
                    href={urlItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#168BB0] hover:underline truncate flex-1 text-sm font-medium"
                  >
                    {urlItem.url}
                  </a>
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">×{urlItem.quantity}</span>
                  {order.orderType === "COMMENT" && urlItem.reactionType && (
                    <span className="text-xl">{urlItem.reactionType === "LIKE" ? "👍" :
                          urlItem.reactionType === "LOVE" ? "❤️" :
                          urlItem.reactionType === "CARE" ? "🤗" :
                          urlItem.reactionType === "WOW" ? "😮" :
                          urlItem.reactionType}</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(urlItem.url, "URL")}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isDone ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleUrlDone(urlItem.id)}
                    className={`h-8 px-3 gap-2 ${
                      isDone
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                        : ''
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Check className="h-4 w-4" />
                        Done
                      </>
                    ) : (
                      'Mark Done'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : order.facebookUrl ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-lg">Facebook URL</h3>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <a
              href={order.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#168BB0] hover:underline truncate flex-1 text-sm font-medium"
            >
              {order.facebookUrl}
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(order.facebookUrl)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Reviews Section - List format like URLs */}
      {hasUrls && order.reviewUrls.some((u: any) => u.reviewContent) ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-lg">Reviews</h3>
          </div>
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
                <div key={urlItem.id} className="col-span-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-zinc-500 text-sm">URL #{urlIndex + 1}</span>
                  </div>
                  <div className="space-y-2">
                    {reviews.map((review, reviewIndex) => {
                      const globalIndex = `${urlIndex}-${reviewIndex}`;
                      const isDone = doneReviews.has(Number(globalIndex));
                      return (
                        <div
                          key={reviewIndex}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isDone
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                              : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <span className="font-medium text-zinc-500 text-sm w-8 shrink-0">#{reviewIndex + 1}</span>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap flex-1">{review}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(review)}
                            className="h-8 w-8 p-0 shrink-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={isDone ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleReviewDone(Number(globalIndex))}
                            className={`h-8 px-3 gap-2 shrink-0 ${
                              isDone
                                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                                : ''
                            }`}
                          >
                            {isDone ? (
                              <>
                                <Check className="h-4 w-4" />
                                Done
                              </>
                            ) : (
                              'Mark Done'
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : order.orderType === "REVIEW" && order.content ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-lg">Review Content</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="font-medium text-zinc-500 text-sm w-8 shrink-0">#1</span>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap flex-1">
                {order.content}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(order.content)}
                className="h-8 w-8 p-0 shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Comment Text */}
      {(order.orderType === "COMMENT" || order.orderType === "COMMENT_WITH_PHOTO") && order.commentText && order.commentText.trim() && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-lg">Comment Text</h3>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {order.commentText}
            </p>
          </div>
        </Card>
      )}

      {/* Photos Section */}
      {hasPhotos && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-lg">Photos ({order.photoUrls.length})</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {order.photoUrls.map((url: string, index: number) => {
              const filename = `photo-${index + 1}.jpg`;
              const isDone = donePhotos.has(index);
              return (
                <div
                  key={index}
                  className={`relative rounded-lg border-2 p-2 transition-colors ${
                    isDone
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full aspect-square object-cover rounded mb-2"
                    />
                  </a>
                  <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyImageUrl(url)}
                    className="absolute top-3 right-3 h-8 w-8 p-0 bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadImage(url, filename)}
                    className="absolute bottom-12 right-3 h-8 w-8 p-0 bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isDone ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePhotoDone(index)}
                    className={`w-full gap-2 ${
                      isDone
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                        : ''
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Check className="h-4 w-4" />
                        Done
                      </>
                    ) : (
                      'Mark Done'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Instructions */}
      {order.reviewInstructions && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">Instructions</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.reviewInstructions}</p>
        </Card>
      )}
      </div>
    </>
  );
}
