"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { createMultiUrlReviewOrderAction } from "@/app/actions/reviews-multiurl";
import {
  getReviewOrderSetupAction
} from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { REACTIONS, type ReactionType } from "@/lib/reactionUtils";
import { useTranslation } from "react-i18next";
import { Plus, X, CreditCard, Sparkles, ChevronRight } from "lucide-react";

type OrderType = "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";

interface ReviewUrlData {
  url: string;
  quantity: number; // Kept for backward compatibility with REVIEW/COMMENT_WITH_PHOTO
  reactionType?: ReactionType; // Kept for backward compatibility
}

const ORDER_TYPE_LABELS: Record<OrderType, { label: string; description: string; icon: string }> = {
  COMMENT: { label: "Reactions", description: "Facebook reactions only", icon: "👍" },
  REVIEW: { label: "Reviews", description: "Text reviews", icon: "⭐" },
  COMMENT_WITH_PHOTO: { label: "Photo + Reviews", description: "Text reviews with photos", icon: "📸" }
};

export default function NewReviewOrderPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  // Inline shake animation styles
  const shakeStyle = `
    @keyframes shake {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      25% { transform: translateX(-2px) rotate(-3deg); }
      50% { transform: translateX(2px) rotate(3deg); }
      75% { transform: translateX(-2px) rotate(-3deg); }
    }
    .emoji-shake-always {
      animation: shake 0.6s ease-in-out infinite;
    }
    .button-wrapper:hover .emoji-shake-hover {
      animation: shake 0.6s ease-in-out infinite;
    }
  `;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>("REVIEW");
  const [urls, setUrls] = useState<ReviewUrlData[]>([
    { url: "", quantity: 1, reactionType: "LIKE" as ReactionType }
  ]);

  // Single reaction type for COMMENT orders (shared across all URLs)
  const [singleReactionType, setSingleReactionType] = useState<ReactionType>("LIKE" as ReactionType);
  // Single quantity for COMMENT and COMMENT_WITH_PHOTO orders only
  const [singleQuantity, setSingleQuantity] = useState(5);

  // Per-URL reviews and photos structure
  const [urlReviews, setUrlReviews] = useState<Array<{ reviews: string[]; photos: string[][] }>>([
    { reviews: [""], photos: [[]] }
  ]);

  const [fieldErrors, setFieldErrors] = useState<{
    urls?: Record<number, boolean>;
    reviews?: Record<number, boolean>; // Index-based errors for multiple reviews
    photos?: Record<number, Record<number, boolean>>; // Nested structure: urlIndex -> reviewIndex
    quantity?: boolean;
    credits?: boolean;
    maxReviews?: boolean;
  }>({});

  const [creditPricing, setCreditPricing] = useState<Record<OrderType, number>>({
    REVIEW: 15,
    COMMENT: 10,
    COMMENT_WITH_PHOTO: 20
  });

  const [validation, setValidation] = useState<{
    hasEnough: boolean;
    currentBalance: number;
    requiredCredits: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadSetup = async () => {
      try {
        const result = await getReviewOrderSetupAction();
        if (result.success && result.pricing) {
          setCreditPricing({
            REVIEW: result.pricing.REVIEW || 15,
            COMMENT: result.pricing.COMMENT || 10,
            COMMENT_WITH_PHOTO: result.pricing.COMMENT_WITH_PHOTO || 20
          });
          setValidation({
            hasEnough: true,
            currentBalance: result.creditsBalance || 0,
            requiredCredits: 0
          });
        }
      } catch (err) {
        toastError(t("employee.loading_failed", "Failed to load pricing information"));
      } finally {
        setLoading(false);
      }
    };

    loadSetup();
  }, [user]);

  const addUrl = () => {
    const maxUrls = 10; // Max 10 URLs for all order types
    if (urls.length >= maxUrls) {
      toastError(t(`Maximum ${maxUrls} URLs allowed per order`, `Maximum ${maxUrls} URLs allowed per order`));
      return;
    }

    setUrls([
      ...urls,
      {
        url: "",
        quantity: 1,
        reactionType: "LIKE" as ReactionType
      }
    ]);

    // Add empty reviews array for the new URL
    setUrlReviews([...urlReviews, { reviews: [""], photos: [[]] }]);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : [
      { url: "", quantity: 1, reactionType: "LIKE" as ReactionType }
    ]);

    // Remove reviews for this URL
    const newUrlReviews = urlReviews.filter((_, i) => i !== index);
    setUrlReviews(newUrlReviews.length > 0 ? newUrlReviews : [{ reviews: [""], photos: [[]] }]);

    setFieldErrors({ ...fieldErrors, urls: { ...fieldErrors.urls, [index]: false } });
  };

  const updateUrl = (index: number, field: keyof ReviewUrlData, value: string | number | ReactionType) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
    setFieldErrors({ ...fieldErrors, urls: { ...fieldErrors.urls, [index]: false } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate single quantity for COMMENT orders only
    if (orderType === "COMMENT" && (singleQuantity < 1 || singleQuantity > 50)) {
      setFieldErrors({ quantity: true });
      return;
    }

    // Validate URLs
    const urlErrors: Record<number, boolean> = {};
    urls.forEach((urlData, index) => {
      if (!urlData.url || !/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(urlData.url)) {
        urlErrors[index] = true;
      }
      // Quantity validation is now handled at the shared quantity level
    });

    // Validate per-URL reviews and photos for REVIEW and COMMENT_WITH_PHOTO
    if (orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") {
      let totalReviews = 0;
      const reviewErrors: Record<number, boolean> = {};
      const photoErrors: Record<number, Record<number, boolean>> = {};

      urlReviews.forEach((urlData, urlIndex) => {
        const validUrlReviews = urlData.reviews.filter(r => r.trim().length > 0);
        totalReviews += validUrlReviews.length;

        // Check max 10 reviews per URL
        if (validUrlReviews.length > 10) {
          setFieldErrors({ maxReviews: true });
          return;
        }

        // Validate each review content
        urlData.reviews.forEach((content, reviewIndex) => {
          if (!content?.trim()) {
            reviewErrors[reviewIndex] = true;
          }
        });

        // For COMMENT_WITH_PHOTO, validate photos for each review
        if (orderType === "COMMENT_WITH_PHOTO") {
          urlData.reviews.forEach((content, reviewIndex) => {
            if (content?.trim() && (!urlData.photos[reviewIndex] || urlData.photos[reviewIndex].length === 0)) {
              if (!photoErrors[urlIndex]) photoErrors[urlIndex] = {};
              photoErrors[urlIndex][reviewIndex] = true;
            }
          });
        }
      });

      // Check total max 50 reviews across all URLs
      if (totalReviews > 50) {
        setFieldErrors({ maxReviews: true });
        return;
      }

      // Check if at least one review is filled
      if (totalReviews === 0) {
        setFieldErrors({ reviews: { 0: true } });
        return;
      }

      if (Object.keys(reviewErrors).length > 0) {
        setFieldErrors({ reviews: reviewErrors });
        return;
      }

      if (Object.keys(photoErrors).length > 0) {
        setFieldErrors({ photos: photoErrors });
        return;
      }
    }

    if (Object.keys(urlErrors).length > 0) {
      setFieldErrors({ urls: urlErrors });
      return;
    }

    // Check if at least one URL is filled
    const validUrls = urls.filter(u => u.url.trim().length > 0);
    if (validUrls.length === 0) {
      setFieldErrors({ urls: { 0: true } });
      return;
    }

    setSubmitting(true);

    try {
      // For COMMENT orders, use single reaction type and quantity
      // For REVIEW and COMMENT_WITH_PHOTO, use per-URL reviews and photos
      const payload = {
        orderType,
        urls: validUrls.map((u, urlIndex) => {
          const urlData = urlReviews[urlIndex] || { reviews: [""], photos: [] };
          const validUrlReviews = urlData.reviews.filter(r => r.trim().length > 0);
          // Build photos array: each element is an array of photos for that review
          const validUrlPhotos: string[][] = [];
          validUrlReviews.forEach((_, reviewIndex) => {
            const photos = urlData.photos[reviewIndex] || [];
            validUrlPhotos.push(Array.isArray(photos) ? photos : [photos].filter(p => p));
          });

          return {
            url: u.url.trim(),
            quantity: orderType === "COMMENT" ? singleQuantity : validUrlReviews.length,
            reactionType: orderType === "COMMENT" ? singleReactionType : u.reactionType,
            // Include per-URL reviews and photos
            reviewContents: validUrlReviews.length > 0 ? validUrlReviews : undefined,
            photos: orderType === "COMMENT_WITH_PHOTO" ? validUrlPhotos : undefined
          };
        })
      };

      const result = await createMultiUrlReviewOrderAction(payload);

      if (result.success && result.orderId) {
        toastSuccess(t("reviews.orderCreated", "Order created successfully! {{credits}} credits deducted.", { credits: validation?.requiredCredits || 0 }));
        router.push(`/c/services/reviews/orders/${result.orderId}`);
      } else {
        toastError(result.error || t("Failed to create order", "Failed to create order"));
      }
    } catch (err) {
      console.error("❌ [CLIENT] Order creation exception:", err);
      toastError(t("An error occurred while creating the order", "An error occurred while creating the order"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  // Calculate total quantity based on order type
  // COMMENT: singleQuantity × numberOfURLs
  // REVIEW: sum of all valid reviews across all URLs
  // COMMENT_WITH_PHOTO: sum of all valid reviews across all URLs
  const totalReviewsCount = urlReviews.reduce((sum, urlData) => {
    return sum + urlData.reviews.filter(r => r.trim().length > 0).length;
  }, 0);

  const totalQuantity = orderType === "COMMENT"
    ? singleQuantity * urls.length  // For COMMENT: single quantity × URLs
    : totalReviewsCount;  // For REVIEW and COMMENT_WITH_PHOTO: sum of all reviews
  const requiredCredits = (creditPricing[orderType] || 0) * totalQuantity;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <style>{shakeStyle}</style>
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#168BB0] to-[#0F7493] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("reviews.createOrder", "Create New Order")}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Credit Balance Card */}
        {validation && (
          <div className={`bg-white dark:bg-zinc-900 rounded-lg border overflow-hidden shadow-sm ${
            validation.hasEnough
              ? 'border-green-200 dark:border-green-800'
              : 'border-red-200 dark:border-red-800'
          }`}>
            <div className={`flex items-center gap-3 p-3 ${
              validation.hasEnough
                ? 'bg-green-50 dark:bg-green-900/10'
                : 'bg-red-50 dark:bg-red-900/10'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                validation.hasEnough
                  ? 'bg-green-100 dark:bg-green-800'
                  : 'bg-red-100 dark:bg-red-800'
              }`}>
                <CreditCard className={`w-4 h-4 ${validation.hasEnough ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${validation.hasEnough ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {validation.hasEnough ? t("Sufficient Balance", "Sufficient Balance") : t("reviews.insufficientCredits", "Insufficient Balance")}
                </p>
                <p className={`text-xs truncate ${validation.hasEnough ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {t("credits.creditsRequired", "Required: {required} | Your Balance: {balance}", { required: requiredCredits, balance: validation.currentBalance })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("credits.balance", "Balance")}:</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{validation.currentBalance}</p>
              </div>
            </div>
            {!validation.hasEnough && (
              <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <a
                  href="/c/wallet/top-up"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#168BB0]"
                >
                  {t("wallet.topUp", "Top Up")} <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Order Type */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Order Type<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "COMMENT" as OrderType, ...ORDER_TYPE_LABELS.COMMENT, credits: creditPricing.COMMENT },
                { type: "REVIEW" as OrderType, ...ORDER_TYPE_LABELS.REVIEW, credits: creditPricing.REVIEW },
                { type: "COMMENT_WITH_PHOTO" as OrderType, ...ORDER_TYPE_LABELS.COMMENT_WITH_PHOTO, credits: creditPricing.COMMENT_WITH_PHOTO }
              ].map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setOrderType(option.type);
                    // Reset URLs and per-URL reviews when changing order type
                    setUrls([{ url: "", quantity: 1, reactionType: "LIKE" as ReactionType }]);
                    setSingleReactionType("LIKE" as ReactionType);
                    setSingleQuantity(5);
                    setUrlReviews([{ reviews: [""], photos: [[]] }]);
                    setFieldErrors({});
                  }}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    orderType === option.type
                      ? "border-[#168BB0] bg-[#168BB0]/5"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-[#168BB0]/30"
                  }`}
                >
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    orderType === option.type
                      ? "border-[#168BB0] bg-[#168BB0]"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}>
                    {orderType === option.type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{option.label}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{option.description}</div>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{option.credits}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">cr</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-4">
            {/* URLs Section */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#1877F2">🔗</span>
                  URLs
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                {orderType === "COMMENT"
                  ? `Add multiple URLs. Each URL will get ${singleQuantity} ${singleReactionType.toLowerCase()} reaction${singleQuantity !== 1 ? 's' : ''}. Total: ${totalQuantity} reaction${totalQuantity !== 1 ? 's' : ''}`
                  : `Add multiple URLs. Each URL can have its own reviews. Total: ${totalQuantity} review${totalQuantity !== 1 ? 's' : ''}`
                }
                {urls.length > 1 && (
                  <span className="text-[#168BB0] ml-1">({urls.length} URLs)</span>
                )}
              </p>

              {/* Single Reaction Selector - Only for COMMENT type, displayed above URLs */}
              {orderType === "COMMENT" && (
                <div className="mb-4 p-4 border border-[#168BB0]/30 rounded-lg bg-[#168BB0]/5">
                  <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[#1877F2">👍</span>
                      Reaction Type
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                    Select the reaction type. This will be applied to all URLs.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {REACTIONS.map((reaction) => (
                      <button
                        key={reaction.type}
                        type="button"
                        onClick={() => setSingleReactionType(reaction.type)}
                        className={`button-wrapper p-2 rounded-lg border text-center transition-all ${
                          singleReactionType === reaction.type
                            ? 'border-[#168BB0] bg-[#168BB0]/10'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <div className={`text-xl mb-1 ${singleReactionType === reaction.type ? 'emoji-shake-always' : 'emoji-shake-hover'}`}>{reaction.emoji}</div>
                        <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase">{reaction.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Quantity Selector - Only for COMMENT type */}
              {orderType === "COMMENT" ? (
                <div className="mb-4 p-4 border border-[#168BB0]/30 rounded-lg bg-[#168BB0]/5">
                  <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[#168BB0">📊</span>
                      Quantity per URL
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                    How many reactions for EACH URL? This quantity will be applied to all URLs.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={singleQuantity}
                      onChange={(e) => {
                        setSingleQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)));
                        setFieldErrors({ ...fieldErrors, quantity: false });
                      }}
                      className={`w-24 px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-sm text-center font-semibold ${
                        fieldErrors.quantity
                          ? 'border-red-300 dark:border-red-700 focus:border-red-500'
                          : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                      }`}
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      reactions per URL
                    </span>
                  </div>
                  {fieldErrors.quantity && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Quantity must be between 1 and 50</p>
                  )}
                </div>
              ) : null}

              <div className="space-y-3">
                {urls.map((urlData, index) => {
                  const currentUrlReviews = urlReviews[index] || { reviews: [""], photos: [] };
                  return (
                  <div key={index} className={`border border-zinc-200 dark:border-zinc-700 rounded-lg ${(orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") ? 'p-4' : 'p-3'} bg-zinc-50/50 dark:bg-zinc-800/50`}>
                    {/* URL Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#168BB0] text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          URL {index + 1}
                        </span>
                      </div>
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrl(index)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded"
                          title="Remove URL"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* URL Input */}
                    <div className="mb-0">
                      <input
                        type="url"
                        placeholder="https://www.facebook.com/page..."
                        value={urlData.url}
                        onChange={(e) => updateUrl(index, 'url', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-sm ${
                          fieldErrors.urls?.[index]
                            ? 'border-red-300 dark:border-red-700 focus:border-red-500'
                            : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                        }`}
                      />
                      {fieldErrors.urls?.[index] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Valid Facebook URL required</p>
                      )}
                    </div>

                    {/* Reviews Section - For REVIEW and COMMENT_WITH_PHOTO types, shown for ALL URLs */}
                    {(orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") && (
                      <div className="mt-4 space-y-3">
                        {/* Multiple Reviews Input for this URL */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-[#168BB0">✍️</span>
                                Reviews for URL {index + 1}
                              </span>
                            </label>
                            <span className="text-[10px] text-zinc-500">
                              {currentUrlReviews.reviews.filter(r => r.trim()).length}/10
                            </span>
                          </div>
                          {fieldErrors.maxReviews && (
                            <p className="mb-2 text-[10px] text-red-600 dark:text-red-400">Maximum 10 reviews per URL</p>
                          )}
                          <div className="space-y-3">
                            {currentUrlReviews.reviews.map((content, reviewIndex) => (
                              <div key={reviewIndex} className="group relative bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 transition-all hover:border-[#168BB0]/30">
                                {/* Header with index and remove button */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#168BB0] to-[#0F7493] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                      {reviewIndex + 1}
                                    </div>
                                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                      {orderType === "COMMENT_WITH_PHOTO" ? 'Comment' : 'Review'} {reviewIndex + 1}
                                    </span>
                                  </div>
                                  {currentUrlReviews.reviews.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newUrlReviews = [...urlReviews];
                                        const urlReviewsData = [...newUrlReviews[index].reviews];
                                        const urlPhotosData = [...newUrlReviews[index].photos];
                                        const newReviews = urlReviewsData.filter((_, i) => i !== reviewIndex);
                                        const newPhotos = urlPhotosData.filter((_, i) => i !== reviewIndex);
                                        newUrlReviews[index] = { reviews: newReviews.length > 0 ? newReviews : [""], photos: newPhotos.length > 0 ? newPhotos : [] };
                                        setUrlReviews(newUrlReviews);
                                        const newPhotoErrors = { ...fieldErrors.photos };
                                        if (newPhotoErrors[index]) {
                                          delete newPhotoErrors[index][reviewIndex];
                                        }
                                        setFieldErrors({ ...fieldErrors, reviews: { ...fieldErrors.reviews, [reviewIndex]: false }, photos: newPhotoErrors });
                                      }}
                                      className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                                      title="Remove review"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {/* Content and Photo row */}
                                <div className="flex gap-3 items-start">
                                  {/* Review Content */}
                                  <div className="flex-1 min-w-0">
                                    <textarea
                                      rows={2}
                                      maxLength={500}
                                      value={content}
                                      onChange={(e) => {
                                        const newUrlReviews = [...urlReviews];
                                        newUrlReviews[index] = {
                                          ...newUrlReviews[index],
                                          reviews: [...newUrlReviews[index].reviews]
                                        };
                                        newUrlReviews[index].reviews[reviewIndex] = e.target.value;
                                        setUrlReviews(newUrlReviews);
                                        const newPhotoErrors = { ...fieldErrors.photos };
                                        if (newPhotoErrors[index]) {
                                          delete newPhotoErrors[index][reviewIndex];
                                        }
                                        setFieldErrors({ ...fieldErrors, reviews: { ...fieldErrors.reviews, [reviewIndex]: false }, photos: newPhotoErrors, maxReviews: false });
                                      }}
                                      placeholder={`Enter your ${orderType === "COMMENT_WITH_PHOTO" ? 'comment' : 'review'} content...`}
                                      className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 resize-none text-sm leading-relaxed ${
                                        fieldErrors.reviews?.[reviewIndex] || fieldErrors.photos?.[index]?.[reviewIndex]
                                          ? 'border-red-300 dark:border-red-700 focus:border-red-500'
                                          : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0] focus:ring-1 focus:ring-[#168BB0]/10'
                                      }`}
                                      style={{ maxWidth: '400px' }}
                                    />
                                    <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 flex justify-between">
                                      <span>{content.length}/500 characters</span>
                                      {(fieldErrors.reviews?.[reviewIndex] || fieldErrors.photos?.[index]?.[reviewIndex]) && (
                                        <span className="text-red-500 text-[9px]">Required</span>
                                      )}
                                    </p>
                                  </div>

                                  {/* Photo Upload - Only for COMMENT_WITH_PHOTO */}
                                  {orderType === "COMMENT_WITH_PHOTO" && (
                                    <div className="flex-shrink-0">
                                      <PhotoUpload
                                        onPhotosChange={(photos) => {
                                          const newUrlReviews = [...urlReviews];
                                          newUrlReviews[index] = {
                                            ...newUrlReviews[index],
                                            reviews: [...newUrlReviews[index].reviews],
                                            photos: [...newUrlReviews[index].photos]
                                          };
                                          newUrlReviews[index].photos[reviewIndex] = photos;
                                          setUrlReviews(newUrlReviews);
                                          const newPhotoErrors = { ...fieldErrors.photos, [index]: { ...fieldErrors.photos?.[index] } };
                                          delete newPhotoErrors[index][reviewIndex];
                                          setFieldErrors({ ...fieldErrors, photos: newPhotoErrors });
                                        }}
                                        maxPhotos={1}
                                        currentPhotos={currentUrlReviews.photos[reviewIndex] || []}
                                        size="small"
                                      />
                                      {fieldErrors.photos?.[index]?.[reviewIndex] && (
                                        <p className="mt-1 text-[9px] text-red-500 text-center">Photo required</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {currentUrlReviews.reviews.length < 10 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newUrlReviews = [...urlReviews];
                                newUrlReviews[index] = {
                                  ...newUrlReviews[index],
                                  reviews: [...newUrlReviews[index].reviews, ""],
                                  photos: [...newUrlReviews[index].photos, []]
                                };
                                setUrlReviews(newUrlReviews);
                              }}
                              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-[#168BB0] hover:text-[#168BB0] transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              + Add {orderType === "COMMENT_WITH_PHOTO" ? 'another comment' : 'another review'} for URL {index + 1} ({currentUrlReviews.reviews.length}/10)
                            </button>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* Add URL Button */}
              {urls.length < 10 && (
                <button
                  type="button"
                  onClick={addUrl}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-[#168BB0] hover:text-[#168BB0] transition-colors mt-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {urls.length > 0
                    ? `Add Another URL (${urls.length}/10)`
                    : "Add URL"}
                </button>
              )}
            </div>

            {/* Quantity & Cost Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Total Reviews
                </label>
                <div className="bg-[#168BB0]/10 rounded-lg px-3 py-2 border border-[#168BB0]/20">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {orderType === "COMMENT"
                      ? `${urls.length} URL${urls.length !== 1 ? 's' : ''} × ${singleQuantity} ${singleReactionType.toLowerCase()}${singleQuantity !== 1 ? 's' : ''} each`
                      : `Sum of all reviews across ${urls.length} URL${urls.length !== 1 ? 's' : ''}`
                    }
                  </p>
                  <p className="text-lg font-bold text-[#168BB0]">
                    {totalQuantity} <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400"> review{totalQuantity !== 1 ? 's' : ''}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Total Cost
                </label>
                <div className="bg-[#168BB0]/10 rounded-lg px-3 py-2 border border-[#168BB0]/20">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {totalQuantity} × {creditPricing[orderType]}
                  </p>
                  <p className="text-lg font-bold text-[#168BB0]">
                    {requiredCredits} <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">cr</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !validation?.hasEnough}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#168BB0] to-[#0F7493] text-white rounded-lg font-semibold hover:from-[#0F7493] hover:to-[#168BB0] transition-all disabled:opacity-50 disabled:cursor-not-accepted flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Creating...' : (
                <>
                  Create Order
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
