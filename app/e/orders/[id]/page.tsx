"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getReviewOrderByIdAction, acceptReviewOrderAction, completeReviewOrderAction } from "@/app/actions/employee";

interface ReviewOrder {
  id: string;
  userId: string;
  businessName: string;
  facebookUrl?: string;
  businessUrl?: string;
  orderType: string;
  reviewType: string;
  reviewContent: string;
  reviewInstructions?: string;
  quantity: number;
  creditsConsumed: number;
  reactionType?: string;
  status: string;
  assignedEmployeeId?: string;
  assignedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  users?: { name: string; email: string };
  comments?: string[];
  commentText?: string;
  photoUrls?: string[] | string[][];
  photoReviews?: { text: string; photos: string[] }[];
  reviewUrls?: {
    id: string;
    url: string;
    quantity: number;
    reactionType?: string;
    reviewContent?: string | string[];
    reviewIndex: number;
    status: string;
    assignedEmployeeId?: string;
    assignedAt?: string;
    completedAt?: string;
    proofOfCompletion?: string;
  }[];
  proofOfCompletion?: string;
}

export default function EmployeeOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation("employee");
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const router = useRouter();
  const { id: orderId } = use(params);

  const [order, setOrder] = useState<ReviewOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Track "done" state for each item (persisted in localStorage)
  const [doneUrls, setDoneUrls] = useState<Set<string>>(new Set());
  const [doneReviews, setDoneReviews] = useState<Set<number>>(new Set());
  const [donePhotos, setDonePhotos] = useState<Set<number>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Load done state from localStorage on mount
  useEffect(() => {
    if (!orderId) return;

    try {
      const savedDoneUrls = localStorage.getItem(`order_${orderId}_doneUrls`);
      const savedDoneReviews = localStorage.getItem(`order_${orderId}_doneReviews`);
      const savedDonePhotos = localStorage.getItem(`order_${orderId}_donePhotos`);

      if (savedDoneUrls) {
        setDoneUrls(new Set(JSON.parse(savedDoneUrls)));
      }
      if (savedDoneReviews) {
        setDoneReviews(new Set(JSON.parse(savedDoneReviews)));
      }
      if (savedDonePhotos) {
        setDonePhotos(new Set(JSON.parse(savedDonePhotos)));
      }
    } catch (e) {
      console.error("Failed to load done state from localStorage:", e);
    }
  }, [orderId]);

  // Save done state to localStorage whenever it changes
  useEffect(() => {
    if (!orderId) return;

    try {
      localStorage.setItem(`order_${orderId}_doneUrls`, JSON.stringify(Array.from(doneUrls)));
    } catch (e) {
      console.error("Failed to save doneUrls to localStorage:", e);
    }
  }, [doneUrls, orderId]);

  useEffect(() => {
    if (!orderId) return;

    try {
      localStorage.setItem(`order_${orderId}_doneReviews`, JSON.stringify(Array.from(doneReviews)));
    } catch (e) {
      console.error("Failed to save doneReviews to localStorage:", e);
    }
  }, [doneReviews, orderId]);

  useEffect(() => {
    if (!orderId) return;

    try {
      localStorage.setItem(`order_${orderId}_donePhotos`, JSON.stringify(Array.from(donePhotos)));
    } catch (e) {
      console.error("Failed to save donePhotos to localStorage:", e);
    }
  }, [donePhotos, orderId]);

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
      console.error('❌ Failed to copy image:', error);
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

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      try {
        const result = await getReviewOrderByIdAction(orderId);

        if (result.success && result.data) {
          setOrder(result.data as ReviewOrder);
        } else {
          toastError(result.error || t("orders.not_found", "Order not found"));
          router.push("/e/orders");
        }
      } catch (err) {
        console.error("Failed to load order:", err);
        toastError(t("orders.load_failed", "Failed to load order"));
        router.push("/e/orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, orderId, toastError, router, t]);

  const handleAcceptOrder = async () => {
    setAccepting(true);
    try {
      const result = await acceptReviewOrderAction(orderId);
      if (result.success) {
        toastSuccess(t("orders.accept_success", "Order accepted and assigned to you!"));
        const reloadResult = await getReviewOrderByIdAction(orderId);
        if (reloadResult.success && reloadResult.data) {
          setOrder(reloadResult.data as ReviewOrder);
        }
      } else {
        toastError(result.error || t("orders.accept_failed", "Failed to accept order"));
      }
    } catch (err) {
      console.error("Failed to accept order:", err);
      toastError(t("orders.accept_failed", "Failed to accept order"));
    } finally {
      setAccepting(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) {
      toastError(t("orders.cannot_complete", "This order cannot be completed"));
      return;
    }

    setCompleting(true);
    try {
      const result = await completeReviewOrderAction(orderId);

      if (result.success) {
        toastSuccess(t("orders.complete_success", "Order marked as completed!"));

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
        toastError(result.error || t("orders.complete_failed", "Failed to complete order"));
      }
    } catch (err) {
      console.error("Failed to complete order:", err);
      toastError(t("orders.complete_failed", "Failed to complete order"));
    } finally {
      setCompleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.pending", "Pending")}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {t("status.in_progress", "In Progress")}
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("status.completed", "Completed")}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t("status.cancelled", "Cancelled")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#168BB0]" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const parsedReviews = (() => {
    if (order.orderType === "COMMENT") {
      return [];
    }
    if (order.orderType === "COMMENT_WITH_PHOTO" && order.photoReviews && order.photoReviews.length > 0) {
      return order.photoReviews.map(pr => pr.text);
    }
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

  const isAssignedToMe = order.assignedEmployeeId === user?.id;
  const isUnassignedOrPending = !order.assignedEmployeeId || order.status === 'PENDING';
  const canComplete = isAssignedToMe && order.status === 'IN_PROGRESS';

  const hasUrls = order.reviewUrls && order.reviewUrls.length > 0;
  const hasReviews = parsedReviews.length > 0;
  const hasPhotos = order.photoReviews && order.photoReviews.length > 0;

  const allUrlsDone = hasUrls ? order.reviewUrls!.every(u => doneUrls.has(u.id)) : true;
  const allReviewsDone = hasReviews ? parsedReviews.every((_, i) => doneReviews.has(i)) : true;
  const allPhotosDone = hasPhotos ? order.photoReviews!.every((_, i) => donePhotos.has(i)) : true;
  const allItemsDone = allUrlsDone && allReviewsDone && allPhotosDone;

  return (
    <>
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
        {copiedItem && (
          <div className="fixed top-20 right-4 z-50" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <Check className="h-3.5 w-3.5" />
              {copiedItem} {t("orders.copied", "copied!")}
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
            {t("orders.back", "Back")}
          </Button>
        </div>

        {/* Order Info Header */}
        <Card className="p-5 bg-gradient-to-r from-zinc-50 to-blue-50 dark:from-zinc-900 dark:to-blue-900/20">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">
                {t("orders.table_order_id", "Order ID")}
              </p>
              <button
                onClick={() => copyToClipboard(order.id, "Order ID")}
                className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100 break-all hover:text-[#168BB0] dark:hover:text-[#45B0D2] transition-colors flex items-center gap-1 cursor-pointer"
                title="Click to copy"
              >
                {order.id}
                <Copy className="h-3 w-3 opacity-50" />
              </button>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">
                {t("orders.table_type", "Type")}
              </p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {order.orderType === "COMMENT" ? t("orders.type_reactions", "Reactions") :
                 order.orderType === "REVIEW" ? t("orders.type_reviews", "Reviews") :
                 order.orderType === "COMMENT_WITH_PHOTO" ? t("orders.type_photo_reviews", "Photo + Reviews") :
                 order.orderType?.replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">
                {t("orders.table_credits", "Credits")}
              </p>
              <p className="text-sm font-bold text-[#168BB0]">{order.creditsConsumed}</p>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">
                {t("orders.table_created", "Created")}
              </p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDateShort(order.createdAt)}</p>
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-semibold mb-1">
                {t("orders.table_status", "Status")}
              </p>
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
                    {t("orders.unassigned_banner_title", "This order is unassigned / pending")}
                  </p>
                  <p className="text-xs text-sky-700 dark:text-sky-300">
                    {t("orders.unassigned_banner_desc", "Accept this order to start working on it.")}
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
                    {t("orders.accept_order", "Accept")}
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
                  {allItemsDone ? t("orders.all_items_done", "All items marked done! Ready to complete.") : t("orders.track_progress", "Track items progress, then complete the order.")}
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
                    {t("orders.complete_order", "Complete Order")}
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
              <h3 className="font-semibold text-lg">{t("orders.urls", "URLs")} ({order.reviewUrls!.length})</h3>
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
                      className="h-8 w-8 p-0 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isDone ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleUrlDone(urlItem.id)}
                      className={`h-8 px-3 gap-2 cursor-pointer ${
                        isDone
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                          : ''
                      }`}
                    >
                      {isDone ? (
                        <>
                          <Check className="h-4 w-4" />
                          {t("orders.done", "Done")}
                        </>
                      ) : (
                        t("orders.mark_done", "Mark Done")
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Reviews Section */}
        {hasReviews && order.orderType !== 'COMMENT_WITH_PHOTO' && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <h3 className="font-semibold text-lg">{t("orders.reviews", "Reviews")} ({parsedReviews.length})</h3>
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
                      className="h-8 w-8 p-0 shrink-0 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isDone ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReviewDone(index)}
                      className={`h-8 px-3 gap-2 shrink-0 cursor-pointer ${
                        isDone
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                          : ''
                      }`}
                    >
                      {isDone ? (
                        <>
                          <Check className="h-4 w-4" />
                          {t("orders.done", "Done")}
                        </>
                      ) : (
                        t("orders.mark_done", "Mark Done")
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
              <h3 className="font-semibold text-lg">{t("orders.photo_reviews", "Photo + Reviews")} ({order.photoReviews!.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {order.photoReviews!.map((review, index) => {
                const isDone = donePhotos.has(index);
                const photoUrl = review.photos ? (Array.isArray(review.photos) ? review.photos[0] : review.photos) : null;
                if (!photoUrl) {
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
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 dark:bg-zinc-800/90 shadow-sm cursor-pointer"
                        title="Copy image"
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
                          className="absolute top-0 right-0 h-7 w-7 p-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-600 cursor-pointer"
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
                          className="h-7 px-2 gap-1.5 text-xs cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          {t("orders.download", "Download")}
                        </Button>
                        <Button
                          variant={isDone ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePhotoDone(index)}
                          className={`h-7 px-3 gap-1.5 text-xs cursor-pointer ${
                            isDone
                              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                              : ''
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="h-3 w-3" />
                              {t("orders.done", "Done")}
                            </>
                          ) : (
                            t("orders.mark_done", "Mark Done")
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
              <span className="font-semibold text-sm">{t("orders.instructions", "Instructions")}</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.reviewInstructions}</p>
          </Card>
        )}
      </div>
    </>
  );
}
