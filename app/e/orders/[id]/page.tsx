"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  UserCheck
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import {
  getReviewOrderByIdAction,
  completeReviewOrderAction,
  acceptReviewOrderAction
} from "@/app/actions/employee";

interface ReviewOrder {
  id: string;
  userId: string;
  businessName: string;
  businessUrl?: string;
  facebookUrl?: string;
  orderType: string;
  reviewType: string;
  reviewContent: string;
  reviewInstructions?: string;
  quantity: number;
  creditsConsumed: number;
  status: string;
  assignedEmployeeId?: string;
  assignedAt?: string;
  completedAt?: string;
  completedByEmployeeId?: string;
  proofOfCompletion?: string;
  reactionType?: string;
  createdAt: string;
  updatedAt: string;
  users?: { name: string; email: string };
  employees?: { name: string; email: string };
  comments?: string[];
  commentText?: string;
  photoUrls?: string[][];
  photoReviews?: { text: string; photos: string[] }[];
  reviewUrls?: {
    id: string;
    url: string;
    quantity: number;
    reactionType?: string;
    reviewIndex: number;
    reviewContent?: string;
    photoUrls?: string;
    status: string;
    assignedEmployeeId?: string;
    assignedAt?: string;
    completedAt?: string;
    proofOfCompletion?: string;
  }[];
}

