"use client";

import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  User,
  Calendar,
  ExternalLink,
  FileText,
  Coins,
  UserCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Copy,
  Download,
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReviewOrder {
  id: string;
  userId: string;
  businessName: string;
  facebookUrl?: string;
  businessUrl?: string; // Alias for facebookUrl (some data sources use this name)
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
  employees?: { name: string; email: string };
  comments?: string[];
  photoUrls?: string[] | string[][];
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
  proofOfCompletion?: string;
  clientFeedback?: string;
}

interface OrderDetailClientProps {
  order: ReviewOrder;
}

export default function OrderDetailClient({ order }: OrderDetailClientProps) {
  const { t } = useTranslation("admin_reviews");
  const router = useRouter();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'CANCELLED':
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

  const getReviewTypeIcon = (reviewType: string) => {
    switch (reviewType) {
      case 'GOOGLE': return '🔍';
      case 'FACEBOOK': return '📘';
      case 'TRUSTPILOT': return '⭐';
      case 'YELP': return '📝';
      case 'AMAZON': return '🛒';
      default: return '⭐';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back", "Back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Package className="h-6 w-6 text-[#168BB0]" />
              {t("orders.orderDetails", "Order Details")}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {order.businessName}
            </p>
          </div>
        </div>
        {getStatusBadge(order.status)}
      </div>

      {/* Order ID */}
      <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">{t("orders.orderId", "Order ID")}</p>
            <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{order.id}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(order.id)}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {t("common.copy", "Copy")}
          </Button>
        </div>
      </Card>

      {/* Client & Assignment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-[#168BB0]" />
            <h3 className="font-semibold">{t("orders.clientInfo", "Client Information")}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-zinc-500">{t("orders.name", "Name")}</p>
              <p className="font-medium">{order.users?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-zinc-500">{t("orders.email", "Email")}</p>
              <p className="font-medium">{order.users?.email || 'N/A'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold">{t("orders.assignment", "Assignment")}</h3>
          </div>
          {order.employees ? (
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-zinc-500">{t("orders.assignedTo", "Assigned to")}</p>
                <p className="font-medium">{order.employees.name}</p>
              </div>
              <div>
                <p className="text-zinc-500">{t("orders.email", "Email")}</p>
                <p className="font-medium">{order.employees.email}</p>
              </div>
              {order.assignedAt && (
                <div>
                  <p className="text-zinc-500">{t("orders.assignedAt", "Assigned at")}</p>
                  <p className="font-medium">{formatDateShort(order.assignedAt)}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">{t("orders.unassigned", "Unassigned")}</p>
          )}
        </Card>
      </div>

      {/* Review URLs - Multi-URL system */}
      {order.reviewUrls && order.reviewUrls.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold">{t("orders.reviewUrls", "Review URLs")} ({order.reviewUrls.length})</h3>
          </div>
          <div className="space-y-2">
            {order.reviewUrls.map((urlItem: any, index: number) => (
              <div key={urlItem.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-medium bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">
                  #{index + 1}
                </span>
                <a
                  href={urlItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#168BB0] hover:underline truncate flex-1"
                >
                  {urlItem.url}
                </a>
                <span className="text-xs text-zinc-500">
                  Qty: {urlItem.quantity}
                </span>
                {urlItem.reactionType && (
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    {urlItem.reactionType === "LIKE" ? "👍" :
                     urlItem.reactionType === "LOVE" ? "❤️" :
                     urlItem.reactionType === "CARE" ? "🤗" :
                     urlItem.reactionType === "WOW" ? "😮" :
                     urlItem.reactionType}
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded ${
                  urlItem.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  urlItem.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  urlItem.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {urlItem.status}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(urlItem.url)}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {urlItem.proofOfCompletion && (
                  <a
                    href={urlItem.proofOfCompletion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#168BB0] hover:underline"
                  >
                    View Proof
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Legacy single URL system - show when no multi-URLs */}
      {(!order.reviewUrls || order.reviewUrls.length === 0) && (order.facebookUrl || order.businessUrl) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold">{t("orders.reviewUrl", "Review URL")}</h3>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
            <a
              href={order.facebookUrl || order.businessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-700 dark:text-blue-300 font-medium hover:underline truncate flex-1"
            >
              {order.facebookUrl || order.businessUrl}
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard((order.facebookUrl || order.businessUrl)!)}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Review Content */}
      {order.reviewContent && order.reviewContent.trim() && (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold">{t("orders.reviewContent", "Review Content")}</h3>
            <span className="text-lg" title={order.reviewType}>
              {getReviewTypeIcon(order.reviewType)}
            </span>
          </div>
        </div>

        {/* Parse and display each review separately */}
        {(() => {
          let reviews: string[] = [];
          try {
            const parsed = JSON.parse(order.reviewContent);
            if (Array.isArray(parsed)) {
              reviews = parsed;
            } else {
              reviews = [order.reviewContent];
            }
          } catch {
            reviews = [order.reviewContent];
          }

          return (
            <div className="space-y-2">
              {reviews.map((review, reviewIndex) => (
                <div key={reviewIndex} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-500">#{reviewIndex + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(review)}
                      className="shrink-0 h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
                    {review}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}

        {order.reviewInstructions && (
          <div className="mt-3 text-sm">
            <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {t("orders.instructions", "Instructions")}:
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">{order.reviewInstructions}</p>
          </div>
        )}
      </Card>
      )}

      {/* Multiple Comments/Photos */}
      {order.comments && order.comments.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold">
              {t("orders.comments", "Comments")} ({order.comments.length})
            </h3>
          </div>
          <div className="space-y-3">
            {order.comments.map((comment, index) => (
              <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500">#{index + 1}</span>
                    <MessageSquare className="h-3 w-3 text-zinc-400" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(comment)}
                    className="shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{comment}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Photo Reviews */}
      {order.photoReviews && order.photoReviews.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold">
              {t("orders.photoReviews", "Photo Reviews")} ({order.photoReviews.length})
            </h3>
          </div>
          <div className="space-y-4">
            {order.photoReviews.map((review, index) => (
              <div key={index} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500">#{index + 1}</span>
                    <MessageSquare className="h-3 w-3 text-zinc-400" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(review.text)}
                    className="shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mb-3">{review.text}</p>
                {review.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.photos.map((photoUrl, photoIndex) => (
                      <a
                        key={photoIndex}
                        href={photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={photoUrl}
                          alt={`Photo ${photoIndex + 1}`}
                          className="w-20 h-20 object-cover rounded border border-zinc-300 dark:border-zinc-700 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Photo URLs (fallback display) */}
      {order.photoUrls && Array.isArray(order.photoUrls) && order.photoUrls.length > 0 && !order.photoReviews && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold">
              {t("orders.photos", "Photos")} ({order.photoUrls.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {order.photoUrls.map((photoItem: any, index) => {
              // Handle both string URLs and nested arrays
              const urls = typeof photoItem === 'string' ? [photoItem]
                          : Array.isArray(photoItem) ? photoItem
                          : [];
              return urls.map((url: string, urlIndex: number) => (
                <a
                  key={`${index}-${urlIndex}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group block"
                >
                  <img
                    src={url}
                    alt={`Photo ${index + 1}-${urlIndex + 1}`}
                    className="w-full h-32 object-cover rounded border border-zinc-300 dark:border-zinc-700 hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyToClipboard(url);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-800/90 shadow-sm h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `photo-${index + 1}.jpg`;
                      a.click();
                    }}
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-800/90 shadow-sm h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </a>
              ));
            })}
          </div>
        </Card>
      )}

      {/* Order Details */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">{t("orders.orderDetails", "Order Details")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-zinc-500">{t("orders.type", "Type")}</p>
            <p className="font-medium">
              {order.orderType === "COMMENT" ? "Reactions" :
               order.orderType === "REVIEW" ? "Reviews" :
               order.orderType === "COMMENT_WITH_PHOTO" ? "Photo + Reviews" :
               order.orderType?.replace(/_/g, ' ')}
            </p>
          </div>
          {order.orderType === "COMMENT" && (
            <div>
              <p className="text-zinc-500">Reaction</p>
              <p className="font-medium text-lg flex items-center gap-2">
                {order.reactionType === "LIKE" ? "👍" :
                 order.reactionType === "LOVE" ? "❤️" :
                 order.reactionType === "CARE" ? "🤗" :
                 order.reactionType === "WOW" ? "😮" :
                 order.reactionType || "👍"}
              </p>
            </div>
          )}
          <div>
            <p className="text-zinc-500">{t("orders.reviewType", "Review Type")}</p>
            <p className="font-medium">{order.reviewType}</p>
          </div>
          <div>
            <p className="text-zinc-500">{t("orders.quantity", "Quantity")}</p>
            <p className="font-medium">{order.quantity}</p>
          </div>
          <div>
            <p className="text-zinc-500">{t("orders.credits", "Credits")}</p>
            <div className="flex items-center gap-1 font-medium">
              <Coins className="h-4 w-4 text-zinc-400" />
              {order.creditsConsumed}
            </div>
          </div>
          <div>
            <p className="text-zinc-500">{t("orders.created", "Created")}</p>
            <div className="flex items-center gap-1 font-medium">
              <Calendar className="h-4 w-4 text-zinc-400" />
              {formatDateShort(order.createdAt)}
            </div>
          </div>
          {order.completedAt && (
            <div>
              <p className="text-zinc-500">{t("orders.completed", "Completed")}</p>
              <div className="flex items-center gap-1 font-medium">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {formatDateShort(order.completedAt)}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Proof of Completion */}
      {order.proofOfCompletion && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold">{t("orders.proofOfCompletion", "Proof of Completion")}</h3>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900/30">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {order.proofOfCompletion}
            </p>
          </div>
        </Card>
      )}

      {/* Client Feedback */}
      {order.clientFeedback && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold">{t("orders.clientFeedback", "Client Feedback")}</h3>
          </div>
          <Badge
            className={
              order.clientFeedback === "HAPPY"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : order.clientFeedback === "UNHAPPY"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }
          >
            {order.clientFeedback}
          </Badge>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back", "Back to Orders")}
        </Button>
        {order.status === 'PENDING' && (
          <Button className="gap-2">
            <UserCheck className="h-4 w-4" />
            {t("orders.assign", "Assign Employee")}
          </Button>
        )}
      </div>
    </div>
  );
}
