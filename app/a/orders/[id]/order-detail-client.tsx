"use client";

import { useState } from "react";
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
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  // Collapsible states
  const [showUrls, setShowUrls] = useState(true);
  const [showReviews, setShowReviews] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);

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

  return (
    <div className="space-y-4">
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
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Package className="h-5 w-5 text-[#168BB0]" />
              {order.businessName}
            </h1>
          </div>
        </div>
        {getStatusBadge(order.status)}
      </div>

      {/* Order Details - Compact */}
      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-zinc-500">Order ID</p>
            <p className="font-mono text-zinc-700 dark:text-zinc-300 truncate">{order.id.slice(0, 8)}...</p>
          </div>
          <div>
            <p className="text-zinc-500">Type</p>
            <p className="font-medium">
              {order.orderType === "COMMENT" ? "Reactions" :
               order.orderType === "REVIEW" ? "Reviews" :
               order.orderType === "COMMENT_WITH_PHOTO" ? "Photo+" :
               order.orderType?.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Qty</p>
            <p className="font-medium">{order.quantity}</p>
          </div>
          <div>
            <p className="text-zinc-500">Credits</p>
            <p className="font-medium">{order.creditsConsumed}</p>
          </div>
          <div>
            <p className="text-zinc-500">Client</p>
            <p className="font-medium truncate">{order.users?.name || "Unknown"}</p>
          </div>
          <div>
            <p className="text-zinc-500">Employee</p>
            <p className="font-medium truncate">{order.employees?.name || "Unassigned"}</p>
          </div>
          <div>
            <p className="text-zinc-500">Created</p>
            <p className="font-medium">{formatDateShort(order.createdAt)}</p>
          </div>
          {order.completedAt && (
            <div>
              <p className="text-zinc-500">Completed</p>
              <p className="font-medium">{formatDateShort(order.completedAt)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* URLs Section - Compact Collapsible */}
      {hasUrls && (
        <Card className="p-3">
          <button
            onClick={() => setShowUrls(!showUrls)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm">URLs ({order.reviewUrls!.length})</span>
            </div>
            {showUrls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showUrls && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {order.reviewUrls!.map((urlItem: any, index: number) => (
                <div key={urlItem.id} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-xs group relative">
                  <span className="font-medium text-zinc-500">#{index + 1}</span>
                  <a
                    href={urlItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#168BB0] hover:underline truncate flex-1"
                  >
                    {urlItem.url}
                  </a>
                  <span className="text-zinc-500">×{urlItem.quantity}</span>
                  {urlItem.reactionType && (
                    <span>{urlItem.reactionType === "LIKE" ? "👍" :
                          urlItem.reactionType === "LOVE" ? "❤️" :
                          urlItem.reactionType === "CARE" ? "🤗" :
                          urlItem.reactionType === "WOW" ? "😮" :
                          urlItem.reactionType}</span>
                  )}
                  <span className={`px-2 py-0.5 rounded ${
                    urlItem.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    urlItem.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    urlItem.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {urlItem.status}
                  </span>
                  {urlItem.proofOfCompletion && (
                    <a
                      href={urlItem.proofOfCompletion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#168BB0] hover:underline opacity-0 group-hover:opacity-100"
                    >
                      Proof
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(urlItem.url)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Reviews Section - Compact Grid */}
      {hasReviews && (
        <Card className="p-3">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-sm">Reviews ({parsedReviews.length})</span>
            </div>
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReviews && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {parsedReviews.map((review: string, reviewIndex: number) => (
                <div key={reviewIndex} className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-xs group relative">
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
                  <p className="text-zinc-700 dark:text-zinc-300 line-clamp-3 whitespace-pre-wrap">
                    {review}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Photos Section - Compact Grid */}
      {hasPhotos && (
        <Card className="p-3">
          <button
            onClick={() => setShowPhotos(!showPhotos)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-sm">Photos ({order.photoReviews!.length})</span>
            </div>
            {showPhotos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showPhotos && (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
              {order.photoReviews!.map((review: any, index: number) => (
                <div key={index} className="relative group">
                  <a
                    href={review.photos[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={review.photos[0]}
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
                    onClick={() => copyToClipboard(review.text)}
                    className="absolute bottom-1 right-1 h-6 w-6 p-0 bg-white/90 dark:bg-zinc-800/90 opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
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

      {/* Proof of Completion - Compact */}
      {order.proofOfCompletion && (
        <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-sm">Proof of Completion</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{order.proofOfCompletion}</p>
        </Card>
      )}

      {/* Client Feedback - Compact */}
      {order.clientFeedback && (
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Client Feedback:</span>
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
          </div>
        </Card>
      )}
    </div>
  );
}
