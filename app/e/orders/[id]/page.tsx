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
  Check
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import {
  getReviewOrderByIdAction,
  completeReviewOrderAction
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
  photoUrls?: string[][];
  photoReviews?: { text: string; photos: string[] }[];
  reviewUrls?: {
    id: string;
    url: string;
    quantity: number;
    reactionType?: string;
    reviewIndex: number;
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
  const [order, setOrder] = useState<ReviewOrder | null>(null);

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

  const isPending = order?.status === "PENDING" && !order?.completedByEmployeeId;

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

  const handleComplete = async () => {
    if (!isPending) {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toastSuccess("Copied to clipboard");
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

  // Parse reviews from reviewContent
  const parsedReviews = (() => {
    if (!order.reviewContent) return [];
    try {
      const parsed = JSON.parse(order.reviewContent);
      return Array.isArray(parsed) ? parsed : [order.reviewContent];
    } catch {
      return [order.reviewContent];
    }
  })();

  const hasUrls = order.reviewUrls && order.reviewUrls.length > 0;
  const hasReviews = parsedReviews.length > 0;
  const hasPhotos = order.photoReviews && order.photoReviews.length > 0;

  const allItemsDone =
    doneUrls.size === (order.reviewUrls?.length || 0) &&
    doneReviews.size === parsedReviews.length &&
    donePhotos.size === (order.photoReviews?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/e/orders")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Order Info Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-zinc-500">Order ID</p>
            <p className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">{order.id.slice(0, 8)}...</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Type</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {order.orderType === "COMMENT" ? "Reactions" :
               order.orderType === "REVIEW" ? "Reviews" :
               order.orderType === "COMMENT_WITH_PHOTO" ? "Photo + Reviews" :
               order.orderType?.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Credits</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{order.creditsConsumed}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Created</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDateShort(order.createdAt)}</p>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </Card>

      {/* Action Banner */}
      {isPending && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {allItemsDone ? "All items marked done! Ready to complete." : "Mark items as done, then complete the order."}
              </p>
            </div>
            <Button
              onClick={handleComplete}
              disabled={completing}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Complete Order"
              )}
            </Button>
          </div>
        </Card>
      )}

      {order.status === "COMPLETED" && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">Order Completed</p>
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
                  {urlItem.reactionType && (
                    <span className="text-xl">{urlItem.reactionType === "LIKE" ? "👍" :
                          urlItem.reactionType === "LOVE" ? "❤️" :
                          urlItem.reactionType === "CARE" ? "🤗" :
                          urlItem.reactionType === "WOW" ? "😮" :
                          urlItem.reactionType}</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(urlItem.url)}
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
      {hasReviews && (
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
                    onClick={() => copyToClipboard(review)}
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
            <h3 className="font-semibold text-lg">Photos ({order.photoReviews!.length})</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {order.photoReviews!.map((review, index) => {
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
                    href={review.photos[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={review.photos[0]}
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
                    onClick={() => copyToClipboard(review.text)}
                    className="absolute top-3 right-3 h-8 w-8 p-0 bg-white/90 dark:bg-zinc-800/90 shadow-sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = review.photos[0];
                      a.download = `photo-${index + 1}.jpg`;
                      a.click();
                    }}
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
            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">Instructions</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.reviewInstructions}</p>
        </Card>
      )}
    </div>
  );
}