export default function EmployeeOrderDetailPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [order, setOrder] = useState<ReviewOrder | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Track "done" state for each item - load from localStorage
  const [doneUrls, setDoneUrls] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem(`order_${orderId}_doneUrls`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [doneReviews, setDoneReviews] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem(`order_${orderId}_doneReviews`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [donePhotos, setDonePhotos] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem(`order_${orderId}_donePhotos`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const isUnassignedOrPending = (!order?.assignedEmployeeId || order?.status === "PENDING") && order?.status !== "COMPLETED" && order?.status !== "CANCELLED";
  const isAssignedToMe = order?.assignedEmployeeId === user?.id && order?.status === "IN_PROGRESS";
  const canComplete = order?.status !== "COMPLETED" && order?.status !== "CANCELLED" && !order?.completedByEmployeeId;

  // Save done states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`order_${orderId}_doneUrls`, JSON.stringify(Array.from(doneUrls)));
  }, [doneUrls, orderId]);

  useEffect(() => {
    localStorage.setItem(`order_${orderId}_doneReviews`, JSON.stringify(Array.from(doneReviews)));
  }, [doneReviews, orderId]);

  useEffect(() => {
    localStorage.setItem(`order_${orderId}_donePhotos`, JSON.stringify(Array.from(donePhotos)));
  }, [donePhotos, orderId]);

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      try {
        const result = await getReviewOrderByIdAction(orderId);

        if (result.success && result.data) {
          setOrder(result.data as ReviewOrder);
        } else {
          toastError(result.error || "Order not found");
          router.push("/e/orders");
        }
      } catch (err) {
        console.error("Failed to load order:", err);
        toastError("Failed to load order");
        router.push("/e/orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, orderId, toastError, router]);

  const handleAcceptOrder = async () => {
    setAccepting(true);
    try {
      const result = await acceptReviewOrderAction(orderId);
      if (result.success) {
        toastSuccess("Order accepted and assigned to you!");
        const reloadResult = await getReviewOrderByIdAction(orderId);
        if (reloadResult.success && reloadResult.data) {
          setOrder(reloadResult.data as ReviewOrder);
        }
      } else {
        toastError(result.error || "Failed to accept order");
      }
    } catch (err) {
      console.error("Failed to accept order:", err);
      toastError("Failed to accept order");
    } finally {
      setAccepting(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) {
      toastError("This order cannot be completed");
      return;
    }

    setCompleting(true);
    try {
      const result = await completeReviewOrderAction(orderId);

      if (result.success) {
        toastSuccess("Order marked as completed!");

        // Clear localStorage for this order
        localStorage.removeItem(`order_${orderId}_doneUrls`);
        localStorage.removeItem(`order_${orderId}_doneReviews`);
        localStorage.removeItem(`order_${orderId}_donePhotos`);

        await new Promise(resolve => setTimeout(resolve, 300));
        const reloadResult = await getReviewOrderByIdAction(orderId);
        if (reloadResult.success && reloadResult.data) {
          setOrder(reloadResult.data as ReviewOrder);
        } else {
          console.error("Failed to reload order:", reloadResult.error);
        }
      } else {
        toastError(result.error || "Failed to complete order");
      }
    } catch (err) {
      console.error("Failed to complete order:", err);
      toastError("Failed to complete order");
    } finally {
      setCompleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyToClipboard = (text: string, label: string = "Text") => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  const copyImageToClipboard = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedItem("Image");
      setTimeout(() => setCopiedItem(null), 1500);
    } catch (error) {
      console.error('Failed to copy image:', error);
      navigator.clipboard.writeText(imageUrl);
      setCopiedItem("Image URL");
      setTimeout(() => setCopiedItem(null), 1500);
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

  if (loading) return <LoadingScreen />;
  if (!order) return null;

  // Parse reviews from reviewUrls (for REVIEW and COMMENT_WITH_PHOTO types) or commentText (for COMMENT type)
  const parsedReviews = (() => {
    // COMMENT (reactions) orders have NO review content - only reaction_type
    if (order.orderType === "COMMENT") {
      return [];
    }
    // For COMMENT_WITH_PHOTO orders, extract text from photoReviews array
    if (order.orderType === "COMMENT_WITH_PHOTO" && order.photoReviews && order.photoReviews.length > 0) {
      return order.photoReviews.map(pr => pr.text);
    }
    // For REVIEW orders, get reviews from reviewUrls (stored per-URL, not aggregated)
    if (order.orderType === "REVIEW" && order.reviewUrls && order.reviewUrls.length > 0) {
      const firstUrlReviews = order.reviewUrls[0].reviewContent;
      if (firstUrlReviews) {
        try {
          const parsed = typeof firstUrlReviews === 'string' ? JSON.parse(firstUrlReviews) : firstUrlReviews;
          return Array.isArray(parsed) ? parsed : [firstUrlReviews];
        } catch {
          return [firstUrlReviews];
        }
      }
    }
    // Fallback: check order.reviewContent for backward compatibility
    if (order.reviewContent) {
      try {
        const parsed = JSON.parse(order.reviewContent);
        return Array.isArray(parsed) ? parsed : [order.reviewContent];
      } catch {
        return [order.reviewContent];
      }
    }
    return [];
  })();

  const hasUrls = order.reviewUrls && order.reviewUrls.length > 0;
  const hasReviews = parsedReviews.length > 0;
  const hasPhotos = order.photoReviews && order.photoReviews.length > 0;

  const allItemsDone =
    doneUrls.size === (order.reviewUrls?.length || 0) &&
    doneReviews.size === parsedReviews.length &&
    donePhotos.size === (order.photoReviews?.length || 0);

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

      <div className="space-y-6">
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
            onClick={() => router.push("/e/orders")}
            className="gap-2 cursor-pointer"
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
                 order.orderType?.replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Credits</p>
              <p className="text-sm font-bold text-[#168BB0]">{order.creditsConsumed}</p>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Created</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDateShort(order.createdAt)}</p>
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">Status</p>
              <div className="flex items-center gap-2">
                {getStatusBadge(order.status)}
              </div>
            </div>
          </div>
        </Card>

        {/* Action Banner for Unassigned / Pending Order */}
        {isUnassignedOrPending && (
          <Card className="p-4 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-[#168BB0] dark:text-[#45B0D2] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                    This order is unassigned / pending
                  </p>
                  <p className="text-xs text-sky-700 dark:text-sky-300">
                    Accept this order to start working on it.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAcceptOrder}
                disabled={accepting}
                size="sm"
                className="gap-2 bg-[#168BB0] hover:bg-[#0F7493] text-white font-medium cursor-pointer w-full sm:w-auto shrink-0 shadow-sm"
              >
                {accepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Action Banner for Assigned Order */}
        {isAssignedToMe && (
          <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  {allItemsDone ? "All items marked done! Ready to complete." : "Track items progress, then complete the order."}
                </p>
              </div>
              <Button
                onClick={handleComplete}
                disabled={completing}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer w-full sm:w-auto shrink-0 shadow-sm"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Order
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

      {/* URLs Section */}
      {hasUrls && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-lg">URLs ({order.reviewUrls!.length})</h3>
          </div>
          <div className="space-y-2">
            {order.reviewUrls!.map((urlItem, index) => {
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
                  {order && order.orderType === "COMMENT" && urlItem.reactionType && (
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
      )}

      {/* Reviews Section - List format like URLs */}
      {/* Don't show for COMMENT_WITH_PHOTO since reviews are displayed with photos */}
      {hasReviews && order.orderType !== 'COMMENT_WITH_PHOTO' && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-lg">Reviews ({parsedReviews.length})</h3>
          </div>
          <div className="space-y-2">
            {parsedReviews.map((review, index) => {
              const isDone = doneReviews.has(index);
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isDone
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <span className="font-medium text-zinc-500 text-sm w-8 shrink-0">#{index + 1}</span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap flex-1">{review}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(review, "Review")}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isDone ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleReviewDone(index)}
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
        </Card>
      )}

      {/* Photos Section */}
      {hasPhotos && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-lg">Photo + Reviews ({order.photoReviews!.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {order.photoReviews!.map((review, index) => {
              const isDone = donePhotos.has(index);
              const photoUrl = review.photos && review.photos.length > 0 ? review.photos[0] : null;
              if (!photoUrl) {
                console.warn("No photo URL for review:", review);
                return null;
              }
              return (
                <div
                  key={index}
                  className={`rounded-lg border-2 overflow-hidden transition-colors ${
                    isDone
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {/* Photo with overlay controls */}
                  <div className="relative">
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                    </a>
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
                      #{index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyImageToClipboard(photoUrl, index)}
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                      title="Copy image to paste anywhere"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Review text section */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-start gap-2 mb-2 relative">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">#{index + 1}</span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap flex-1 pr-8">{review.text}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(review.text, "Review")}
                        className="absolute top-0 right-0 h-7 w-7 p-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-600"
                        title="Copy review text"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = photoUrl;
                          a.download = `photo-${index + 1}.jpg`;
                          a.click();
                        }}
                        className="h-7 px-2 gap-1.5 text-xs"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                      <Button
                        variant={isDone ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePhotoDone(index)}
                        className={`h-7 px-3 gap-1.5 text-xs ${
                          isDone
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : ''
                        }`}
                      >
                        {isDone ? (
                          <>
                            <Check className="h-3 w-3" />
                            Done
                          </>
                        ) : (
                          'Mark Done'
                        )}
                      </Button>
                    </div>
                  </div>
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
            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">Instructions</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.reviewInstructions}</p>
        </Card>
      )}
      </div>
    </>
  );
}
